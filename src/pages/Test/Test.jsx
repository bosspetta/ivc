import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { COMMON_VERBS, getSpokenForm } from '../../data/verbs.js'
import { addProgressEntry, getVerbStats, recordVerbResults } from '../../utils/storage.js'
import { isAnswerCorrect, pickRandomForm } from '../../utils/verbAnswers.js'
import { getResultTitleKey } from '../../utils/resultTitle.js'
import { pickRoundVerbs } from '../../utils/weakVerbs.js'
import PronunciationToggle from '../../components/PronunciationToggle.jsx'
import TestConfigModal from '../../components/TestConfigModal.jsx'
import VerbFormsTable from '../../components/VerbFormsTable.jsx'
import VerbFormsRow from '../../components/VerbFormsRow.jsx'
import RelatedChallenges from '../../components/RelatedChallenges.jsx'
import useIsMobile from '../../hooks/useIsMobile.js'
import './Test.scss'

const EMPTY_ANSWERS = { base: '', pastSimple: '', pastParticiple: '' }
const EMPTY_FIELD_FIRST_CORRECT = { base: null, pastSimple: null, pastParticiple: null }
const FIELDS = ['base', 'pastSimple', 'pastParticiple']
const HELP_ATTEMPTS = 3

function buildQuestions(verbCount, randomForms) {
  const selected = pickRoundVerbs(COMMON_VERBS, verbCount, getVerbStats())
  return selected.map(({ verb, weakestTense }) => ({
    verb,
    hintForm: randomForms ? pickRandomForm(weakestTense) : 'base',
  }))
}

// Cada intento de más resta un 10% al valor de la pregunta (100% a la
// primera, 90% a la segunda, 80% a la tercera...).
function attemptCredit(attemptNumber) {
  return Math.max(100 - 10 * (attemptNumber - 1), 0)
}

// Agrupa los 3 campos según en qué intento se acertaron por primera vez
// (o 'never' si nunca se acertaron), en orden cronológico.
function buildFieldGroups(fieldFirstCorrect) {
  const groups = new Map()
  for (const field of FIELDS) {
    const key = fieldFirstCorrect[field] ?? 'never'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(field)
  }
  const orderedKeys = [...groups.keys()].sort((a, b) => {
    if (a === 'never') return 1
    if (b === 'never') return -1
    return a - b
  })
  return orderedKeys.map((key) => ({ attempt: key, fields: groups.get(key) }))
}

// Resultado por forma verbal para el registro de verbos flojos. La forma
// dada como pista no cuenta: el usuario solo la copia.
function buildVerbResults(questionSummaries) {
  return questionSummaries.flatMap((entry) =>
    FIELDS.filter((field) => field !== entry.highlightedField).map((field) => ({
      base: entry.base,
      tense: field,
      percentage:
        entry.fieldFirstCorrect[field] != null ? attemptCredit(entry.fieldFirstCorrect[field]) : 0,
    })),
  )
}

function getOrdinal(t, attempt) {
  if (attempt <= 6) return t(`test.summary.ordinal.${attempt}`)
  return t('test.summary.ordinal.other', { n: attempt })
}

