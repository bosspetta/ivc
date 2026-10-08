// 'was/were' -> ['was', 'were'] ; 'born(e)' -> ['born', 'borne']
function acceptedAnswers(raw) {
  return raw.split('/').flatMap((part) => {
    const trimmed = part.trim()
    const optionalE = trimmed.match(/^(.+)\(e\)$/)
    if (optionalE) {
      return [optionalE[1], `${optionalE[1]}e`]
    }
    return [trimmed]
  })
}

export function isAnswerCorrect(userInput, correctValue) {
  const normalizedInput = userInput.trim().toLowerCase()
  return acceptedAnswers(correctValue).some(
    (accepted) => accepted.toLowerCase() === normalizedInput,
  )
}

export function isGapAnswerCorrect(userInput, answer) {
  return userInput.trim().toLowerCase() === answer.trim().toLowerCase()
}

// `exclude` permite no dar como pista la forma que el usuario más falla,
// para que tenga que escribirla.
export function pickRandomForm(exclude = null) {
  const forms = ['base', 'pastSimple', 'pastParticiple'].filter((form) => form !== exclude)
  return forms[Math.floor(Math.random() * forms.length)]
}

export function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
