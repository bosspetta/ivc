import { COMMON_VERBS, VERB_DEFINITIONS, VERB_HINTS } from '../data/verbs.js'
import { shuffle } from './verbAnswers.js'

const VIRTUAL_SIZE = 40
const CENTER = Math.floor(VIRTUAL_SIZE / 2)

const TENSE_FIELDS = [
  { tense: 'base', candidatesKey: 'baseCandidates', sentenceKey: 'example' },
  { tense: 'pastSimple', candidatesKey: 'pastSimpleCandidates', sentenceKey: 'examplePastSimple' },
  { tense: 'pastParticiple', candidatesKey: 'pastParticipleCandidates', sentenceKey: 'examplePresentPerfect' },
]

function buildWordPool() {
  const pool = []
  const seenWords = new Set()
  for (const verb of COMMON_VERBS) {
    const clue = VERB_DEFINITIONS[verb.base]
    if (!clue) continue
    for (const { tense, candidatesKey, sentenceKey } of TENSE_FIELDS) {
      const word = verb[candidatesKey][0].toUpperCase()
      if (seenWords.has(word)) continue
      seenWords.add(word)
      pool.push({
        word,
        clue,
        tense,
        example: verb[sentenceKey],
        hint: VERB_HINTS[verb.base],
        base: verb.base,
        pastSimple: verb.pastSimple,
        pastParticiple: verb.pastParticiple,
        translation: verb.translation,
      })
    }
  }
  return pool
}

function cellKey(row, col) {
  return `${row},${col}`
}

function canPlaceWord(cells, word, row, col, direction) {
  const beforeKey =
    direction === 'across' ? cellKey(row, col - 1) : cellKey(row - 1, col)
  const afterKey =
    direction === 'across'
      ? cellKey(row, col + word.length)
      : cellKey(row + word.length, col)
  if (cells.has(beforeKey) || cells.has(afterKey)) return false

  for (let i = 0; i < word.length; i += 1) {
    const r = direction === 'across' ? row : row + i
    const c = direction === 'across' ? col + i : col
    const existing = cells.get(cellKey(r, c))

    if (existing) {
      if (existing.letter !== word[i]) return false
      if (direction === 'across' && existing.across) return false
      if (direction === 'down' && existing.down) return false
    } else if (direction === 'across') {
      if (cells.has(cellKey(r - 1, c)) || cells.has(cellKey(r + 1, c))) return false
    } else {
      if (cells.has(cellKey(r, c - 1)) || cells.has(cellKey(r, c + 1))) return false
    }
  }
  return true
}

function placeWord(cells, word, row, col, direction) {
  for (let i = 0; i < word.length; i += 1) {
    const r = direction === 'across' ? row : row + i
    const c = direction === 'across' ? col + i : col
    const key = cellKey(r, c)
    const existing = cells.get(key) || { letter: word[i], across: false, down: false }
    existing.letter = word[i]
    if (direction === 'across') existing.across = true
    else existing.down = true
    cells.set(key, existing)
  }
}

function countOverlaps(cells, word, row, col, direction) {
  let overlaps = 0
  for (let i = 0; i < word.length; i += 1) {
    const r = direction === 'across' ? row : row + i
    const c = direction === 'across' ? col + i : col
    if (cells.has(cellKey(r, c))) overlaps += 1
  }
  return overlaps
}

function exceedsMaxCols(bounds, word, candidate, maxCols) {
  const candMinCol = candidate.col
  const candMaxCol = candidate.direction === 'across' ? candidate.col + word.length - 1 : candidate.col
  const minCol = Math.min(bounds.minCol, candMinCol)
  const maxCol = Math.max(bounds.maxCol, candMaxCol)
  return maxCol - minCol + 1 > maxCols
}

function findBestPlacement(cells, word, bounds, maxCols) {
  let best = null
  for (const [key, cell] of cells) {
    const [cellRow, cellCol] = key.split(',').map(Number)
    for (let j = 0; j < word.length; j += 1) {
      if (word[j] !== cell.letter) continue

      const candidates = [
        { row: cellRow, col: cellCol - j, direction: 'across' },
        { row: cellRow - j, col: cellCol, direction: 'down' },
      ]
      for (const candidate of candidates) {
        if (!canPlaceWord(cells, word, candidate.row, candidate.col, candidate.direction)) continue
        if (maxCols && exceedsMaxCols(bounds, word, candidate, maxCols)) continue
        const overlaps = countOverlaps(cells, word, candidate.row, candidate.col, candidate.direction)
        if (!best || overlaps > best.overlaps) {
          best = { ...candidate, overlaps }
        }
      }
    }
  }
  return best
}

const MAX_ATTEMPTS = 30

// Palabras prioritarias (verbos flojos del usuario) para la fase 1: para cada
// verbo, la entrada de su forma más floja o, si esa palabra no está en el
// banco (p. ej. formas idénticas como cut/cut/cut), cualquiera de ese verbo.
function resolvePriorityEntries(pool, priorityWords) {
  return priorityWords
    .map(
      ({ base, tense }) =>
        pool.find((entry) => entry.base === base && entry.tense === tense) ??
        pool.find((entry) => entry.base === base),
    )
    .filter(Boolean)
}

