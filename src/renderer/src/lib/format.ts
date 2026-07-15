const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

const DIVISIONS: ReadonlyArray<{ readonly amount: number; readonly unit: Intl.RelativeTimeFormatUnit }> = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' }
]

export function formatRelativeTime(isoDate: string): string {
  const timestamp = new Date(isoDate).getTime()

  if (Number.isNaN(timestamp)) {
    return ''
  }

  let duration = (timestamp - Date.now()) / 1000

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return relativeTimeFormatter.format(Math.round(duration), division.unit)
    }

    duration /= division.amount
  }

  return ''
}

export function formatAbsoluteTime(isoDate: string): string {
  const timestamp = new Date(isoDate).getTime()

  if (Number.isNaN(timestamp)) {
    return ''
  }

  return new Date(timestamp).toLocaleString()
}
