import { useTranslation } from 'react-i18next'
import './Help.scss'

const OS_KEYS = ['windows', 'macos', 'linux', 'ios', 'android']

function Help() {
  const { t } = useTranslation()

  return (
    <section className="help-page">
      <h2>{t('help.title')}</h2>

      <div className="help-page__block">
        <h3>{t('help.voices.title')}</h3>
        <p>{t('help.voices.intro')}</p>
        <p>{t('help.voices.outro')}</p>

        <div className="help-page__os-grid">
          {OS_KEYS.map((osKey) => (
            <div key={osKey} className="help-page__os">
              <h4>{t(`help.voices.${osKey}.title`)}</h4>
              <ol>
                {t(`help.voices.${osKey}.steps`, { returnObjects: true }).map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Help
