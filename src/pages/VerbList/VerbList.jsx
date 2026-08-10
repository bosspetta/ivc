import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { COMMON_VERBS, DIALECT_VARIANTS, VERBS } from '../../data/verbs.js'
import { getPaginationRange } from '../../utils/pagination.js'
import PronunciationToggle from '../../components/PronunciationToggle.jsx'
import './VerbList.scss'

const PAGE_SIZE = 20
const MAX_SUGGESTIONS = 8
const HIGHLIGHT_DURATION = 2500
const MOBILE_QUERY = '(max-width: 767px)' // debe coincidir con $breakpoint-md en _variables.scss

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY)
    const handleChange = (event) => setIsMobile(event.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightVerbForm(sentence, candidates) {
  for (const candidate of candidates) {
    const match = sentence.match(new RegExp(`\\b${escapeRegExp(candidate)}\\b`, 'i'))
    if (match) {
      const start = match.index
      const end = start + match[0].length
      return (
        <>
          {sentence.slice(0, start)}
          <strong>{sentence.slice(start, end)}</strong>
          {sentence.slice(end)}
        </>
      )
    }
  }
  return sentence
}

function VerbFormWithAudio({ id, candidates, dialect, openPronunciationId, onOpenPronunciation, onClosePronunciation }) {
  if (dialect) {
    return [
      { locale: 'US', word: dialect.us },
      { locale: 'UK', word: dialect.uk },
    ].map(({ locale, word }) => (
      <span className="verb-list__form verb-list__form--block" key={locale}>
        <span className="verb-list__form__location">({locale})</span>
        {word}
        <PronunciationToggle
          id={`${id}-${locale}`}
          text={word}
          openId={openPronunciationId}
          onOpen={onOpenPronunciation}
          onClose={onClosePronunciation}
        />
      </span>
    ))
  }

  const isMultiple = candidates.length > 1

  return candidates.map((candidate, index) => (
    <span
      className={isMultiple ? 'verb-list__form verb-list__form--block' : 'verb-list__form'}
      key={candidate}
    >
      {candidate}
      <PronunciationToggle
        id={`${id}-${index}`}
        text={candidate}
        openId={openPronunciationId}
        onOpen={onOpenPronunciation}
        onClose={onClosePronunciation}
      />
    </span>
  ))
}

function matchesQuery(verb, query) {
  const needle = query.trim().toLowerCase()
  if (!needle) return false
  return (
    verb.base.toLowerCase().includes(needle) ||
    verb.pastSimple.toLowerCase().includes(needle) ||
    verb.pastParticiple.toLowerCase().includes(needle) ||
    verb.translation.toLowerCase().includes(needle)
  )
}

function VerbList() {
  const { t, i18n } = useTranslation()
  const isEnglish = i18n.resolvedLanguage === 'en'
  const [showAll, setShowAll] = useState(false)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDropdownOpen, setDropdownOpen] = useState(false)
  const [highlightedVerbId, setHighlightedVerbId] = useState(null)
  const [openPronunciationId, setOpenPronunciationId] = useState(null)
  const highlightTimeoutRef = useRef(null)
  const rowRefs = useRef({})
  const searchContainerRef = useRef(null)
  const isMobile = useIsMobile()

  const activeList = showAll ? VERBS : COMMON_VERBS
  const totalPages = Math.ceil(activeList.length / PAGE_SIZE)

  const pageVerbs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return activeList.slice(start, start + PAGE_SIZE)
  }, [activeList, page])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return activeList.filter((verb) => matchesQuery(verb, searchQuery)).slice(0, MAX_SUGGESTIONS)
  }, [activeList, searchQuery])

  useEffect(() => {
    return () => clearTimeout(highlightTimeoutRef.current)
  }, [])

  useEffect(() => {
    if (highlightedVerbId === null) return
    rowRefs.current[highlightedVerbId]?.scrollIntoView({ behavior: 'auto', block: 'start' })
  }, [highlightedVerbId])

  function handleSearchBlur(event) {
    if (searchContainerRef.current?.contains(event.relatedTarget)) return
    setDropdownOpen(false)
  }

  function goToPage(nextPage) {
    const clamped = Math.min(Math.max(nextPage, 1), totalPages)
    setPage(clamped)
  }

  function handleToggleList(nextShowAll) {
    setShowAll(nextShowAll)
    setPage(1)
    setSearchQuery('')
    setDropdownOpen(false)
    setHighlightedVerbId(null)
  }

  function handleSelectVerb(verb) {
    const index = activeList.findIndex((item) => item.id === verb.id)
    const targetPage = Math.floor(index / PAGE_SIZE) + 1
    setPage(targetPage)
    setSearchQuery('')
    setDropdownOpen(false)
    setHighlightedVerbId(verb.id)

    clearTimeout(highlightTimeoutRef.current)
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedVerbId(null)
    }, HIGHLIGHT_DURATION)
  }

  const pageNumbers = getPaginationRange(page, totalPages, isMobile ? 1 : 2)

  return (
    <section className="verb-list">
      <h2>{t('verbList.title')}</h2>
      <p className="verb-list__count">{t('verbList.count', { count: activeList.length })}</p>

      <div className="verb-list__controls">
        <div className="verb-list__search" ref={searchContainerRef}>
          <input
            type="text"
            placeholder={t('verbList.searchPlaceholder')}
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setDropdownOpen(true)
            }}
            onFocus={() => setDropdownOpen(true)}
            onBlur={handleSearchBlur}
          />
          {isDropdownOpen && searchQuery.trim() && (
            <ul className="verb-list__dropdown">
              {searchResults.length > 0 ? (
                searchResults.map((verb) => (
                  <li key={verb.id} onMouseDown={(event) => event.preventDefault()}>
                    <button type="button" onClick={() => handleSelectVerb(verb)}>
                      <span className="verb-list__dropdown-base">{verb.base}</span>
                      <span className="verb-list__dropdown-translation">
                        {verb.translation}
                      </span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="verb-list__dropdown-empty">{t('verbList.noResults')}</li>
              )}
            </ul>
          )}
        </div>

        <label className="verb-list__switch">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(event) => handleToggleList(event.target.checked)}
          />
          <span className="verb-list__switch-track">
            <span className="verb-list__switch-thumb" />
          </span>
          <span className="verb-list__switch-label">
            {showAll ? t('verbList.viewCommon') : t('verbList.viewAll')}
          </span>
        </label>
      </div>

      <div className="verb-list__table-wrapper">
        <table className="verb-list__table">
          <thead>
            <tr>
              <th>{t('verbList.columns.base')}</th>
              <th>{t('verbList.columns.pastSimple')}</th>
              <th>{t('verbList.columns.pastParticiple')}</th>
              <th>
                {isEnglish
                  ? t('verbList.columns.example')
                  : t('verbList.columns.translationAndExample')}
              </th>
            </tr>
          </thead>
          <tbody>
            {pageVerbs.map((verb) => (
              <tr
                key={verb.id}
                ref={(el) => {
                  rowRefs.current[verb.id] = el
                }}
                className={verb.id === highlightedVerbId ? 'is-highlighted' : ''}
              >
                <td data-label={t('verbList.columns.base')}>
                  <VerbFormWithAudio
                    id={`${verb.id}-base`}
                    candidates={verb.baseCandidates}
                    openPronunciationId={openPronunciationId}
                    onOpenPronunciation={setOpenPronunciationId}
                    onClosePronunciation={() => setOpenPronunciationId(null)}
                  />
                </td>
                <td data-label={t('verbList.columns.pastSimple')}>
                  <VerbFormWithAudio
                    id={`${verb.id}-pastSimple`}
                    candidates={verb.pastSimpleCandidates}
                    dialect={DIALECT_VARIANTS[verb.base]?.pastSimple}
                    openPronunciationId={openPronunciationId}
                    onOpenPronunciation={setOpenPronunciationId}
                    onClosePronunciation={() => setOpenPronunciationId(null)}
                  />
                </td>
                <td data-label={t('verbList.columns.pastParticiple')}>
                  <VerbFormWithAudio
                    id={`${verb.id}-pastParticiple`}
                    candidates={verb.pastParticipleCandidates}
                    dialect={DIALECT_VARIANTS[verb.base]?.pastParticiple}
                    openPronunciationId={openPronunciationId}
                    onOpenPronunciation={setOpenPronunciationId}
                    onClosePronunciation={() => setOpenPronunciationId(null)}
                  />
                </td>
                <td
                  data-label={
                    isEnglish
                      ? t('verbList.columns.example')
                      : t('verbList.columns.translationAndExample')
                  }
                >
                  {!isEnglish && (
                    <span className="verb-list__translation">{verb.translation}</span>
                  )}
                  <span className="verb-list__example">
                    <span className="verb-list__example__vform verb-list__example__vform--infinitive">
                      <span className="verb-list__example__vform__title">
                        {t('verbList.columns.base')}
                      </span>
                      {highlightVerbForm(verb.example, verb.baseCandidates)}
                      <PronunciationToggle
                        id={`${verb.id}-example-base`}
                        text={verb.example}
                        openId={openPronunciationId}
                        onOpen={setOpenPronunciationId}
                        onClose={() => setOpenPronunciationId(null)}
                        rate={0.9}
                      />
                    </span>
                    <span className="verb-list__example__vform verb-list__example__vform--past-simple">
                      <span className="verb-list__example__vform__title">
                        {t('verbList.columns.pastSimple')}
                      </span>
                      {highlightVerbForm(verb.examplePastSimple, verb.pastSimpleCandidates)}
                      <PronunciationToggle
                        id={`${verb.id}-example-pastSimple`}
                        text={verb.examplePastSimple}
                        openId={openPronunciationId}
                        onOpen={setOpenPronunciationId}
                        onClose={() => setOpenPronunciationId(null)}
                        rate={0.9}
                      />
                    </span>
                    <span className="verb-list__example__vform verb-list__example__vform--past-participle">
                      <span className="verb-list__example__vform__title">
                        {t('verbList.columns.pastParticiple')}
                      </span>
                      {highlightVerbForm(verb.examplePresentPerfect, verb.pastParticipleCandidates)}
                      <PronunciationToggle
                        id={`${verb.id}-example-pastParticiple`}
                        text={verb.examplePresentPerfect}
                        openId={openPronunciationId}
                        onOpen={setOpenPronunciationId}
                        onClose={() => setOpenPronunciationId(null)}
                        rate={0.9}
                      />
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav className="verb-list__pagination">
        <button type="button" onClick={() => goToPage(page - 1)} disabled={page === 1}>
          ‹
        </button>
        {pageNumbers.map((item) =>
          typeof item === 'number' ? (
            <button
              key={item}
              type="button"
              className={item === page ? 'is-active' : ''}
              onClick={() => goToPage(item)}
            >
              {item}
            </button>
          ) : (
            <span key={item} className="verb-list__ellipsis">
              …
            </span>
          ),
        )}
        <button
          type="button"
          onClick={() => goToPage(page + 1)}
          disabled={page === totalPages}
        >
          ›
        </button>
      </nav>
    </section>
  )
}

export default VerbList
