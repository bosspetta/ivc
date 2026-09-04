import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { generateCrossword } from '../../utils/crossword.js'
import { addProgressEntry } from '../../utils/storage.js'
import { getResultTitleKey } from '../../utils/resultTitle.js'
import CrosswordConfigModal from '../../components/CrosswordConfigModal.jsx'
import useIsMobile from '../../hooks/useIsMobile.js'
import './Crossword.scss'

// En móvil, limita el ancho de la cuadrícula (en columnas) para que quepa
// sin desbordar la pantalla; en desktop no hay restricción.
const MOBILE_MAX_COLS = 10

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

function evaluateGrid(userGrid, puzzle) {
  const cellStatus = puzzle.grid.map((row) => row.map(() => null))
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
    if (wordCorrect) correctWords += 1
  }
  return { correctWords, cellStatus }
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
  return ''
}

function Crossword() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const initialConfig = location.state
  const isMobile = useIsMobile()
  const inputRefs = useRef(new Map())

  const [config, setConfig] = useState(initialConfig)
  const [puzzle, setPuzzle] = useState(() =>
    initialConfig
      ? generateCrossword(initialConfig.wordCount, {
          maxCols: isMobile ? MOBILE_MAX_COLS : undefined,
        })
      : null,
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
  const [pendingResult, setPendingResult] = useState(null)

  const cellWords = useMemo(() => (puzzle ? buildCellWords(puzzle) : new Map()), [puzzle])

  useEffect(() => {
    if (!puzzle) return
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (selected) inputRefs.current.get(`${selected.row},${selected.col}`)?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle])

  function focusCell(row, col) {
    inputRefs.current.get(`${row},${col}`)?.focus()
  }

  function scrollToGridIfMobile() {
    if (isMobile) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startChallenge(newConfig) {
    const newPuzzle = generateCrossword(newConfig.wordCount, {
      maxCols: isMobile ? MOBILE_MAX_COLS : undefined,
    })
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
    setPendingResult(null)
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
    clearCellStatusAt(row, col)
    setIncomplete(null)

    if (nextChar && selected) {
      const word = cellWords.get(`${row},${col}`)?.[selected.direction]
      if (word) {
        const index = wordIndex(word, row, col)
        if (index < word.length - 1) {
          const nextRow = word.direction === 'across' ? row : row + 1
          const nextCol = word.direction === 'across' ? col + 1 : col
          moveSelection(nextRow, nextCol, selected.direction)
        }
      }
    }

    checkFullCompletion(nextGrid)
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
          setUserGrid((prev) => {
            const next = prev.map((r) => [...r])
            next[prevRow][prevCol] = ''
            return next
          })
          clearCellStatusAt(prevRow, prevCol)
          moveSelection(prevRow, prevCol, selected.direction)
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

  function finishChallenge(score, total) {
    addProgressEntry({ correctCount: score, totalCount: total, type: 'crossword' })
    setResult({ score, total })
    setFinished(true)
  }

  function checkFullCompletion(grid) {
    const { correctWords } = evaluateGrid(grid, puzzle)
    if (correctWords === puzzle.words.length) {
      finishChallenge(correctWords, puzzle.words.length)
      return true
    }
    return false
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
      for (const update of updates) next[update.row][update.col] = update.status
      return next
    })
    setIncomplete(
      wordCorrect ? null : { correct: correctCount, remaining: word.length - correctCount },
    )
    checkFullCompletion(userGrid)
  }

  function handleReveal() {
    scrollToGridIfMobile()
    const { correctWords, cellStatus: preRevealStatus } = evaluateGrid(userGrid, puzzle)
    const solvedGrid = puzzle.grid.map((row) => row.map((cell) => (cell ? cell.letter : null)))
    const revealStatus = puzzle.grid.map((row, r) =>
      row.map((cell, c) => {
        if (!cell) return null
        return preRevealStatus[r][c] === 'correct' ? 'correct' : 'revealed'
      }),
    )
    setUserGrid(solvedGrid)
    setCellStatus(revealStatus)
    setIncomplete(null)
    setPendingResult({ score: correctWords, total: puzzle.words.length })
    setRevealed(true)
  }

  function handleContinueAfterReveal() {
    finishChallenge(pendingResult.score, pendingResult.total)
  }

  if (finished) {
    const percentage = Math.round((result.score / result.total) * 100)
    return (
      <section className="crossword crossword--finished">
        <h2>{t(getResultTitleKey(percentage))}</h2>
        <p className="crossword__result">
          {t('crossword.result', { score: result.score, total: result.total, percentage })}
        </p>
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
    )
  }

  const acrossClues = puzzle.words.filter((word) => word.direction === 'across')
  const downClues = puzzle.words.filter((word) => word.direction === 'down')

  return (
    <section className="crossword">
      <h2 className="crossword__title">{t('crossword.title')}</h2>

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
                      disabled={revealed}
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
              {acrossClues.map((word) => (
                <li key={`across-${word.number}`}>
                  <button
                    type="button"
                    className={
                      selected?.direction === 'across' && cellWords.get(`${selected.row},${selected.col}`)?.across === word
                        ? 'is-active'
                        : ''
                    }
                    onClick={() => handleClueClick(word)}
                  >
                    <strong>{word.number}.</strong>{' '}
                    <span className="crossword__clue-tense">
                      ({t(`verbList.columns.${word.tense}`)})
                    </span>{' '}
                    {word.clue}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="crossword__clue-group">
            <h3>{t('crossword.down')}</h3>
            <ul>
              {downClues.map((word) => (
                <li key={`down-${word.number}`}>
                  <button
                    type="button"
                    className={
                      selected?.direction === 'down' && cellWords.get(`${selected.row},${selected.col}`)?.down === word
                        ? 'is-active'
                        : ''
                    }
                    onClick={() => handleClueClick(word)}
                  >
                    <strong>{word.number}.</strong>{' '}
                    <span className="crossword__clue-tense">
                      ({t(`verbList.columns.${word.tense}`)})
                    </span>{' '}
                    {word.clue}
                  </button>
                </li>
              ))}
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
        {!revealed && (
          <button type="button" onClick={handleCheck}>
            {t('crossword.check')}
          </button>
        )}
        <button
          type="button"
          className="crossword__help-btn"
          onClick={handleReveal}
          disabled={revealed}
        >
          {t('crossword.reveal')}
        </button>
        {revealed && (
          <button type="button" onClick={handleContinueAfterReveal}>
            {t('crossword.seeResult')}
          </button>
        )}
      </div>
    </section>
  )
}

export default Crossword
