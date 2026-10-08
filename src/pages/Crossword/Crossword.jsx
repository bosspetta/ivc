import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { generateCrossword } from '../../utils/crossword.js'
import { addProgressEntry, getVerbStats, recordVerbResults } from '../../utils/storage.js'
import { rankWeakVerbs, weakTargetCount } from '../../utils/weakVerbs.js'
import { COMMON_VERBS } from '../../data/verbs.js'
import { getResultTitleKey } from '../../utils/resultTitle.js'
import CrosswordConfigModal from '../../components/CrosswordConfigModal.jsx'
import PronunciationToggle from '../../components/PronunciationToggle.jsx'
import VerbFormsRow from '../../components/VerbFormsRow.jsx'
import RelatedChallenges from '../../components/RelatedChallenges.jsx'
import useIsMobile from '../../hooks/useIsMobile.js'
import './Crossword.scss'

// En móvil, limita el ancho de la cuadrícula (en columnas) para que quepa
// sin desbordar la pantalla; en desktop no hay restricción.
const MOBILE_MAX_COLS = 10

const MAX_HINTS_PER_WORD = 2

function buildEmptyGrid(puzzle) {
  return puzzle.grid.map((row) => row.map((cell) => (cell ? '' : null)))
}

function buildCellWords(puzzle) {
  const map = new Map()
  for (const word of puzzle.words) {
    for (let i = 0; i < word.length; i += 1) {
      const r = word.direction === 'across' ? word.row : word.row + i
      const c = word.direction === 'across' ? word.col + i : word.col
      const key = `${r},${c}`
      const entry = map.get(key) || {}
      entry[word.direction] = word
      map.set(key, entry)
    }
  }
  return map
}

function getWordKey(word) {
  return `${word.direction}-${word.number}`
}

function evaluateGrid(userGrid, puzzle) {
  const cellStatus = puzzle.grid.map((row) => row.map(() => null))
  const correctWordKeys = new Set()
  let correctWords = 0
  for (const word of puzzle.words) {
    let wordCorrect = true
    for (let i = 0; i < word.length; i += 1) {
      const r = word.direction === 'across' ? word.row : word.row + i
      const c = word.direction === 'across' ? word.col + i : word.col
      const value = userGrid[r][c]
      const solutionLetter = puzzle.grid[r][c].letter
      if (!value) {
        wordCorrect = false
        continue
      }
      const isCorrect = value === solutionLetter
      if (!isCorrect) wordCorrect = false
      cellStatus[r][c] = isCorrect ? 'correct' : 'incorrect'
    }
    if (wordCorrect) {
      correctWords += 1
      correctWordKeys.add(getWordKey(word))
    }
  }
  return { correctWords, cellStatus, correctWordKeys }
}

// Una palabra a la que el usuario se ha rendido no debe contar como acertada
// aunque sus casillas ya contengan la letra correcta (se rellenan al rendirse).
function evaluateGridExcludingGivenUp(userGrid, puzzle, givenUpWords) {
  const { correctWords, cellStatus, correctWordKeys } = evaluateGrid(userGrid, puzzle)
  if (givenUpWords.size === 0) return { correctWords, cellStatus, correctWordKeys }
  let effectiveCorrectWords = correctWords
  const effectiveKeys = new Set(correctWordKeys)
  for (const key of givenUpWords) {
    if (effectiveKeys.delete(key)) effectiveCorrectWords -= 1
  }
  return { correctWords: effectiveCorrectWords, cellStatus, correctWordKeys: effectiveKeys }
}

