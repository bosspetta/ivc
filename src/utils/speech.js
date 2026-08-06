export const SPEECH_LANG = { uk: 'en-GB', us: 'en-US' }

let voicesPromise = null

function cleanForSpeech(text) {
  return text
    .replace(/\(([a-z]+)\)/gi, '$1')
    .split('/')[0]
    .trim()
}

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function loadVoices() {
  const existing = window.speechSynthesis.getVoices()
  if (existing.length > 0) return Promise.resolve(existing)

  if (!voicesPromise) {
    voicesPromise = new Promise((resolve) => {
      window.speechSynthesis.addEventListener(
        'voiceschanged',
        () => resolve(window.speechSynthesis.getVoices()),
        { once: true },
      )
    })
  }
  return voicesPromise
}

function scoreVoice(voice) {
  if (/enhanced|premium|neural/i.test(voice.name)) return 3
  if (/google/i.test(voice.name)) return 2
  return 1
}

function pickBestVoice(voices, lang) {
  const exactMatch = voices.filter((voice) => voice.lang === lang)
  const candidates =
    exactMatch.length > 0
      ? exactMatch
      : voices.filter((voice) => voice.lang?.startsWith(lang.slice(0, 2)))

  if (candidates.length === 0) return null
  return candidates.reduce((best, voice) => (scoreVoice(voice) > scoreVoice(best) ? voice : best))
}

export async function speak(text, lang, rate = 1) {
  if (!canSpeak()) return
  window.speechSynthesis.cancel()

  const voices = await loadVoices()
  const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text))
  utterance.lang = lang
  utterance.rate = rate
  const voice = pickBestVoice(voices, lang)
  if (voice) utterance.voice = voice

  window.speechSynthesis.speak(utterance)
}
