import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from './Modal.jsx'
import './CrosswordConfigModal.scss'

const MIN_WORDS = 5
const MAX_WORDS = 20
const DEFAULT_WORDS = 10

function CrosswordConfigModal({ onClose, onStart }) {
  const { t } = useTranslation()
  const [wordCount, setWordCount] = useState(DEFAULT_WORDS)

  function handleSubmit(event) {
    event.preventDefault()
    const clamped = Math.min(Math.max(Number(wordCount), MIN_WORDS), MAX_WORDS)
    onStart({ wordCount: clamped })
  }

  return (
    <Modal title={t('crosswordConfig.title')} onClose={onClose}>
      <form className="crossword-config" onSubmit={handleSubmit}>
        <label>
          {t('crosswordConfig.wordCountLabel', { min: MIN_WORDS, max: MAX_WORDS })}
          <input
            type="number"
            min={MIN_WORDS}
            max={MAX_WORDS}
            value={wordCount}
            onChange={(event) => setWordCount(event.target.value)}
          />
        </label>
        <button type="submit" className="crossword-config__submit">
          {t('crosswordConfig.start')}
        </button>
      </form>
    </Modal>
  )
}

export default CrosswordConfigModal
