import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { COMMON_VERBS, VERB_DEFINITIONS } from '../../data/verbs.js'
import { findVerbFormMatch } from '../../utils/verbForm.js'
import { isGapAnswerCorrect, shuffle } from '../../utils/verbAnswers.js'
import FillGapsConfigModal from '../../components/FillGapsConfigModal.jsx'
import PronunciationToggle from '../../components/PronunciationToggle.jsx'
import './FillGaps.scss'

const MAX_ATTEMPTS = 3

const GAP_FIELDS = [
  { tense: 'base', field: 'base', sentenceKey: 'example', candidatesKey: 'baseCandidates' },
  {
    tense: 'pastSimple',
    field: 'pastSimple',
    sentenceKey: 'examplePastSimple',
    candidatesKey: 'pastSimpleCandidates',
  },
  {
    tense: 'pastParticiple',
    field: 'pastParticiple',
    sentenceKey: 'examplePresentPerfect',
    candidatesKey: 'pastParticipleCandidates',
  },
]

function buildGapPool(verbs) {
  const pool = []
  for (const verb of verbs) {
    for (const field of GAP_FIELDS) {
      const sentence = verb[field.sentenceKey]
      const match = findVerbFormMatch(sentence, verb[field.candidatesKey])
      if (!match) continue
      pool.push({
        id: `${verb.id}-${field.tense}`,
        tense: field.tense,
        definition: VERB_DEFINITIONS[verb.base],
        before: sentence.slice(0, match.index),
        answer: match.text,
        after: sentence.slice(match.index + match.text.length),
        base: verb.base,
        pastSimple: verb.pastSimple,
        pastParticiple: verb.pastParticiple,
        allForms: [
          ...verb.baseCandidates,
          ...verb.pastSimpleCandidates,
          ...verb.pastParticipleCandidates,
        ].map((form) => form.toLowerCase()),
      })
    }
  }
  return pool
}

function buildQuestions(sentenceCount) {
  return shuffle(buildGapPool(COMMON_VERBS)).slice(0, sentenceCount)
}

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
      <span className="fill-gaps__other-forms__header">
        <span className="fill-gaps__other-forms__header-full">{full}</span>
        <span className="fill-gaps__other-forms__header-abbr" ref={abbrRef}>
          <button
            type="button"
            aria-expanded={tooltipOpen}
            onClick={() => setTooltipOpen((prev) => !prev)}
          >
            {abbr}
          </button>
          {tooltipOpen && (
            <span className="fill-gaps__other-forms__tooltip" role="tooltip">
              {full}
            </span>
          )}
        </span>
      </span>
    </th>
  )
}

