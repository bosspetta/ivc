export function getResultTitleKey(percentage) {
  if (percentage < 50) return 'common.resultTitle.needsImprovement'
  if (percentage < 75) return 'common.resultTitle.goodTry'
  if (percentage < 95) return 'common.resultTitle.almostPerfect'
  return 'common.resultTitle.completed'
}
