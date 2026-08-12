function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function findVerbFormMatch(sentence, candidates) {
  for (const candidate of candidates) {
    const match = sentence.match(new RegExp(`\\b${escapeRegExp(candidate)}\\b`, 'i'))
    if (match) {
      return { index: match.index, text: match[0] }
    }
  }
  return null
}