function evaluateWord(userGrid, puzzle, word) {
  let wordCorrect = true
  let correctCount = 0
  const updates = []
  for (let i = 0; i < word.length; i += 1) {
    const r = word.direction === 'across' ? word.row : word.row + i
    const c = word.direction === 'across' ? word.col + i : word.col
    const value = userGrid[r][c]
    const solutionLetter = puzzle.grid[r][c].letter
    if (!value) {
      wordCorrect = false
      continue
    }
    const isCorrect = value === solutionLetter
    if (isCorrect) correctCount += 1
    else wordCorrect = false
    updates.push({ row: r, col: c, status: isCorrect ? 'correct' : 'incorrect' })
  }
  return { wordCorrect, updates, correctCount }
}

function wordIndex(word, row, col) {
  return word.direction === 'across' ? col - word.col : row - word.row
}

function statusClassName(status) {
  if (status === 'correct') return 'is-correct'
  if (status === 'incorrect') return 'is-incorrect'
  if (status === 'revealed') return 'is-revealed'
  if (status === 'hint') return 'is-hint'
  return ''
}

// En cuanto una palabra queda completa y correcta (sin necesidad de pulsar
// "Comprobar"), coloreamos sus casillas en verde automáticamente. Las
// casillas de pista mantienen su aspecto gris.
function applyAutoCorrectStatus(userGrid, prevStatus, puzzle, givenUpWords) {
  const { correctWordKeys } = evaluateGridExcludingGivenUp(userGrid, puzzle, givenUpWords)
  const base = prevStatus || puzzle.grid.map((row) => row.map(() => null))
  const next = base.map((r) => [...r])
  for (const word of puzzle.words) {
    if (!correctWordKeys.has(getWordKey(word))) continue
    for (let i = 0; i < word.length; i += 1) {
      const r = word.direction === 'across' ? word.row : word.row + i
      const c = word.direction === 'across' ? word.col + i : word.col
      if (next[r][c] === 'hint') continue
      next[r][c] = 'correct'
    }
  }
  return next
}

// Cada pista usada en una palabra resta, proporcionalmente, una letra de su
// valor máximo (1 punto). Una palabra de 6 letras con 1 pista vale 5/6.
// Las palabras a las que el usuario se rinde valen 0.
function computeWeightedScore(correctWordKeys, puzzle, hintsUsedByWord) {
  let sum = 0
  for (const word of puzzle.words) {
    const key = getWordKey(word)
    if (!correctWordKeys.has(key)) continue
    const hints = hintsUsedByWord[key] || 0
    sum += (word.length - hints) / word.length
  }
  return sum
}

function buildWordSummaries(puzzle, correctWordKeys, hintsUsedByWord, givenUpWords) {
  return puzzle.words.map((word) => {
    const key = getWordKey(word)
    const givenUp = givenUpWords.has(key)
    const correct = !givenUp && correctWordKeys.has(key)
    const hints = hintsUsedByWord[key] || 0
    const percentage = correct ? ((word.length - hints) / word.length) * 100 : 0
    return {
      base: word.base,
      pastSimple: word.pastSimple,
      pastParticiple: word.pastParticiple,
      translation: word.translation,
      highlightedField: word.tense,
      hints,
      correct,
      givenUp,
      percentage,
    }
  })
}

function buildPuzzle(wordCount, isMobile) {
  const priorityWords = rankWeakVerbs(COMMON_VERBS, getVerbStats()).map(({ verb, weakestTense }) => ({
    base: verb.base,
    tense: weakestTense,
  }))
  return generateCrossword(wordCount, {
    maxCols: isMobile ? MOBILE_MAX_COLS : undefined,
    priorityWords,
    priorityCount: weakTargetCount(wordCount),
  })
}

function crosswordSummaryText(t, entry) {
  if (entry.givenUp) return t('crossword.summary.givenUp')
  if (!entry.correct) return t('crossword.summary.revealed')
  if (entry.hints === 0) return t('crossword.summary.correctNoHint')
  return t('crossword.summary.correctWithHint', { count: entry.hints })
}

