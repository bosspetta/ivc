import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './VerbFormsTable.scss'

const FIELDS = ['base', 'pastSimple', 'pastParticiple']

function TenseHeaderCell({ full, abbr }) {
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const abbrRef = useRef(null)

  useEffect(() => {
    if (!tooltipOpen) return

    function handleClickOutside(event) {
      if (abbrRef.current && !abbrRef.current.contains(event.target)) {
        setTooltipOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [tooltipOpen])

  return (
    <th>
      <span className="verb-forms-table__header">
        <span className="verb-forms-table__header-full">{full}</span>
        <span className="verb-forms-table__header-abbr" ref={abbrRef}>
          <button
            type="button"
            aria-expanded={tooltipOpen}
            onClick={() => setTooltipOpen((prev) => !prev)}
          >
            {abbr}
          </button>
          {tooltipOpen && (
            <span className="verb-forms-table__tooltip" role="tooltip">
              {full}
            </span>
          )}
        </span>
      </span>
    </th>
  )
}

function VerbFormsTable({ forms, testedTense }) {
  const { t } = useTranslation()

  return (
    <div className="verb-forms-table">
      <span className="verb-forms-table__label">{t('fillGaps.fullConjugationPrefix')}</span>
      <table>
        <thead>
          <tr>
            {FIELDS.map((tense) => (
              <TenseHeaderCell
                key={tense}
                full={t(`verbList.columns.${tense}`)}
                abbr={t(`fillGaps.abbr.${tense}`)}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {FIELDS.map((tense) => (
              <td key={tense}>
                <span
                  className={
                    tense === testedTense
                      ? 'verb-forms-table__form is-tested'
                      : 'verb-forms-table__form'
                  }
                >
                  {forms[tense]}
                </span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default VerbFormsTable
