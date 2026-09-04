import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getProgress, averagePercentage } from '../../utils/storage.js'
import './Progress.scss'

function formatDate(isoDate, language) {
  const locale = language === 'en' ? 'en-US' : 'es-ES'
  return new Date(isoDate).toLocaleDateString(locale, { day: '2-digit', month: 'short' })
}

const CHART_MUTED = 'rgba(var(--color-ink-rgb), 0.55)'
const CHART_GRID = 'rgba(var(--color-ink-rgb), 0.12)'
const CHART_AXIS = 'rgba(var(--color-ink-rgb), 0.25)'
const CHART_FONT_FAMILY = "'Nunito', Arial, sans-serif"
const TEST_COLOR = 'var(--color-primary)'
const FILL_GAPS_COLOR = 'var(--color-secondary)'
const CROSSWORD_COLOR = 'var(--color-logo-highlight)'

const SERIES = [
  {
    key: 'testPercentage',
    type: 'test',
    variant: 'test',
    correctKey: 'testCorrectCount',
    totalKey: 'testTotalCount',
    dateKey: 'testDateLabel',
    nameKey: 'progress.legendTest',
    tooltipKey: 'progress.tooltipVerbs',
  },
  {
    key: 'fillGapsPercentage',
    type: 'fillGaps',
    variant: 'fill-gaps',
    correctKey: 'fillGapsCorrectCount',
    totalKey: 'fillGapsTotalCount',
    dateKey: 'fillGapsDateLabel',
    nameKey: 'progress.legendFillGaps',
    tooltipKey: 'progress.tooltipSentences',
  },
  {
    key: 'crosswordPercentage',
    type: 'crossword',
    variant: 'crossword',
    correctKey: 'crosswordCorrectCount',
    totalKey: 'crosswordTotalCount',
    dateKey: 'crosswordDateLabel',
    nameKey: 'progress.legendCrossword',
    tooltipKey: 'progress.tooltipCrossword',
  },
]

function CustomTooltip({ active, payload }) {
  const { t } = useTranslation()
  if (!active || !payload || payload.length === 0) return null

  const rows = payload
    .map((item) => {
      const series = SERIES.find((s) => s.key === item.dataKey)
      if (!series) return null
      const correctCount = item.payload[series.correctKey]
      const totalCount = item.payload[series.totalKey]
      const dateLabel = item.payload[series.dateKey]
      if (correctCount === undefined) return null
      return { key: item.dataKey, color: item.color, series, correctCount, totalCount, dateLabel }
    })
    .filter(Boolean)

  if (rows.length === 0) return null

  return (
    <div className="progress-chart__tooltip">
      {rows.map((row) => (
        <div key={row.key} className="progress-chart__tooltip-row">
          <p className="progress-chart__tooltip-name">
            <span
              className="progress-chart__swatch"
              style={{ backgroundColor: row.color }}
              aria-hidden="true"
            />
            {t(row.series.nameKey)}
          </p>
          <p className="progress-chart__tooltip-date">{row.dateLabel}</p>
          <p>
            {t(row.series.tooltipKey, {
              correct: row.correctCount,
              total: row.totalCount,
              percentage: Math.round((row.correctCount / row.totalCount) * 100),
            })}
          </p>
        </div>
      ))}
    </div>
  )
}

function CustomLegend({ payload, averages }) {
  const { t } = useTranslation()
  if (!payload) return null

  const items = payload
    .map((entry) => {
      const series = SERIES.find((s) => s.key === entry.value)
      if (!series) return null
      return { entry, series, average: averages[series.type] }
    })
    .filter(Boolean)
    .sort((a, b) => (b.average ?? -1) - (a.average ?? -1))

  return (
    <ul className="progress-chart__legend">
      {items.map(({ entry, series, average }) => (
        <li key={entry.value} className="progress-chart__legend-item">
          <Link
            to="/"
            state={{ openConfig: series.type }}
            className={`progress-chart__legend-link progress-chart__legend-link--${series.variant}`}
          >
            {t(series.nameKey)}
            {average !== null && average !== 0 && (
              <span
                className={
                  average === 100
                    ? 'progress-chart__legend-average progress-chart__legend-average--perfect'
                    : 'progress-chart__legend-average'
                }
              >
                {' '}
                ({average}%)
              </span>
            )}
            <span className="progress-chart__legend-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function Progress() {
  const { t, i18n } = useTranslation()
  const entries = getProgress()
  const testEntries = entries.filter((entry) => (entry.type ?? 'test') === 'test')
  const fillGapsEntries = entries.filter((entry) => entry.type === 'fillGaps')
  const crosswordEntries = entries.filter((entry) => entry.type === 'crossword')
  const maxLength = Math.max(testEntries.length, fillGapsEntries.length, crosswordEntries.length)

  const averages = {
    test: averagePercentage(testEntries),
    fillGaps: averagePercentage(fillGapsEntries),
    crossword: averagePercentage(crosswordEntries),
  }

  const data = Array.from({ length: maxLength }, (_, index) => {
    const testEntry = testEntries[index]
    const fillGapsEntry = fillGapsEntries[index]
    const crosswordEntry = crosswordEntries[index]
    return {
      label: `${index + 1}`,
      testPercentage: testEntry?.percentage,
      testDateLabel: testEntry ? formatDate(testEntry.date, i18n.language) : undefined,
      testCorrectCount: testEntry?.correctCount,
      testTotalCount: testEntry?.totalCount,
      fillGapsPercentage: fillGapsEntry?.percentage,
      fillGapsDateLabel: fillGapsEntry ? formatDate(fillGapsEntry.date, i18n.language) : undefined,
      fillGapsCorrectCount: fillGapsEntry?.correctCount,
      fillGapsTotalCount: fillGapsEntry?.totalCount,
      crosswordPercentage: crosswordEntry?.percentage,
      crosswordDateLabel: crosswordEntry ? formatDate(crosswordEntry.date, i18n.language) : undefined,
      crosswordCorrectCount: crosswordEntry?.correctCount,
      crosswordTotalCount: crosswordEntry?.totalCount,
    }
  })

  return (
    <section className="progress-page">
      <h2>{t('progress.title')}</h2>

      {entries.length === 0 ? (
        <p className="progress-page__empty">{t('progress.empty')}</p>
      ) : (
        <div className="progress-chart">
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={data} margin={{ top: 16, right: 24, bottom: 20, left: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_GRID} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART_MUTED, fontSize: 12, fontFamily: CHART_FONT_FAMILY }}
                axisLine={{ stroke: CHART_AXIS }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                tick={{ fill: CHART_MUTED, fontSize: 12, fontFamily: CHART_FONT_FAMILY }}
                axisLine={{ stroke: CHART_AXIS }}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={(props) => <CustomLegend {...props} averages={averages} />} />
              <Line
                type="monotone"
                dataKey="testPercentage"
                stroke={TEST_COLOR}
                strokeWidth={2}
                dot={{ r: 4, fill: TEST_COLOR, stroke: 'var(--color-surface)', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: TEST_COLOR, stroke: 'var(--color-surface)', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="fillGapsPercentage"
                stroke={FILL_GAPS_COLOR}
                strokeWidth={2}
                dot={{ r: 4, fill: FILL_GAPS_COLOR, stroke: 'var(--color-surface)', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: FILL_GAPS_COLOR, stroke: 'var(--color-surface)', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="crosswordPercentage"
                stroke={CROSSWORD_COLOR}
                strokeWidth={2}
                dot={{ r: 4, fill: CROSSWORD_COLOR, stroke: 'var(--color-surface)', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: CROSSWORD_COLOR, stroke: 'var(--color-surface)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export default Progress
