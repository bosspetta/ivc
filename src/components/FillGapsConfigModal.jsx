import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from './Modal.jsx'
import './FillGapsConfigModal.scss'

const MIN_SENTENCES = 5
const MAX_SENTENCES = 100

function FillGapsConfigModal({ onClose, onStart }) {
  const { t } = useTranslation()
  const [sentenceCount, setSentenceCount] = useState(MIN_SENTENCES)

  function handleSubmit(event) {
    event.preventDefault()
    const clamped = Math.min(Math.max(Number(sentenceCount), MIN_SENTENCES), MAX_SENTENCES)
    onStart({ sentenceCount: clamped })
  }

  return (
    <Modal title={t('fillGapsConfig.title')} onClose={onClose}>
      <form className="fill-gaps-config" onSubmit={handleSubmit}>
        <label>
          {t('fillGapsConfig.sentenceCountLabel', { min: MIN_SENTENCES, max: MAX_SENTENCES })}
          <input
            type="number"
            min={MIN_SENTENCES}
            max={MAX_SENTENCES}
            value={sentenceCount}
            onChange={(event) => setSentenceCount(event.target.value)}
          />
        </label>
        <button type="submit" className="fill-gaps-config__submit">
          {t('fillGapsConfig.start')}
        </button>
      </form>
    </Modal>
  )
}

export default FillGapsConfigModal
