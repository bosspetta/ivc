import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { applyTheme, getStoredTheme } from '../utils/theme.js'
import Logo from './Logo.jsx'
import './Header.scss'

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="4" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.6 4.4l-1.4 1.4M5.8 14.2l-1.4 1.4M15.6 15.6l-1.4-1.4M5.8 5.8L4.4 4.4" />
      </g>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M17 11.5A7 7 0 1 1 8.5 3a5.5 5.5 0 0 0 8.5 8.5z" fill="currentColor" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7.6 7.6a2.4 2.4 0 1 1 3.4 2.18c-.6.3-1 .7-1 1.32v.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="14.2" r="0.9" fill="currentColor" />
    </svg>
  )
}

function Header() {
  const { t, i18n } = useTranslation()
  const [theme, setTheme] = useState(getStoredTheme)

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <NavLink to="/" className="site-header__logo" aria-label={t('header.siteName')}>
          <Logo className="site-header__logo-icon" />
        </NavLink>
        <nav className="site-header__nav">
          <span className="site-header__nav__links">
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
          </span>
          <span className="site-header__nav__actions">
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
            <NavLink
              to="/help"
              className={({ isActive }) =>
                isActive ? 'site-header__icon-btn is-active' : 'site-header__icon-btn'
              }
            >
              <HelpIcon />
              <span className="site-header__icon-btn__label">{t('header.help')}</span>
            </NavLink>
            <button
              type="button"
              className="site-header__icon-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </span>
        </nav>
      </div>
    </header>
  )
}

export default Header
