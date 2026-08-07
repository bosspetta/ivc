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
      <h1 className="home__title">
        <span className="home__title__label">{t('home.titleLabel')}</span>{' '}
        <span className="home__title__label home__title__label--site-name">
          {t('home.titleSiteName')}
        </span>
      </h1>
      <p className="home__subtitle">{t('home.subtitle')}</p>

      <div className="home__card">
        <h2 className="home__card-title">{t('home.card.title')}</h2>
        <p className="home__card-description">{t('home.card.description')}</p>
        <button type="button" className="home__cta" onClick={handleStartClick}>
          {t('home.cta')}
        </button>
      </div>

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
