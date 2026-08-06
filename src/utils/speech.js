export const SPEECH_LANG = { uk: 'en-GB', us: 'en-US' }

// Voces de alta calidad descargadas manualmente en macOS (Ajustes → Accesibilidad →
// Contenido hablado). macOS no siempre expone su nivel de calidad en el nombre, así
// que se listan explícitamente para priorizarlas sobre las voces remotas de Google.
const PREFERRED_VOICE_NAMES = ['Serena', 'Zoe']

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
  if (PREFERRED_VOICE_NAMES.includes(voice.name)) return 4
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
