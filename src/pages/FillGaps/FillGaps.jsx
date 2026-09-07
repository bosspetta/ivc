import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { COMMON_VERBS, VERB_DEFINITIONS, VERB_HINTS } from '../../data/verbs.js'
import { findVerbFormMatch } from '../../utils/verbForm.js'
import { isGapAnswerCorrect, shuffle } from '../../utils/verbAnswers.js'
import { addProgressEntry } from '../../utils/storage.js'
import { getResultTitleKey } from '../../utils/resultTitle.js'
import FillGapsConfigModal from '../../components/FillGapsConfigModal.jsx'
import PronunciationToggle from '../../components/PronunciationToggle.jsx'
import VerbFormsTable from '../../components/VerbFormsTable.jsx'
import VerbFormsRow from '../../components/VerbFormsRow.jsx'
import RelatedChallenges from '../../components/RelatedChallenges.jsx'
import useIsMobile from '../../hooks/useIsMobile.js'
import './FillGaps.scss'

const MAX_ATTEMPTS = 3
const HINT_PENALTY = 0.25

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
        hint: VERB_HINTS[verb.base],
        translation: verb.translation,
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

function summaryText(t, entry) {
  if (entry.revealed) return t('fillGaps.summary.revealed')
  return t(entry.hintUsed ? 'fillGaps.summary.correctWithHint' : 'fillGaps.summary.correctNoHint')
}

function FillGaps() {
  const { t, i18n } = useTranslation()
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
  const [hintShown, setHintShown] = useState(false)
  const [score, setScore] = useState(0)
  const [questionSummaries, setQuestionSummaries] = useState([])
  const [finished, setFinished] = useState(false)
  const [finalPercentage, setFinalPercentage] = useState(0)
  const inputRef = useRef(null)
  const nextButtonRef = useRef(null)
  const isMobile = useIsMobile()

  function startChallenge(newConfig) {
    setConfig(newConfig)
    setQuestions(buildQuestions(newConfig.sentenceCount))
    setCurrentIndex(0)
    setAnswer('')
    setFeedback(null)
    setWrongAttempts(0)
    setHintShown(false)
    setScore(0)
    setQuestionSummaries([])
    setFinished(false)
    setFinalPercentage(0)
    setShowConfigModal(false)
  }

  useEffect(() => {
    if (isMobile) return
    inputRef.current?.focus()
  }, [currentIndex, isMobile])

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
  const isSpanish = i18n.resolvedLanguage === 'es'

  function handleCheck(event) {
    event.preventDefault()
    if (!answer.trim()) return

    const correct = isGapAnswerCorrect(answer, question.answer)
    if (correct) {
      setScore((prev) => prev + 1)
      const percentage = hintShown ? 100 - HINT_PENALTY * 100 : 100
      pushSummary(false, percentage)
      setFeedback({ correct: true })
      return
    }

    const attemptsUsed = Math.min(wrongAttempts + 1, MAX_ATTEMPTS)
    setWrongAttempts(attemptsUsed)
    const sameVerb = question.allForms.includes(answer.trim().toLowerCase())
    setFeedback({
      correct: false,
      sameVerb,
      attemptsLeft: Math.max(MAX_ATTEMPTS - attemptsUsed, 0),
    })
    setAnswer('')
  }

  function handleHint() {
    setHintShown(true)
  }

  function pushSummary(revealed, percentage) {
    setQuestionSummaries((prev) => [
      ...prev,
      {
        base: question.base,
        pastSimple: question.pastSimple,
        pastParticiple: question.pastParticiple,
        translation: question.translation,
        highlightedField: question.tense,
        hintUsed: hintShown,
        revealed,
        percentage,
      },
    ])
  }

  function handleReveal() {
    pushSummary(true, 0)
    setFeedback({ correct: false, revealed: true })
  }

  function handleNext() {
    if (isLast) {
      const percentage = Math.round(
        questionSummaries.reduce((sum, entry) => sum + entry.percentage, 0) / questions.length,
      )
      addProgressEntry({
        correctCount: score,
        totalCount: questions.length,
        type: 'fillGaps',
        percentage,
      })
      setFinalPercentage(percentage)
      setFinished(true)
      return
    }
    setCurrentIndex((prev) => prev + 1)
    setAnswer('')
    setFeedback(null)
    setWrongAttempts(0)
    setHintShown(false)
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
        <section className="fill-gaps fill-gaps--finished">
          <h2>{t(getResultTitleKey(finalPercentage))}</h2>
          <p className="fill-gaps__result">
            {t('fillGaps.result', { score, total: questions.length, percentage: finalPercentage })}
          </p>

          <div className="fill-gaps__summary">
            <h3>{t('fillGaps.summary.title')}</h3>
            <ol className="fill-gaps__summary-list">
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
                  {summaryText(t, entry)}{' '}
                  <span className="fill-gaps__summary-percentage">
                    ({Math.round(entry.percentage)}%)
                  </span>
                </li>
              ))}
            </ol>
          </div>

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
            <button type="button" className="fill-gaps__back-btn" onClick={() => navigate('/progress')}>
              {t('fillGaps.seeProgress')}
            </button>
          </div>

          {showConfigModal && (
            <FillGapsConfigModal onClose={() => setShowConfigModal(false)} onStart={startChallenge} />
          )}
        </section>
        <RelatedChallenges exclude="fillGaps" />
      </>
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
            autoCorrect="off"
            autoCapitalize="off"
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

        {feedback && !feedback.correct && !feedback.revealed && feedback.attemptsLeft > 0 && (
          <p className="fill-gaps__retry">
            {feedback.sameVerb && <>{t('fillGaps.almost')} </>}
            {t('fillGaps.tryAgain', { count: feedback.attemptsLeft })}
          </p>
        )}

        {hintShown && (
          <p className="fill-gaps__hint">{t('fillGaps.hintText', { hint: question.hint })}</p>
        )}

        {solved && isSpanish && (
          <p className="fill-gaps__answer-translation">{question.translation}</p>
        )}

        {solved && (
          <VerbFormsTable
            forms={{
              base: question.tense === 'base' ? question.answer : question.base,
              pastSimple: question.tense === 'pastSimple' ? question.answer : question.pastSimple,
              pastParticiple:
                question.tense === 'pastParticiple' ? question.answer : question.pastParticiple,
            }}
            testedTense={question.tense}
          />
        )}

        <div className="fill-gaps__actions">
          {solved ? (
            <button ref={nextButtonRef} type="button" onClick={handleNext}>
              {isLast ? t('fillGaps.seeResult') : t('fillGaps.next')}
            </button>
          ) : (
            <>
              <button type="submit">{t('fillGaps.check')}</button>
              {!hintShown && (
                <button type="button" className="fill-gaps__hint-btn" onClick={handleHint}>
                  {t('fillGaps.hint')}
                </button>
              )}
              <button
                type="button"
                className="fill-gaps__reveal-btn"
                disabled={wrongAttempts < MAX_ATTEMPTS}
                onClick={handleReveal}
              >
                {t('fillGaps.reveal', { count: Math.max(MAX_ATTEMPTS - wrongAttempts, 0) })}
              </button>
            </>
          )}
        </div>
      </form>
    </section>
  )
}

export default FillGaps
