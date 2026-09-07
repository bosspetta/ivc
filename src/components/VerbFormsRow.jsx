import { useTranslation } from 'react-i18next'
import './VerbFormsRow.scss'

const FORM_FIELDS = ['base', 'pastSimple', 'pastParticiple']

function VerbFormsRow({ base, pastSimple, pastParticiple, highlightedField, translation }) {
  const { i18n } = useTranslation()
  const forms = { base, pastSimple, pastParticiple }
  const isSpanish = i18n.resolvedLanguage === 'es'

  return (
    <span className="verb-forms-row">
      {FORM_FIELDS.map((field, index) => (
        <span key={field}>
          {index > 0 && ' — '}
          {field === highlightedField ? <strong>{forms[field]}</strong> : forms[field]}
        </span>
      ))}
      {isSpanish && translation && ` (${translation})`}
    </span>
  )
}

export default VerbFormsRow
