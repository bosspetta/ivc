import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import UserForm from '../../components/UserForm.jsx'
import TestConfigModal from '../../components/TestConfigModal.jsx'
import FillGapsConfigModal from '../../components/FillGapsConfigModal.jsx'
import CrosswordConfigModal from '../../components/CrosswordConfigModal.jsx'
import { getUser } from '../../utils/storage.js'
import './Home.scss'

function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(() => getUser())
  const [step, setStep] = useState(() => {
    // null | 'user' | 'config' | 'fill-gaps-config' | 'crossword-config'
    const openConfig = location.state?.openConfig
    if (openConfig === 'test') return user ? 'config' : 'user'
    if (openConfig === 'fillGaps') return 'fill-gaps-config'
    if (openConfig === 'crossword') return 'crossword-config'
    return null
  })

  function handleStartClick() {
    setStep(user ? 'config' : 'user')
  }

  function handleFillGapsClick() {
    setStep('fill-gaps-config')
  }

  function handleCrosswordClick() {
    setStep('crossword-config')
  }

  function handleUserSaved(savedUser) {
    setUser(savedUser)
    setStep('config')
  }

  function handleTestStart(config) {
    setStep(null)
    navigate('/test', { state: config })
  }

  function handleFillGapsStart(config) {
    setStep(null)
    navigate('/fill-gaps', { state: config })
  }

  function handleCrosswordStart(config) {
    setStep(null)
    navigate('/crossword', { state: config })
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
      {user && (
        <p className="home__greeting">
          {t('home.greeting', { firstName: user.firstName })}
        </p>
      )}

      <div className="home__grid">
        <div className="home__card">
          <h2 className="home__card-title">{t('home.card.title')}</h2>
          <p className="home__card-description">{t('home.card.description')}</p>
          <button type="button" className="home__cta" onClick={handleStartClick}>
            {t('home.cta')}
          </button>
        </div>

        <div className="home__card">
          <h2 className="home__card-title">{t('home.fillGapsCard.title')}</h2>
          <p className="home__card-description">{t('home.fillGapsCard.description')}</p>
          <button type="button" className="home__cta" onClick={handleFillGapsClick}>
            {t('home.cta')}
          </button>
        </div>

        <div className="home__card">
          <h2 className="home__card-title">{t('home.crosswordCard.title')}</h2>
          <p className="home__card-description">{t('home.crosswordCard.description')}</p>
          <button type="button" className="home__cta" onClick={handleCrosswordClick}>
            {t('home.cta')}
          </button>
        </div>
      </div>

      {step === 'user' && (
        <UserForm onClose={() => setStep(null)} onSaved={handleUserSaved} />
      )}
      {step === 'config' && (
        <TestConfigModal onClose={() => setStep(null)} onStart={handleTestStart} />
      )}
      {step === 'fill-gaps-config' && (
        <FillGapsConfigModal onClose={() => setStep(null)} onStart={handleFillGapsStart} />
      )}
      {step === 'crossword-config' && (
        <CrosswordConfigModal onClose={() => setStep(null)} onStart={handleCrosswordStart} />
      )}
    </section>
  )
}

export default Home
