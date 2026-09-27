export function parsePageNumber(value: string, pageCount: number): number | null {
  const text = value.trim()
  if (!/^\d+$/.test(text)) return null
  const page = Number(text)
  return Number.isSafeInteger(page) && page >= 1 && page <= pageCount ? page : null
}

export function pickPageItem<T>(items: readonly T[], pageSize: number, random: () => number = Math.random) {
  if (!items.length || !Number.isSafeInteger(pageSize) || pageSize < 1) return null
  const unit = random()
  const safeUnit = Number.isFinite(unit) ? Math.max(0, Math.min(1 - Number.EPSILON, unit)) : 0
  const index = Math.floor(safeUnit * items.length)
  return { item: items[index]!, index, page: Math.floor(index / pageSize) + 1 }
}
