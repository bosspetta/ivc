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
import { useTranslation } from 'react-i18next'
import { getProgress } from '../../utils/storage.js'
import './Progress.scss'

function formatDate(isoDate, language) {
  const locale = language === 'en' ? 'en-US' : 'es-ES'
  return new Date(isoDate).toLocaleDateString(locale, { day: '2-digit', month: 'short' })
}

const CHART_MUTED = 'rgba(var(--color-ink-rgb), 0.55)'
const CHART_GRID = 'rgba(var(--color-ink-rgb), 0.12)'
const CHART_AXIS = 'rgba(var(--color-ink-rgb), 0.25)'
const CHART_FONT_FAMILY = "'Hanken Grotesk', Arial, sans-serif"
const TEST_COLOR = '#8b05e4'
const FILL_GAPS_COLOR = '#e40938'

function CustomTooltip({ active, payload }) {
  const { t } = useTranslation()
  if (!active || !payload || payload.length === 0) return null

  const rows = payload
    .map((item) => {
      const isTest = item.dataKey === 'testPercentage'
      const correctCount = isTest ? item.payload.testCorrectCount : item.payload.fillGapsCorrectCount
      const totalCount = isTest ? item.payload.testTotalCount : item.payload.fillGapsTotalCount
      const dateLabel = isTest ? item.payload.testDateLabel : item.payload.fillGapsDateLabel
      if (correctCount === undefined) return null
      return { key: item.dataKey, color: item.color, isTest, correctCount, totalCount, dateLabel }
    })
    .filter(Boolean)

  if (rows.length === 0) return null

  return (
    <div className="progress-chart__tooltip">
      {rows.map((row) => (
        <div key={row.key} className="progress-chart__tooltip-row">
          <p className="progress-chart__tooltip-name" style={{ color: row.color }}>
            {t(row.isTest ? 'progress.legendTest' : 'progress.legendFillGaps')}
          </p>
          <p className="progress-chart__tooltip-date">{row.dateLabel}</p>
          <p>
            {t(row.isTest ? 'progress.tooltipVerbs' : 'progress.tooltipSentences', {
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

function legendFormatter(value, t) {
  return t(value === 'testPercentage' ? 'progress.legendTest' : 'progress.legendFillGaps')
}

function Progress() {
  const { t, i18n } = useTranslation()
  const entries = getProgress()
  const testEntries = entries.filter((entry) => (entry.type ?? 'test') === 'test')
  const fillGapsEntries = entries.filter((entry) => entry.type === 'fillGaps')
  const maxLength = Math.max(testEntries.length, fillGapsEntries.length)

  const data = Array.from({ length: maxLength }, (_, index) => {
    const testEntry = testEntries[index]
    const fillGapsEntry = fillGapsEntries[index]
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
              <Legend formatter={(value) => legendFormatter(value, t)} />
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
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export default Progress
