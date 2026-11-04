// Number formatting for stats. All return '—' for missing values.
const missing = v => v === null || v === undefined || Number.isNaN(Number(v))

export const fixed = (v, digits = 1) => (missing(v) ? '—' : Number(v).toFixed(digits))
// 0.512 → "51.2%"
export const pct = (v, digits = 1) => (missing(v) ? '—' : `${(Number(v) * 100).toFixed(digits)}%`)
// +3.2 / -1.5
export const signed = (v, digits = 1) => (missing(v) ? '—' : `${v > 0 ? '+' : ''}${Number(v).toFixed(digits)}`)
export const int = v => (missing(v) ? '—' : Math.round(Number(v)).toString())

// "1st", "2nd", "23rd"
export function ordinal(n) {
  if (missing(n)) return '—'
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// Accepts "2026-11-02", "Nov 02, 2026" or "20261102".
export function shortDate(value) {
  if (!value) return ''
  let s = String(value)
  if (/^\d{8}$/.test(s)) s = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}`
  const d = /^\d{4}-\d{2}-\d{2}/.test(s) ? new Date(`${s.slice(0, 10)}T12:00:00`) : new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function longDate(value) {
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

// Local tip-off time from a UTC timestamp.
export function tipoff(utc) {
  const d = new Date(utc)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