function buildQuestionNarrative(t, fieldFirstCorrect) {
  const groups = buildFieldGroups(fieldFirstCorrect)
  const solvedGroups = groups.filter((group) => group.attempt !== 'never')
  const neverGroup = groups.find((group) => group.attempt === 'never')

  const clauses = solvedGroups.map((group, index) => {
    const ordinal = getOrdinal(t, group.attempt)
    const prefix = index === 0 ? 'first' : 'later'
    if (group.fields.length === 3) {
      return t(`test.summary.${prefix}ClauseAll`, { ordinal })
    }
    if (group.fields.length === 2) {
      const [field1, field2] = group.fields
      return t(`test.summary.${prefix}ClauseTwo`, {
        ordinal,
        field1: t(`test.summary.field.${field1}`),
        field2: t(`test.summary.field.${field2}`),
      })
    }
    return t(`test.summary.${prefix}ClauseOne`, {
      ordinal,
      field: t(`test.summary.field.${group.fields[0]}`),
    })
  })

  if (neverGroup) {
    if (neverGroup.fields.length === 3) {
      clauses.push(t('test.summary.neverThree'))
    } else if (neverGroup.fields.length === 2) {
      const [field1, field2] = neverGroup.fields
      clauses.push(
        t('test.summary.neverTwo', {
          field1: t(`test.summary.field.${field1}`),
          field2: t(`test.summary.field.${field2}`),
        }),
      )
    } else {
      clauses.push(
        t('test.summary.neverOne', { field: t(`test.summary.field.${neverGroup.fields[0]}`) }),
      )
    }
  }

  return clauses.join(' ')
}

function StatusIcon({ correct }) {
  return correct ? (
    <svg
      className="test__input-icon test__input-icon--correct"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 10.5L8.5 14L15 6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg
      className="test__input-icon test__input-icon--incorrect"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 6L14 14M14 6L6 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightVerb(sentence, verbBase) {
  const pattern = new RegExp(`\\b(${escapeRegExp(verbBase)})\\b`, 'i')
  return sentence
    .split(pattern)
    .map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : part))
}

function VerbInfo({ verb, isSpanish }) {
  return (
    <p className="test__verb-info">
      {isSpanish && <strong>{verb.translation} — </strong>}
      <em>{highlightVerb(verb.example, verb.base)}</em>
      <PronunciationToggle text={verb.example} alwaysOpen />
    </p>
  )
}