function attemptGeneration(wordCount, maxCols, priorityWords, priorityCount) {
  const shuffled = shuffle(buildWordPool())
  const cells = new Map()
  const placements = []
  const usedBases = new Set()

  // La palabra ancla se elige entre las más largas del banco (a menos de
  // 3 letras de la más larga disponible): ofrece más letras para cruzar y
  // reduce el riesgo de que la cuadrícula quede bloqueada sin salida. Se
  // sortea entre varias candidatas (no siempre la única más larga) para
  // que no sea siempre el mismo verbo el que abra todos los crucigramas.
  // El resto se prueba en orden aleatorio (sin priorizar longitud) para
  // que verbos de todas las longitudes tengan las mismas opciones de
  // aparecer, en vez de que el crucigrama lo dominen siempre los mismos
  // verbos con formas largas.
  const maxLen = shuffled.reduce((max, entry) => Math.max(max, entry.word.length), 0)
  const anchorIndex = shuffled.findIndex((entry) => entry.word.length >= maxLen - 2)
  const first = shuffled[anchorIndex]
  const rest = shuffled.filter((_, i) => i !== anchorIndex)

  // Si la primera palabra (la más larga del banco) no cabe en el ancho
  // máximo, se coloca en vertical para no comprometer el límite desde el inicio.
  const firstDirection = maxCols && first.word.length > maxCols ? 'down' : 'across'
  const firstRow = firstDirection === 'across' ? CENTER : CENTER - Math.floor(first.word.length / 2)
  const firstCol = firstDirection === 'across' ? CENTER - Math.floor(first.word.length / 2) : CENTER
  placeWord(cells, first.word, firstRow, firstCol, firstDirection)
  placements.push({ ...first, row: firstRow, col: firstCol, direction: firstDirection })
  usedBases.add(first.base)

  let minCol = firstCol
  let maxCol = firstDirection === 'across' ? firstCol + first.word.length - 1 : firstCol

  function tryPlace(candidate) {
    // Nunca dos acepciones del mismo verbo en el mismo crucigrama.
    if (usedBases.has(candidate.base)) return false
    const placement = findBestPlacement(cells, candidate.word, { minCol, maxCol }, maxCols)
    if (!placement) return false
    placeWord(cells, candidate.word, placement.row, placement.col, placement.direction)
    placements.push({ ...candidate, row: placement.row, col: placement.col, direction: placement.direction })
    usedBases.add(candidate.base)
    const candMinCol = placement.col
    const candMaxCol =
      placement.direction === 'across' ? placement.col + candidate.word.length - 1 : placement.col
    minCol = Math.min(minCol, candMinCol)
    maxCol = Math.max(maxCol, candMaxCol)
    return true
  }

  // Fase 1: se intentan primero los verbos flojos del usuario, hasta cubrir
  // su cuota. No se puede garantizar que todos encajen en la cuadrícula: es
  // una preferencia, no una garantía.
  const priorityBases = new Set(priorityWords.map(({ base }) => base))
  let priorityPlaced = priorityBases.has(first.base) ? 1 : 0
  for (const candidate of resolvePriorityEntries(rest, priorityWords)) {
    if (priorityPlaced >= priorityCount || placements.length >= wordCount) break
    if (tryPlace(candidate)) priorityPlaced += 1
  }

  // Fase 2: el resto, en orden aleatorio.
  for (let i = 0; i < rest.length && placements.length < wordCount; i += 1) {
    tryPlace(rest[i])
  }

  return { cells, placements }
}

// priorityWords: [{ base, tense }] en orden de preferencia; se intentan colocar
// antes que el resto hasta un máximo de priorityCount palabras.
export function generateCrossword(wordCount, { maxCols, priorityWords = [], priorityCount = 0 } = {}) {
  let best = attemptGeneration(wordCount, maxCols, priorityWords, priorityCount)
  for (let attempt = 1; attempt < MAX_ATTEMPTS && best.placements.length < wordCount; attempt += 1) {
    const next = attemptGeneration(wordCount, maxCols, priorityWords, priorityCount)
    if (next.placements.length > best.placements.length) best = next
  }
  const { cells, placements } = best

  let minRow = Infinity
  let minCol = Infinity
  let maxRow = -Infinity
  let maxCol = -Infinity
  for (const key of cells.keys()) {
    const [r, c] = key.split(',').map(Number)
    if (r < minRow) minRow = r
    if (r > maxRow) maxRow = r
    if (c < minCol) minCol = c
    if (c > maxCol) maxCol = c
  }

  const rows = maxRow - minRow + 1
  const cols = maxCol - minCol + 1

  const shiftedPlacements = placements.map((placement) => ({
    ...placement,
    row: placement.row - minRow,
    col: placement.col - minCol,
    length: placement.word.length,
  }))

  const acrossStarts = new Map()
  const downStarts = new Map()
  for (const placement of shiftedPlacements) {
    const key = cellKey(placement.row, placement.col)
    if (placement.direction === 'across') acrossStarts.set(key, placement)
    else downStarts.set(key, placement)
  }

  const grid = Array.from({ length: rows }, () => new Array(cols).fill(null))
  for (const [key, cell] of cells) {
    const [r, c] = key.split(',').map(Number)
    grid[r - minRow][c - minCol] = { letter: cell.letter, number: null }
  }

  const words = []
  let nextNumber = 1
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const key = cellKey(r, c)
      const across = acrossStarts.get(key)
      const down = downStarts.get(key)
      if (!across && !down) continue

      const number = nextNumber
      nextNumber += 1
      grid[r][c].number = number
      if (across) words.push({ ...across, number })
      if (down) words.push({ ...down, number })
    }
  }

  return { rows, cols, grid, words }
}
