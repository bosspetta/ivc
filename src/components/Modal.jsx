import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import './Modal.scss'

const FOCUSABLE_SELECTOR =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

function Modal({ title, onClose, children }) {
  const { t } = useTranslation()
  const titleId = useId()
  const modalRef = useRef(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const modalNode = modalRef.current
    const focusable = modalNode?.querySelectorAll(FOCUSABLE_SELECTOR)
    ;(focusable?.[0] ?? modalNode)?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !modalNode) return

      const focusableEls = modalNode.querySelectorAll(FOCUSABLE_SELECTOR)
      if (focusableEls.length === 0) return
      const first = focusableEls[0]
      const last = focusableEls[focusableEls.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={modalRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <h3 id={titleId}>{title}</h3>
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
