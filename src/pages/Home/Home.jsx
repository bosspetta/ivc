import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import UserForm from '../../components/UserForm.jsx'
import TestConfigModal from '../../components/TestConfigModal.jsx'
import { getUser } from '../../utils/storage.js'
import './Home.scss'

function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState(null) // null | 'user' | 'config'

  function handleStartClick() {
    setStep(getUser() ? 'config' : 'user')
  }

  function handleUserSaved() {
    setStep('config')
  }

  function handleTestStart(config) {
    setStep(null)
    navigate('/test', { state: config })
  }

  return (
    <section className="home">
      <h2>{t('home.title')}</h2>
      <p>{t('home.subtitle')}</p>
      <button type="button" className="home__cta" onClick={handleStartClick}>
        {t('home.cta')}
      </button>

      {step === 'user' && (
        <UserForm onClose={() => setStep(null)} onSaved={handleUserSaved} />
      )}
      {step === 'config' && (
        <TestConfigModal onClose={() => setStep(null)} onStart={handleTestStart} />
      )}
    </section>
  )
}

export default Home
