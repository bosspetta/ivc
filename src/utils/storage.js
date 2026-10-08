const USER_KEY = 'ivc_user'
const PROGRESS_KEY = 'ivc_progress'

export function getUser() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveUser({ firstName, lastName }) {
  const user = { firstName, lastName, createdAt: new Date().toISOString() }
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return user
}

export function getProgress() {
  const raw = localStorage.getItem(PROGRESS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function averagePercentage(entries) {
  if (entries.length === 0) return null
  const total = entries.reduce((sum, entry) => sum + entry.percentage, 0)
  return Math.round(total / entries.length)
}

export function getAverageForType(type) {
  return averagePercentage(getProgress().filter((entry) => (entry.type ?? 'test') === type))
}

export function addProgressEntry({ correctCount, totalCount, type = 'test', percentage }) {
  const entries = getProgress()
  const entry = {
    date: new Date().toISOString(),
    type,
    correctCount,
    totalCount,
    percentage: percentage ?? Math.round((correctCount / totalCount) * 100),
  }
  entries.push(entry)
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(entries))
  return entry
}

// Dominio por verbo y forma verbal: { [base]: { [tense]: { mastery, seen, lastSeen } } }.
// `mastery` va de 0 a 1 y es una media móvil exponencial de los resultados,
// de modo que los aciertos recientes pesan más que los fallos antiguos y un
// verbo deja de considerarse "flojo" cuando el usuario mejora.
const VERB_STATS_KEY = 'ivc_verb_stats'
const MASTERY_NEW_WEIGHT = 0.4

export function getVerbStats() {
  const raw = localStorage.getItem(VERB_STATS_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) ?? {}
  } catch {
    return {}
  }
}

// results: [{ base, tense, percentage }], con percentage entre 0 y 100.
export function recordVerbResults(results) {
  const stats = getVerbStats()
  const now = new Date().toISOString()
  for (const { base, tense, percentage } of results) {
    const score = Math.min(Math.max(percentage, 0), 100) / 100
    const verbStats = (stats[base] ??= {})
    const previous = verbStats[tense]
    verbStats[tense] = {
      mastery: previous
        ? previous.mastery * (1 - MASTERY_NEW_WEIGHT) + score * MASTERY_NEW_WEIGHT
        : score,
      seen: (previous?.seen ?? 0) + 1,
      lastSeen: now,
    }
  }
  localStorage.setItem(VERB_STATS_KEY, JSON.stringify(stats))
}
