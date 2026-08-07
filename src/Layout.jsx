import { useTranslation } from 'react-i18next'
import Header from './components/Header.jsx'

function HeartIcon() {
  return (
    <svg
      className="app-footer__heart-icon"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M10 17.25c-.24 0-.47-.07-.67-.22C5.4 14.06 2.5 11.3 2.5 8.13 2.5 5.7 4.45 3.75 6.88 3.75c1.36 0 2.66.64 3.12 1.65.46-1.01 1.76-1.65 3.12-1.65 2.43 0 4.38 1.95 4.38 4.38 0 3.17-2.9 5.93-6.83 8.9-.2.15-.43.22-.67.22z" />
    </svg>
  )
}

function LightningIcon() {
  return (
    <svg
      className="app-footer__lightning-icon"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M11.983 1.907a.75.75 0 0 0-1.292-.657l-8.5 9.5A.75.75 0 0 0 2.75 12h3.72l-1.947 6.822a.75.75 0 0 0 1.292.657l8.5-9.5a.75.75 0 0 0-.559-1.25h-3.72l1.947-6.822Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function Layout({ children }) {
  const { t } = useTranslation()

  return (
    <div className="app-layout">
      <Header />
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        <a
          className="app-footer__credit"
          href="https://www.linkedin.com/in/enriquerv"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="app-footer__credit-line">
            {t('layout.creditBefore')} <HeartIcon />
          </span>
          <span className="app-footer__credit-line">
            {t('layout.creditTech')} <LightningIcon /> {t('layout.creditAuthor')}
          </span>
        </a>
      </footer>
    </div>
  )
}

export default Layout
