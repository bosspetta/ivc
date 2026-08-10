import {
  CartesianGrid,
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

function CustomXAxisTick({ x, y, payload, data }) {
  const entry = data.find((item) => item.label === payload.value)
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill={CHART_MUTED} fontSize={12}>
        {payload.value}
      </text>
      <text x={0} y={0} dy={26} textAnchor="middle" fill={CHART_MUTED} fontSize={10}>
        {entry?.dateLabel}
      </text>
    </g>
  )
}

function CustomTooltip({ active, payload }) {
  const { t } = useTranslation()
  if (!active || !payload || payload.length === 0) return null
  const entry = payload[0].payload
  return (
    <div className="progress-chart__tooltip">
      <p>{entry.dateLabel}</p>
      <p>
        {t('progress.tooltipVerbs', {
          correct: entry.correctCount,
          total: entry.totalCount,
          percentage: entry.percentage,
        })}
      </p>
    </div>
  )
}

function Progress() {
  const { t, i18n } = useTranslation()
  const entries = getProgress()
  const data = entries.map((entry, index) => ({
    label: `Test ${index + 1}`,
    dateLabel: formatDate(entry.date, i18n.language),
    percentage: entry.percentage,
    correctCount: entry.correctCount,
    totalCount: entry.totalCount,
  }))

  return (
    <section className="progress-page">
      <h2>{t('progress.title')}</h2>

      {data.length === 0 ? (
        <p className="progress-page__empty">{t('progress.empty')}</p>
      ) : (
        <div className="progress-chart">
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={data} margin={{ top: 16, right: 24, bottom: 20, left: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_GRID} />
              <XAxis
                dataKey="label"
                tick={<CustomXAxisTick data={data} />}
                axisLine={{ stroke: CHART_AXIS }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                tick={{ fill: CHART_MUTED, fontSize: 12 }}
                axisLine={{ stroke: CHART_AXIS }}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ r: 4, fill: 'var(--color-primary)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                activeDot={{
                  r: 6,
                  fill: 'var(--color-primary)',
                  stroke: 'var(--color-surface)',
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export default Progress
