import { useTranslation } from 'react-i18next'
import './Modal.scss'

function Modal({ title, onClose, children }) {
  const { t } = useTranslation()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h3>{title}</h3>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label={t('modal.close')}
          >
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  )
}

export default Modal
