import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { COMMON_VERBS } from '../../data/verbs.js'
import { addProgressEntry } from '../../utils/storage.js'
import { isAnswerCorrect, pickRandomForm, shuffle } from '../../utils/verbAnswers.js'
import { getResultTitleKey } from '../../utils/resultTitle.js'
import PronunciationToggle from '../../components/PronunciationToggle.jsx'
import TestConfigModal from '../../components/TestConfigModal.jsx'
import VerbFormsTable from '../../components/VerbFormsTable.jsx'
import useIsMobile from '../../hooks/useIsMobile.js'
import './Test.scss'

const EMPTY_ANSWERS = { base: '', pastSimple: '', pastParticiple: '' }
const HELP_ATTEMPTS = 3

function buildQuestions(verbCount, randomForms) {
  const selected = shuffle(COMMON_VERBS).slice(0, verbCount)
  return selected.map((verb) => ({
    verb,
    hintForm: randomForms ? pickRandomForm() : 'base',
  }))
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
  const [mistakeMade, setMistakeMade] = useState(false)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [helped, setHelped] = useState(false)
  const [score, setScore] = useState(0)
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
    setMistakeMade(false)
    setWrongAttempts(0)
    setHelped(false)
    setScore(0)
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
    if (allCorrect) {
      if (!mistakeMade) setScore((prev) => prev + 1)
    } else {
      setMistakeMade(true)
      setWrongAttempts((prev) => Math.min(prev + 1, HELP_ATTEMPTS))
    }
    setFeedback({ results, allCorrect })
  }

  function handleHelp() {
    setHelped(true)
  }

  function handleNext() {
    const isLast = currentIndex === questions.length - 1
    if (isLast) {
      addProgressEntry({ correctCount: score, totalCount: questions.length, type: 'test' })
      setFinished(true)
      return
    }
    setCurrentIndex((prev) => prev + 1)
    setAnswers(EMPTY_ANSWERS)
    setFeedback(null)
    setMistakeMade(false)
    setWrongAttempts(0)
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
    const percentage = Math.round((score / questions.length) * 100)
    return (
      <section className="test test--finished">
        <h2>{t(getResultTitleKey(percentage))}</h2>
        <p className="test__result">
          {t('test.result', { score, total: questions.length, percentage })}
        </p>
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
        <PronunciationToggle text={hintValue} alwaysOpen />
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
