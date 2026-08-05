import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './Header.scss'

function Header() {
  const { t, i18n } = useTranslation()

  return (
    <header className="site-header">
      <NavLink to="/" className="site-header__logo">
        IVC
      </NavLink>
      <nav className="site-header__nav">
        <NavLink
          to="/verbs"
          className={({ isActive }) => (isActive ? 'is-active' : undefined)}
        >
          {t('header.verbs')}
        </NavLink>
        <NavLink
          to="/progress"
          className={({ isActive }) => (isActive ? 'is-active' : undefined)}
        >
          {t('header.progress')}
        </NavLink>
        <div className="site-header__lang">
          <button
            type="button"
            className={i18n.resolvedLanguage === 'es' ? 'is-active' : ''}
            onClick={() => i18n.changeLanguage('es')}
          >
            ES
          </button>
          <button
            type="button"
            className={i18n.resolvedLanguage === 'en' ? 'is-active' : ''}
            onClick={() => i18n.changeLanguage('en')}
          >
            EN
          </button>
        </div>
      </nav>
    </header>
  )
}

export default Header
