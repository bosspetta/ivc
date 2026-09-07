import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './RelatedChallenges.scss'

const CHALLENGES = [
  { type: 'test', titleKey: 'home.card.title' },
  { type: 'fillGaps', titleKey: 'home.fillGapsCard.title' },
  { type: 'crossword', titleKey: 'home.crosswordCard.title' },
]

function RelatedChallenges({ exclude }) {
  const { t } = useTranslation()
  const others = CHALLENGES.filter((challenge) => challenge.type !== exclude)

  return (
    <div className="related-challenges">
      {others.map((challenge) => (
        <Link
          key={challenge.type}
          to="/"
          state={{ openConfig: challenge.type }}
          className="related-challenges__link"
        >
          {t(challenge.titleKey)}
        </Link>
      ))}
    </div>
  )
}

export default RelatedChallenges