function Crossword() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const initialConfig = location.state
  const isMobile = useIsMobile()
  const inputRefs = useRef(new Map())
  const titleRef = useRef(null)

  const [config, setConfig] = useState(initialConfig)
  const [puzzle, setPuzzle] = useState(() =>
    initialConfig ? buildPuzzle(initialConfig.wordCount, isMobile) : null,
  )
  const [userGrid, setUserGrid] = useState(() => (puzzle ? buildEmptyGrid(puzzle) : null))
  const [selected, setSelected] = useState(() =>
    puzzle?.words[0] ? { row: puzzle.words[0].row, col: puzzle.words[0].col, direction: puzzle.words[0].direction } : null,
  )
  const [cellStatus, setCellStatus] = useState(null)
  const [incomplete, setIncomplete] = useState(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [finished, setFinished] = useState(false)
  const [result, setResult] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [pendingResult, setPendingResult] = useState(null)
  const [revealedCorrectWords, setRevealedCorrectWords] = useState(null)
  const [hintsUsedByWord, setHintsUsedByWord] = useState({})
  const [givenUpWords, setGivenUpWords] = useState(() => new Set())
  const [wordSummaries, setWordSummaries] = useState([])

  const cellWords = useMemo(() => (puzzle ? buildCellWords(puzzle) : new Map()), [puzzle])
  const solvedWordKeys = useMemo(
    () => (puzzle ? evaluateGrid(userGrid, puzzle).correctWordKeys : new Set()),
    [userGrid, puzzle],
  )

  useEffect(() => {
    if (!puzzle) return
    if (isMobile) {
      scrollToGridIfMobile()
      return
    }
    if (selected) inputRefs.current.get(`${selected.row},${selected.col}`)?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle])

  function focusCell(row, col) {
    inputRefs.current.get(`${row},${col}`)?.focus()
  }

  function scrollToGridIfMobile() {
    if (!isMobile) return
    // El teclado virtual del modal de configuración puede seguir abierto y
    // desplazar el viewport; quitamos el foco antes de subir para evitarlo.
    document.activeElement?.blur()
    titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function startChallenge(newConfig) {
    const newPuzzle = buildPuzzle(newConfig.wordCount, isMobile)
    setConfig(newConfig)
    setPuzzle(newPuzzle)
    setUserGrid(buildEmptyGrid(newPuzzle))
    setSelected(
      newPuzzle.words[0]
        ? { row: newPuzzle.words[0].row, col: newPuzzle.words[0].col, direction: newPuzzle.words[0].direction }
        : null,
    )
    setCellStatus(null)
    setIncomplete(null)
    setShowConfigModal(false)
    setFinished(false)
    setResult(null)
    setRevealed(false)
    setCompleted(false)
    setPendingResult(null)
    setRevealedCorrectWords(null)
    setHintsUsedByWord({})
    setGivenUpWords(new Set())
    setWordSummaries([])
  }

  if (!config || !puzzle) {
    return (
      <section className="crossword">
        <p>{t('crossword.noConfig')}</p>
        <button type="button" onClick={() => navigate('/')}>
          {t('crossword.backHome')}
        </button>
      </section>
    )
  }

  function moveSelection(row, col, direction) {
    const key = `${row},${col}`
    if (!cellWords.has(key)) return
    setSelected({ row, col, direction })
    focusCell(row, col)
  }

  function handleCellClick(row, col) {
    const entry = cellWords.get(`${row},${col}`)
    if (!entry) return
    let direction = entry.across ? 'across' : 'down'
    if (selected && selected.row === row && selected.col === col) {
      if (selected.direction === 'across' && entry.down) direction = 'down'
      else if (selected.direction === 'down' && entry.across) direction = 'across'
      else direction = selected.direction
    } else if (selected && entry[selected.direction]) {
      direction = selected.direction
    }
    setSelected({ row, col, direction })
    focusCell(row, col)
  }

  function clearCellStatusAt(row, col) {
    setCellStatus((prev) => {
      if (!prev) return prev
      const next = prev.map((r) => [...r])
      next[row][col] = null
      return next
    })
  }

  function handleCellInput(event, row, col) {
    const raw = event.target.value.toUpperCase().replace(/[^A-Z]/g, '')
    const nextChar = raw.slice(-1) || ''
    const nextGrid = userGrid.map((r) => [...r])
    nextGrid[row][col] = nextChar
    setUserGrid(nextGrid)
    setIncomplete(null)

    setCellStatus((prev) => {
      const base = prev || puzzle.grid.map((r) => r.map(() => null))
      const cleared = base.map((r) => [...r])
      cleared[row][col] = null
      return applyAutoCorrectStatus(nextGrid, cleared, puzzle, givenUpWords)
    })

    if (nextChar && selected) {
      const word = cellWords.get(`${row},${col}`)?.[selected.direction]
      if (word) {
        const index = wordIndex(word, row, col)
        if (index < word.length - 1) {
          const nextRow = word.direction === 'across' ? row : row + 1
          const nextCol = word.direction === 'across' ? col + 1 : col
          if (cellStatus?.[nextRow]?.[nextCol] !== 'hint') {
            moveSelection(nextRow, nextCol, selected.direction)
          }
        }
      }
    }

    checkOverallCompletion(nextGrid)
  }

  function handleCellKeyDown(event, row, col) {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleCheck()
      return
    }

    if (event.key === 'Backspace' && !userGrid[row][col] && selected) {
      const word = cellWords.get(`${row},${col}`)?.[selected.direction]
      if (word) {
        const index = wordIndex(word, row, col)
        if (index > 0) {
          const prevRow = word.direction === 'across' ? row : row - 1
          const prevCol = word.direction === 'across' ? col - 1 : col
          event.preventDefault()
          if (cellStatus?.[prevRow]?.[prevCol] !== 'hint') {
            setUserGrid((prev) => {
              const next = prev.map((r) => [...r])
              next[prevRow][prevCol] = ''
              return next
            })
            clearCellStatusAt(prevRow, prevCol)
            moveSelection(prevRow, prevCol, selected.direction)
          }
        }
      }
      return
    }

    const arrowMap = {
      ArrowRight: { dRow: 0, dCol: 1, direction: 'across' },
      ArrowLeft: { dRow: 0, dCol: -1, direction: 'across' },
      ArrowDown: { dRow: 1, dCol: 0, direction: 'down' },
      ArrowUp: { dRow: -1, dCol: 0, direction: 'down' },
    }
    const move = arrowMap[event.key]
    if (!move) return
    event.preventDefault()
    const nextRow = row + move.dRow
    const nextCol = col + move.dCol
    if (!cellWords.has(`${nextRow},${nextCol}`)) return
    if (cellStatus?.[nextRow]?.[nextCol] === 'hint') return
    moveSelection(nextRow, nextCol, move.direction)
  }

  function handleClueClick(word) {
    let target = { row: word.row, col: word.col }
    for (let i = 0; i < word.length; i += 1) {
      const r = word.direction === 'across' ? word.row : word.row + i
      const c = word.direction === 'across' ? word.col + i : word.col
      if (!userGrid[r][c]) {
        target = { row: r, col: c }
        break
      }
    }
    setSelected({ row: target.row, col: target.col, direction: word.direction })
    focusCell(target.row, target.col)
  }

  function getClueStatus(word) {
    const key = getWordKey(word)
    if (revealed) return revealedCorrectWords?.has(key) ? 'correct' : 'revealed'
    if (givenUpWords.has(key)) return 'revealed'
    return solvedWordKeys.has(key) ? 'correct' : null
  }

  function getHintsUsed(word) {
    return hintsUsedByWord[getWordKey(word)] || 0
  }

  function handleHint(word) {
    const key = getWordKey(word)
    const used = getHintsUsed(word)
    if (used >= MAX_HINTS_PER_WORD) return

    if (used === 0) {
      // Primera pista: solo un texto de ayuda, sin tocar la cuadrícula.
      setHintsUsedByWord((prev) => ({ ...prev, [key]: used + 1 }))
      return
    }

    let target = null
    for (let i = 0; i < word.length; i += 1) {
      const r = word.direction === 'across' ? word.row : word.row + i
      const c = word.direction === 'across' ? word.col + i : word.col
      if (userGrid[r][c] !== puzzle.grid[r][c].letter) {
        target = { row: r, col: c, letter: puzzle.grid[r][c].letter }
        break
      }
    }
    if (!target) return

    const nextGrid = userGrid.map((r) => [...r])
    nextGrid[target.row][target.col] = target.letter
    setUserGrid(nextGrid)
    setCellStatus((prev) => {
      const base = prev || puzzle.grid.map((row) => row.map(() => null))
      const withHint = base.map((r) => [...r])
      withHint[target.row][target.col] = 'hint'
      return applyAutoCorrectStatus(nextGrid, withHint, puzzle, givenUpWords)
    })
    const nextHints = { ...hintsUsedByWord, [key]: used + 1 }
    setHintsUsedByWord(nextHints)
    setIncomplete(null)
    checkOverallCompletion(nextGrid, nextHints)
  }

  function handleGiveUpWord(word) {
    const key = getWordKey(word)
    if (givenUpWords.has(key)) return

    const nextGrid = userGrid.map((r) => [...r])
    for (let i = 0; i < word.length; i += 1) {
      const r = word.direction === 'across' ? word.row : word.row + i
      const c = word.direction === 'across' ? word.col + i : word.col
      nextGrid[r][c] = puzzle.grid[r][c].letter
    }
    setUserGrid(nextGrid)
    setCellStatus((prev) => {
      const base = prev || puzzle.grid.map((row) => row.map(() => null))
      const next = base.map((r) => [...r])
      for (let i = 0; i < word.length; i += 1) {
        const r = word.direction === 'across' ? word.row : word.row + i
        const c = word.direction === 'across' ? word.col + i : word.col
        next[r][c] = 'revealed'
      }
      return next
    })

    const nextGivenUp = new Set(givenUpWords)
    nextGivenUp.add(key)
    setGivenUpWords(nextGivenUp)
    setIncomplete(null)
    checkOverallCompletion(nextGrid, hintsUsedByWord, nextGivenUp)
  }

  function finishChallenge(score, total, percentage, summaries) {
    addProgressEntry({ correctCount: score, totalCount: total, type: 'crossword', percentage })
    recordVerbResults(
      summaries.map((entry) => ({
        base: entry.base,
        tense: entry.highlightedField,
        percentage: entry.percentage,
      })),
    )
    setResult({ score, total, percentage })
    setWordSummaries(summaries)
    setFinished(true)
  }

  // Una palabra queda resuelta cuando está correcta o cuando el usuario se
  // ha rendido con ella. En cuanto todas lo están, el reto queda "completado"
  // y se espera a que el usuario pulse "Ver resultado" para pasar al resumen.
  function checkOverallCompletion(grid, hintsMap = hintsUsedByWord, givenUp = givenUpWords) {
    const { correctWords, correctWordKeys } = evaluateGridExcludingGivenUp(grid, puzzle, givenUp)
    const allDone = puzzle.words.every((word) => {
      const key = getWordKey(word)
      return correctWordKeys.has(key) || givenUp.has(key)
    })
    if (!allDone) return false

    const weighted = computeWeightedScore(correctWordKeys, puzzle, hintsMap)
    const percentage = Math.round((weighted / puzzle.words.length) * 100)
    const summaries = buildWordSummaries(puzzle, correctWordKeys, hintsMap, givenUp)
    setPendingResult({ score: correctWords, total: puzzle.words.length, percentage })
    setWordSummaries(summaries)
    setCompleted(true)
    return true
  }

  function handleCheck() {
    if (!selected) return
    const word = cellWords.get(`${selected.row},${selected.col}`)?.[selected.direction]
    if (!word) return

    scrollToGridIfMobile()
    const { wordCorrect, updates, correctCount } = evaluateWord(userGrid, puzzle, word)
    setCellStatus((prev) => {
      const base = prev || puzzle.grid.map((row) => row.map(() => null))
      const next = base.map((r) => [...r])
      // Las casillas de pista mantienen su aspecto gris aunque se compruebe la palabra.
      for (const update of updates) {
        if (next[update.row][update.col] === 'hint') continue
        next[update.row][update.col] = update.status
      }
      return next
    })
    setIncomplete(
      wordCorrect ? null : { correct: correctCount, remaining: word.length - correctCount },
    )
    checkOverallCompletion(userGrid)
  }

  function handleReveal() {
    scrollToGridIfMobile()
    const { correctWords, cellStatus: preRevealStatus, correctWordKeys } = evaluateGridExcludingGivenUp(
      userGrid,
      puzzle,
      givenUpWords,
    )
    const weighted = computeWeightedScore(correctWordKeys, puzzle, hintsUsedByWord)
    const percentage = Math.round((weighted / puzzle.words.length) * 100)
    const solvedGrid = puzzle.grid.map((row) => row.map((cell) => (cell ? cell.letter : null)))
    const revealStatus = puzzle.grid.map((row, r) =>
      row.map((cell, c) => {
        if (!cell) return null
        return preRevealStatus[r][c] === 'correct' ? 'correct' : 'revealed'
      }),
    )
    setUserGrid(solvedGrid)
    setCellStatus(revealStatus)
    setRevealedCorrectWords(correctWordKeys)
    setIncomplete(null)
    setPendingResult({ score: correctWords, total: puzzle.words.length, percentage })
    setWordSummaries(buildWordSummaries(puzzle, correctWordKeys, hintsUsedByWord, givenUpWords))
    setRevealed(true)
  }

  function handleSeeResult() {
    finishChallenge(pendingResult.score, pendingResult.total, pendingResult.percentage, wordSummaries)
  }

  if (finished) {
    return (
      <>
        <section className="crossword crossword--finished">
          <h2>{t(getResultTitleKey(result.percentage))}</h2>
          <p className="crossword__result">
            {t('crossword.result', {
              score: result.score,
              total: result.total,
              percentage: result.percentage,
            })}
          </p>

          <div className="crossword__summary">
            <h3>{t('crossword.summary.title')}</h3>
            <ol className="crossword__summary-list">
              {wordSummaries.map((entry, index) => (
                <li key={index}>
                  <VerbFormsRow
                    base={entry.base}
                    pastSimple={entry.pastSimple}
                    pastParticiple={entry.pastParticiple}
                    highlightedField={entry.highlightedField}
                    translation={entry.translation}
                  />
                  <br />
                  {crosswordSummaryText(t, entry)}{' '}
                  <span className="crossword__summary-percentage">
                    ({Math.round(entry.percentage)}%)
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="crossword__finished-actions">
            <button type="button" className="crossword__back-btn" onClick={() => navigate('/')}>
              {t('crossword.backHome')}
            </button>
            <button
              type="button"
              className="crossword__back-btn"
              onClick={() => setShowConfigModal(true)}
            >
              {t('crossword.repeat')}
            </button>
            <button type="button" className="crossword__back-btn" onClick={() => navigate('/progress')}>
              {t('crossword.seeProgress')}
            </button>
          </div>

          {showConfigModal && (
            <CrosswordConfigModal onClose={() => setShowConfigModal(false)} onStart={startChallenge} />
          )}
        </section>
        <RelatedChallenges exclude="crossword" />
      </>
    )
  }

  const acrossClues = puzzle.words.filter((word) => word.direction === 'across')
  const downClues = puzzle.words.filter((word) => word.direction === 'down')

  return (
    <section className="crossword">
      <h2 className="crossword__title" ref={titleRef}>
        {t('crossword.title')}
      </h2>

      <div className="crossword__board">
        <div className="crossword__grid-wrapper">
          <div
            className="crossword__grid"
            style={{
              gridTemplateColumns: `repeat(${puzzle.cols}, var(--crossword-cell-size))`,
              gridTemplateRows: `repeat(${puzzle.rows}, var(--crossword-cell-size))`,
            }}
          >
            {puzzle.grid.map((rowCells, row) =>
              rowCells.map((cell, col) => {
                if (!cell) return null
                const status = cellStatus?.[row]?.[col]
                const isSelected = selected?.row === row && selected?.col === col
                return (
                  <div
                    key={`${row},${col}`}
                    className="crossword__cell"
                    style={{
                      gridRow: row + 1,
                      gridColumn: col + 1,
                      // Solapa 1px sobre la celda anterior para fusionar bordes
                      // adyacentes (1px + 1px) en una única línea de 1px.
                      marginTop: row > 0 ? -1 : 0,
                      marginLeft: col > 0 ? -1 : 0,
                    }}
                  >
                    {cell.number && <span className="crossword__cell-number">{cell.number}</span>}
                    <input
                      ref={(el) => {
                        const key = `${row},${col}`
                        if (el) inputRefs.current.set(key, el)
                        else inputRefs.current.delete(key)
                      }}
                      type="text"
                      inputMode="text"
                      maxLength={1}
                      value={userGrid[row][col] || ''}
                      disabled={revealed || finished || status === 'hint' || status === 'revealed'}
                      onChange={(event) => handleCellInput(event, row, col)}
                      onKeyDown={(event) => handleCellKeyDown(event, row, col)}
                      onClick={() => handleCellClick(row, col)}
                      onFocus={() => handleCellClick(row, col)}
                      className={(isSelected ? 'is-selected ' : '') + statusClassName(status)}
                      aria-label={t('crossword.cellLabel', { row: row + 1, col: col + 1 })}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                    />
                  </div>
                )
              }),
            )}
          </div>
        </div>

        <div className="crossword__clues">
          <div className="crossword__clue-group">
            <h3>{t('crossword.across')}</h3>
            <ul>
              {acrossClues.map((word) => {
                const status = getClueStatus(word)
                const isActive =
                  !status &&
                  selected?.direction === 'across' &&
                  cellWords.get(`${selected.row},${selected.col}`)?.across === word
                const hintsUsed = getHintsUsed(word)
                const hintsRemaining = MAX_HINTS_PER_WORD - hintsUsed
                return (
                  <li key={`across-${word.number}`} className="crossword__clue-item">
                    <div className="crossword__clue-row">
                      <button
                        type="button"
                        disabled={!!status}
                        className={
                          status === 'correct' ? 'is-solved' : status === 'revealed' ? 'is-revealed-clue' : isActive ? 'is-active' : ''
                        }
                        onClick={() => handleClueClick(word)}
                      >
                        <strong>{word.number}.</strong>{' '}
                        <span className="crossword__clue-tense">
                          ({t(`verbList.columns.${word.tense}`)})
                        </span>{' '}
                        {word.clue}
                      </button>
                      <div className="crossword__clue-buttons">
                        <button
                          type="button"
                          className="crossword__hint-btn"
                          disabled={!!status || hintsRemaining <= 0}
                          onClick={() => handleHint(word)}
                        >
                          {t('crossword.hint', { count: hintsRemaining })}
                        </button>
                        <button
                          type="button"
                          className="crossword__giveup-btn"
                          disabled={!!status || hintsRemaining > 0}
                          onClick={() => handleGiveUpWord(word)}
                        >
                          {t('crossword.giveUp')}
                        </button>
                      </div>
                    </div>
                    {hintsUsed >= 1 && (
                      <p className="crossword__clue-hint">
                        {t('crossword.hintText', { hint: word.hint })}
                      </p>
                    )}
                    {status && (
                      <p className="crossword__clue-forms">
                        <VerbFormsRow
                          base={word.base}
                          pastSimple={word.pastSimple}
                          pastParticiple={word.pastParticiple}
                          highlightedField={word.tense}
                          translation={word.translation}
                        />
                      </p>
                    )}
                    {status && word.example && (
                      <p className="crossword__clue-example">
                        {word.example}
                        <PronunciationToggle text={word.example} alwaysOpen />
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="crossword__clue-group">
            <h3>{t('crossword.down')}</h3>
            <ul>
              {downClues.map((word) => {
                const status = getClueStatus(word)
                const isActive =
                  !status &&
                  selected?.direction === 'down' &&
                  cellWords.get(`${selected.row},${selected.col}`)?.down === word
                const hintsUsed = getHintsUsed(word)
                const hintsRemaining = MAX_HINTS_PER_WORD - hintsUsed
                return (
                <li key={`down-${word.number}`} className="crossword__clue-item">
                  <div className="crossword__clue-row">
                    <button
                      type="button"
                      disabled={!!status}
                      className={
                        status === 'correct' ? 'is-solved' : status === 'revealed' ? 'is-revealed-clue' : isActive ? 'is-active' : ''
                      }
                      onClick={() => handleClueClick(word)}
                    >
                      <strong>{word.number}.</strong>{' '}
                      <span className="crossword__clue-tense">
                        ({t(`verbList.columns.${word.tense}`)})
                      </span>{' '}
                      {word.clue}
                    </button>
                    <div className="crossword__clue-buttons">
                      <button
                        type="button"
                        className="crossword__hint-btn"
                        disabled={!!status || hintsRemaining <= 0}
                        onClick={() => handleHint(word)}
                      >
                        {t('crossword.hint', { count: hintsRemaining })}
                      </button>
                      <button
                        type="button"
                        className="crossword__giveup-btn"
                        disabled={!!status || hintsRemaining > 0}
                        onClick={() => handleGiveUpWord(word)}
                      >
                        {t('crossword.giveUp')}
                      </button>
                    </div>
                  </div>
                  {hintsUsed >= 1 && (
                    <p className="crossword__clue-hint">
                      {t('crossword.hintText', { hint: word.hint })}
                    </p>
                  )}
                  {status && (
                    <p className="crossword__clue-forms">
                      <VerbFormsRow
                        base={word.base}
                        pastSimple={word.pastSimple}
                        pastParticiple={word.pastParticiple}
                        highlightedField={word.tense}
                        translation={word.translation}
                      />
                    </p>
                  )}
                  {status && word.example && (
                    <p className="crossword__clue-example">
                      {word.example}
                      <PronunciationToggle text={word.example} alwaysOpen />
                    </p>
                  )}
                </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      {incomplete && (
        <p className="crossword__incomplete">
          {t('crossword.incomplete', {
            correct: incomplete.correct,
            remaining: incomplete.remaining,
          })}
        </p>
      )}

      {revealed && pendingResult && (
        <p className="crossword__reveal-summary">
          {t('crossword.revealSummary', {
            correct: pendingResult.score,
            failed: pendingResult.total - pendingResult.score,
          })}
        </p>
      )}

      <div className="crossword__actions">
        <button type="button" onClick={handleCheck} disabled={revealed || completed}>
          {t('crossword.check')}
        </button>
        <button
          type="button"
          className="crossword__help-btn"
          onClick={handleReveal}
          disabled={revealed || completed}
        >
          {t('crossword.reveal')}
        </button>
        {(revealed || completed) && (
          <button type="button" onClick={handleSeeResult}>
            {t('crossword.seeResult')}
          </button>
        )}
      </div>
    </section>
  )
}

export default Crossword