function Test() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const initialConfig = location.state

  const [config, setConfig] = useState(initialConfig)
  const [questions, setQuestions] = useState(() =>
    initialConfig ? buildQuestions(initialConfig.verbCount, initialConfig.randomForms) : [],
  )
  const [showConfigModal, setShowConfigModal] = useState(false)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState(EMPTY_ANSWERS)
  const [feedback, setFeedback] = useState(null)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [fieldFirstCorrect, setFieldFirstCorrect] = useState(EMPTY_FIELD_FIRST_CORRECT)
  const [helped, setHelped] = useState(false)
  const [score, setScore] = useState(0)
  const [questionSummaries, setQuestionSummaries] = useState([])
  const [finalPercentage, setFinalPercentage] = useState(0)
  const [finished, setFinished] = useState(false)
  const firstInputRef = useRef(null)
  const nextButtonRef = useRef(null)
  const isMobile = useIsMobile()

  function startChallenge(newConfig) {
    setConfig(newConfig)
    setQuestions(buildQuestions(newConfig.verbCount, newConfig.randomForms))
    setCurrentIndex(0)
    setAnswers(EMPTY_ANSWERS)
    setFeedback(null)
    setWrongAttempts(0)
    setFieldFirstCorrect(EMPTY_FIELD_FIRST_CORRECT)
    setHelped(false)
    setScore(0)
    setQuestionSummaries([])
    setFinalPercentage(0)
    setFinished(false)
    setShowConfigModal(false)
  }

  useEffect(() => {
    if (isMobile) return
    firstInputRef.current?.focus()
  }, [currentIndex, isMobile])

  useEffect(() => {
    if (feedback?.allCorrect || helped) {
      nextButtonRef.current?.focus()
    }
  }, [feedback?.allCorrect, helped])

  if (!config || questions.length === 0) {
    return (
      <section className="test">
        <p>{t('test.noConfig')}</p>
        <button type="button" onClick={() => navigate('/')}>
          {t('test.backHome')}
        </button>
      </section>
    )
  }

  const question = questions[currentIndex]
  const solved = Boolean(feedback?.allCorrect) || helped

  function handleChange(field, value) {
    setAnswers((prev) => ({ ...prev, [field]: value }))
    if (feedback) setFeedback(null)
  }

  function pushSummary(finalFieldFirstCorrect, percentage) {
    setQuestionSummaries((prev) => [
      ...prev,
      {
        base: question.verb.base,
        pastSimple: question.verb.pastSimple,
        pastParticiple: question.verb.pastParticiple,
        translation: question.verb.translation,
        highlightedField: question.hintForm,
        fieldFirstCorrect: finalFieldFirstCorrect,
        percentage,
      },
    ])
  }

  function handleCheck(event) {
    event.preventDefault()

    const isEmpty =
      !answers.base.trim() && !answers.pastSimple.trim() && !answers.pastParticiple.trim()
    if (isEmpty) return

    const results = {
      base: isAnswerCorrect(answers.base, question.verb.base),
      pastSimple: isAnswerCorrect(answers.pastSimple, question.verb.pastSimple),
      pastParticiple: isAnswerCorrect(answers.pastParticiple, question.verb.pastParticiple),
    }
    const allCorrect = results.base && results.pastSimple && results.pastParticiple
    const attemptNumber = wrongAttempts + 1
    const nextFieldFirstCorrect = { ...fieldFirstCorrect }
    for (const field of FIELDS) {
      if (results[field] && nextFieldFirstCorrect[field] == null) {
        nextFieldFirstCorrect[field] = attemptNumber
      }
    }
    setFieldFirstCorrect(nextFieldFirstCorrect)

    if (allCorrect) {
      setScore((prev) => prev + 1)
      pushSummary(nextFieldFirstCorrect, attemptCredit(attemptNumber))
    } else {
      setWrongAttempts((prev) => prev + 1)
    }
    setFeedback({ results, allCorrect })
  }

  function handleHelp() {
    setHelped(true)
    const correctFieldsCount = FIELDS.filter((field) => fieldFirstCorrect[field] != null).length
    pushSummary(fieldFirstCorrect, (correctFieldsCount / FIELDS.length) * 100)
  }

  function handleNext() {
    const isLast = currentIndex === questions.length - 1
    if (isLast) {
      const percentage = Math.round(
        questionSummaries.reduce((sum, entry) => sum + entry.percentage, 0) / questions.length,
      )
      addProgressEntry({
        correctCount: score,
        totalCount: questions.length,
        type: 'test',
        percentage,
      })
      recordVerbResults(buildVerbResults(questionSummaries))
      setFinalPercentage(percentage)
      setFinished(true)
      return
    }
    setCurrentIndex((prev) => prev + 1)
    setAnswers(EMPTY_ANSWERS)
    setFeedback(null)
    setWrongAttempts(0)
    setFieldFirstCorrect(EMPTY_FIELD_FIRST_CORRECT)
    setHelped(false)
  }

  function handleFormKeyDown(event) {
    if (event.key !== 'Enter') return
    if (solved) {
      event.preventDefault()
      handleNext()
    }
  }

  if (finished) {
    return (
      <>
        <section className="test test--finished">
          <h2>{t(getResultTitleKey(finalPercentage))}</h2>
          <p className="test__result">
            {t('test.result', { score, total: questions.length, percentage: finalPercentage })}
          </p>

          <div className="test__summary">
            <h3>{t('test.summary.title')}</h3>
            <ol className="test__summary-list">
              {questionSummaries.map((entry, index) => (
                <li key={index}>
                  <VerbFormsRow
                    base={entry.base}
                    pastSimple={entry.pastSimple}
                    pastParticiple={entry.pastParticiple}
                    highlightedField={entry.highlightedField}
                    translation={entry.translation}
                  />
                  <br />
                  {buildQuestionNarrative(t, entry.fieldFirstCorrect)}{' '}
                  <span className="test__summary-percentage">
                    ({Math.round(entry.percentage)}%)
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="test__finished-actions">
            <button type="button" onClick={() => navigate('/')}>
              {t('test.backHome')}
            </button>
            <button type="button" onClick={() => setShowConfigModal(true)}>
              {t('test.repeat')}
            </button>
            <button type="button" onClick={() => navigate('/progress')}>
              {t('test.seeProgress')}
            </button>
          </div>

          {showConfigModal && (
            <TestConfigModal onClose={() => setShowConfigModal(false)} onStart={startChallenge} />
          )}
        </section>
        <RelatedChallenges exclude="test" />
      </>
    )
  }

  const hintValue = question.verb[question.hintForm]
  const isLast = currentIndex === questions.length - 1
  const isSpanish = i18n.resolvedLanguage === 'es'
  const helpRemaining = Math.max(HELP_ATTEMPTS - wrongAttempts, 0)

  return (
    <section className="test">
      <p className="test__counter">
        {String(currentIndex + 1).padStart(2, '0')}/{String(questions.length).padStart(2, '0')}
      </p>

      <p className="test__hint">
        {t('test.hint', { form: t(`test.forms.${question.hintForm}`) })}{' '}
        <strong>{hintValue}</strong>
        <PronunciationToggle
          text={getSpokenForm(question.verb.base, question.hintForm, hintValue)}
          alwaysOpen
        />
      </p>

      <form
        className="test__form"
        onSubmit={solved ? undefined : handleCheck}
        onKeyDown={handleFormKeyDown}
      >
        <label>
          {t('test.base')}
          <div className="test__input-wrap">
            <input
              ref={firstInputRef}
              type="text"
              value={answers.base}
              disabled={solved}
              onChange={(event) => handleChange('base', event.target.value)}
              className={feedback ? (feedback.results.base ? 'is-correct' : 'is-incorrect') : ''}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            {feedback && <StatusIcon correct={feedback.results.base} />}
          </div>
        </label>
        <label>
          {t('test.pastSimple')}
          <div className="test__input-wrap">
            <input
              type="text"
              value={answers.pastSimple}
              disabled={solved}
              onChange={(event) => handleChange('pastSimple', event.target.value)}
              className={
                feedback ? (feedback.results.pastSimple ? 'is-correct' : 'is-incorrect') : ''
              }
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            {feedback && <StatusIcon correct={feedback.results.pastSimple} />}
          </div>
        </label>
        <label>
          {t('test.pastParticiple')}
          <div className="test__input-wrap">
            <input
              type="text"
              value={answers.pastParticiple}
              disabled={solved}
              onChange={(event) => handleChange('pastParticiple', event.target.value)}
              className={
                feedback ? (feedback.results.pastParticiple ? 'is-correct' : 'is-incorrect') : ''
              }
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            {feedback && <StatusIcon correct={feedback.results.pastParticiple} />}
          </div>
        </label>

        {!feedback?.allCorrect && (
          <button
            type="button"
            className="test__help-btn"
            disabled={helpRemaining > 0 || helped}
            onClick={handleHelp}
          >
            {t('test.help', { count: helpRemaining })}
          </button>
        )}

        {helped && !feedback?.allCorrect && (
          <div className="test__help-block">
            <VerbInfo verb={question.verb} isSpanish={isSpanish} />
          </div>
        )}

        {feedback?.allCorrect && (
          <div className="test__success-block">
            <p className="test__success">{t(isLast ? 'test.correctLast' : 'test.correct')}</p>
            <VerbInfo verb={question.verb} isSpanish={isSpanish} />
          </div>
        )}

        {solved && (
          <VerbFormsTable
            forms={{
              base: question.verb.base,
              pastSimple: question.verb.pastSimple,
              pastParticiple: question.verb.pastParticiple,
            }}
          />
        )}

        {solved ? (
          <button
            ref={nextButtonRef}
            type="button"
            className="test__submit-btn"
            onClick={handleNext}
          >
            {isLast ? t('test.seeResult') : t('test.next')}
          </button>
        ) : (
          <button type="submit" className="test__submit-btn">
            {t('test.check')}
          </button>
        )}
      </form>
    </section>
  )
}

export default Test
