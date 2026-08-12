import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { SPEECH_LANG, canSpeak, speak } from '../utils/speech.js'
import './PronunciationToggle.scss'

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 8v4h3.5L11 15.5v-11L6.5 8H3z"
        fill="currentColor"
      />
      <path
        d="M13.5 7c1 0.8 1 5.2 0 6M15.5 5c2 1.8 2 8.2 0 10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PronunciationToggle({ text, id, openId, onOpen, onClose, alwaysOpen = false, rate = 0.8 }) {
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const isOpen = alwaysOpen || openId === id

  useEffect(() => {
    if (alwaysOpen || !isOpen) return

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, alwaysOpen, onClose])

  if (!canSpeak()) return null

  return (
    <span className="pronunciation" ref={containerRef}>
      {alwaysOpen ? (
        <span className="pronunciation__icon" aria-hidden="true">
          <SpeakerIcon />
        </span>
      ) : (
        <button
          type="button"
          className="pronunciation__toggle"
          aria-label={t('pronunciation.toggle')}
          aria-expanded={isOpen}
          onClick={() => (isOpen ? onClose() : onOpen(id))}
        >
          <SpeakerIcon />
        </button>
      )}
      {isOpen && (
        <span className="pronunciation__options">
          <button
            type="button"
            onClick={() => speak(text, SPEECH_LANG.uk, rate)}
            aria-label={t('pronunciation.uk')}
          >
            UK
          </button>
          <span className="pronunciation__options-separator" aria-hidden="true">
            /
          </span>
          <button
            type="button"
            onClick={() => speak(text, SPEECH_LANG.us, rate)}
            aria-label={t('pronunciation.us')}
          >
            US
          </button>
        </span>
      )}
    </span>
  )
}

export default PronunciationToggle
