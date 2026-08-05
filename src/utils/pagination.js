// Genera un rango de páginas tipo [1, 'ellipsis-1', 4, 5, 6, 7, 8, 'ellipsis-2', 21]
export function getPaginationRange(current, total, siblings = 2) {
  const range = []
  for (let i = 1; i <= total; i += 1) {
    if (i === 1 || i === total || (i >= current - siblings && i <= current + siblings)) {
      range.push(i)
    }
  }

  const withEllipsis = []
  let previous = null
  for (const page of range) {
    if (previous !== null && page - previous > 1) {
      withEllipsis.push(`ellipsis-${previous}`)
    }
    withEllipsis.push(page)
    previous = page
  }
  return withEllipsis
}
