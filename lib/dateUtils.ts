/**
 * Date utility helpers shared across the library system.
 * Used for return date pickers on student browse and staff approval dialogs.
 */

/** Returns true if the given date falls on a Saturday (6) or Sunday (0) */
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

/** Returns the next weekday (Mon–Fri) on or after the given date */
export function getNextWeekday(date: Date): Date {
  const d = new Date(date)
  while (isWeekend(d)) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

/** Returns the earliest allowed return date (tomorrow, skipping weekends) */
export function getMinReturnDate(): Date {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return getNextWeekday(tomorrow)
}

/** Returns the latest allowed return date (15 calendar days from today, skipping weekends) */
export function getMaxReturnDate(): Date {
  const max = new Date()
  max.setDate(max.getDate() + 15)
  // If max lands on a weekend, step back to Friday
  while (isWeekend(max)) {
    max.setDate(max.getDate() - 1)
  }
  return max
}

/** Formats a Date to yyyy-MM-dd string for HTML date inputs */
export function toInputDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Validates a date string from an input[type=date].
 * Returns an error message string if invalid, or null if valid.
 */
export function validateReturnDate(value: string): string | null {
  if (!value) return 'Please select a return date.'
  const d = new Date(value + 'T00:00:00') // treat as local date
  if (isWeekend(d)) return 'Weekends are not allowed. Please choose a weekday.'
  const min = getMinReturnDate()
  const max = getMaxReturnDate()
  if (d < min) return 'Return date must be at least tomorrow.'
  if (d > max) return `Return date cannot exceed 15 days from today (${toInputDate(max)}).`
  return null
}
