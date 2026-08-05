import { useTranslation } from 'react-i18next'
import Header from './components/Header.jsx'

function Layout({ children }) {
  const { t } = useTranslation()

  return (
    <div className="app-layout">
      <Header />
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        <p>{t('layout.footer')}</p>
      </footer>
    </div>
  )
}

export default Layout