function FillGaps() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const initialConfig = location.state

  const [config, setConfig] = useState(initialConfig)
  const [questions, setQuestions] = useState(() =>
    initialConfig ? buildQuestions(initialConfig.sentenceCount) : [],
  )
  const [showConfigModal, setShowConfigModal] = useState(false)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const inputRef = useRef(null)
  const nextButtonRef = useRef(null)

  function startChallenge(newConfig) {
    setConfig(newConfig)
    setQuestions(buildQuestions(newConfig.sentenceCount))
    setCurrentIndex(0)
    setAnswer('')
    setFeedback(null)
    setWrongAttempts(0)
    setScore(0)
    setFinished(false)
    setShowConfigModal(false)
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [currentIndex])

  useEffect(() => {
    if (feedback?.correct || feedback?.revealed) {
      nextButtonRef.current?.focus()
    } else if (feedback) {
      inputRef.current?.focus()
    }
  }, [feedback])

  if (!config || questions.length === 0) {
    return (
      <section className="fill-gaps">
        <p>{t('fillGaps.noConfig')}</p>
        <button type="button" onClick={() => navigate('/')}>
          {t('fillGaps.backHome')}
        </button>
      </section>
    )
  }

  const question = questions[currentIndex]
  const solved = Boolean(feedback?.correct) || Boolean(feedback?.revealed)
  const isLast = currentIndex === questions.length - 1

  function handleCheck(event) {
    event.preventDefault()
    if (!answer.trim()) return

    const correct = isGapAnswerCorrect(answer, question.answer)
    if (correct) {
      setScore((prev) => prev + 1)
      setFeedback({ correct: true })
      return
    }

    const attemptsUsed = wrongAttempts + 1
    setWrongAttempts(attemptsUsed)
    const revealed = attemptsUsed >= MAX_ATTEMPTS
    const sameVerb = question.allForms.includes(answer.trim().toLowerCase())
    setFeedback({ correct: false, revealed, sameVerb, attemptsLeft: MAX_ATTEMPTS - attemptsUsed })
    if (!revealed) setAnswer('')
  }

  function handleHelp() {
    setFeedback({ correct: false, revealed: true })
  }

  function handleNext() {
    if (isLast) {
      setFinished(true)
      return
    }
    setCurrentIndex((prev) => prev + 1)
    setAnswer('')
    setFeedback(null)
    setWrongAttempts(0)
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
      <section className="fill-gaps fill-gaps--finished">
        <h2>{t('fillGaps.finishedTitle')}</h2>
        <p className="fill-gaps__result">
          {t('fillGaps.result', { score, total: questions.length, percentage })}
        </p>
        <div className="fill-gaps__finished-actions">
          <button type="button" className="fill-gaps__back-btn" onClick={() => navigate('/')}>
            {t('fillGaps.backHome')}
          </button>
          <button
            type="button"
            className="fill-gaps__back-btn"
            onClick={() => setShowConfigModal(true)}
          >
            {t('fillGaps.repeat')}
          </button>
        </div>

        {showConfigModal && (
          <FillGapsConfigModal onClose={() => setShowConfigModal(false)} onStart={startChallenge} />
        )}
      </section>
    )
  }

  return (
    <section className="fill-gaps">
      <p className="fill-gaps__counter">
        {String(currentIndex + 1).padStart(2, '0')}/{String(questions.length).padStart(2, '0')}
      </p>
      <p className="fill-gaps__tense">{t(`verbList.columns.${question.tense}`)}</p>

      <form
        className="fill-gaps__form"
        onSubmit={solved ? undefined : handleCheck}
        onKeyDown={handleFormKeyDown}
      >
        <p className="fill-gaps__sentence">
          {question.before}
          <input
            ref={inputRef}
            type="text"
            value={answer}
            disabled={solved}
            onChange={(event) => {
              setAnswer(event.target.value)
              if (feedback) setFeedback(null)
            }}
            className={feedback ? (feedback.correct ? 'is-correct' : 'is-incorrect') : ''}
            aria-label={t('fillGaps.inputLabel')}
            autoComplete="off"
            spellCheck="false"
          />
          {question.after}
        </p>

        {solved && (
          <p className="fill-gaps__full-sentence">
            {question.before}
            <strong>{question.answer}</strong>
            {question.after}
            <PronunciationToggle text={`${question.before}${question.answer}${question.after}`} alwaysOpen />
          </p>
        )}

        <p className="fill-gaps__translation">
          {t('fillGaps.definitionLabel')} <em>{question.definition}</em>
        </p>

        {feedback?.correct && <p className="fill-gaps__success">{t('fillGaps.correct')}</p>}

        {feedback && !feedback.correct && !feedback.revealed && (
          <p className="fill-gaps__retry">
            {feedback.sameVerb && <>{t('fillGaps.almost')} </>}
            {t('fillGaps.tryAgain', { count: feedback.attemptsLeft })}
          </p>
        )}

        {solved && (
          <div className="fill-gaps__other-forms">
            <span className="fill-gaps__other-forms__label">
              {t('fillGaps.fullConjugationPrefix')}
            </span>
            <table>
              <thead>
                <tr>
                  {GAP_FIELDS.map((field) => (
                    <TenseHeaderCell
                      key={field.tense}
                      full={t(`verbList.columns.${field.tense}`)}
                      abbr={t(`fillGaps.abbr.${field.tense}`)}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {GAP_FIELDS.map((field) => {
                    const isTested = field.tense === question.tense
                    const value = isTested ? question.answer : question[field.field]
                    return (
                      <td key={field.tense}>
                        <span
                          className={
                            isTested
                              ? 'fill-gaps__other-forms__form is-tested'
                              : 'fill-gaps__other-forms__form'
                          }
                        >
                          {value}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="fill-gaps__actions">
          {solved ? (
            <button ref={nextButtonRef} type="button" onClick={handleNext}>
              {isLast ? t('fillGaps.seeResult') : t('fillGaps.next')}
            </button>
          ) : (
            <>
              <button type="submit">{t('fillGaps.check')}</button>
              <button type="button" className="fill-gaps__help-btn" onClick={handleHelp}>
                {t('fillGaps.help')}
              </button>
            </>
          )}
        </div>
      </form>
    </section>
  )
}

export default FillGaps
