import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from './Modal.jsx'
import './TestConfigModal.scss'

const MIN_VERBS = 10
const MAX_VERBS = 100

function TestConfigModal({ onClose, onStart }) {
  const { t } = useTranslation()
  const [verbCount, setVerbCount] = useState(MIN_VERBS)
  const [randomForms, setRandomForms] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    const clamped = Math.min(Math.max(Number(verbCount), MIN_VERBS), MAX_VERBS)
    onStart({ verbCount: clamped, randomForms })
  }

  return (
    <Modal title={t('testConfig.title')} onClose={onClose}>
      <form className="test-config" onSubmit={handleSubmit}>
        <label>
          {t('testConfig.verbCountLabel', { min: MIN_VERBS, max: MAX_VERBS })}
          <input
            type="number"
            min={MIN_VERBS}
            max={MAX_VERBS}
            value={verbCount}
            onChange={(event) => setVerbCount(event.target.value)}
          />
        </label>
        <label className="test-config__checkbox">
          <input
            type="checkbox"
            checked={randomForms}
            onChange={(event) => setRandomForms(event.target.checked)}
          />
          {t('testConfig.randomFormsLabel')}
        </label>
        <button type="submit" className="test-config__submit">
          {t('testConfig.start')}
        </button>
      </form>
    </Modal>
  )
}

export default TestConfigModal
