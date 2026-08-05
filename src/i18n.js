import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './translations/es.json'
import en from './translations/en.json'

const STORAGE_KEY = 'ivc_language'
const storedLanguage = localStorage.getItem(STORAGE_KEY)

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: storedLanguage || 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (language) => {
  localStorage.setItem(STORAGE_KEY, language)
})

export default i18n
