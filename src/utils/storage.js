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

export function addProgressEntry({ correctCount, totalCount, type = 'test' }) {
  const entries = getProgress()
  const entry = {
    date: new Date().toISOString(),
    type,
    correctCount,
    totalCount,
    percentage: Math.round((correctCount / totalCount) * 100),
  }
  entries.push(entry)
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(entries))
  return entry
}
