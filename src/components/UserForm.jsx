import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from './Modal.jsx'
import { saveUser } from '../utils/storage.js'
import './UserForm.scss'

function UserForm({ onClose, onSaved }) {
  const { t } = useTranslation()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!firstName.trim() || !lastName.trim()) return
    const user = saveUser({ firstName: firstName.trim(), lastName: lastName.trim() })
    onSaved(user)
  }

  return (
    <Modal title={t('userForm.title')} onClose={onClose}>
      <p className="user-form__intro">{t('userForm.intro')}</p>
      <form className="user-form" onSubmit={handleSubmit}>
        <label>
          {t('userForm.firstName')}
          <input
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />
        </label>
        <label>
          {t('userForm.lastName')}
          <input
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
        </label>
        <button type="submit" className="user-form__submit">
          {t('userForm.continue')}
        </button>
      </form>
    </Modal>
  )
}

export default UserForm
