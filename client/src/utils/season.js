// NBA seasons are named by their starting year: Oct 2026 – Jun 2027 is season 2026.
export function currentSeason(date = new Date()) {
  const year = date.getFullYear()
  return date.getMonth() >= 8 ? year : year - 1 // Sep or later → new season
}

// "2026" → "2026-27"
export function seasonLabel(season) {
  return `${season}-${String((season + 1) % 100).padStart(2, '0')}`
}
