// Shared chart styling for the dark theme.
export const axisProps = {
  stroke: 'rgba(255,255,255,0.15)',
  tick: { fill: 'rgba(255,255,255,0.6)', fontSize: 12 },
  tickLine: false,
}

export const gridProps = { stroke: 'rgba(255,255,255,0.06)', vertical: false }

export const tooltipProps = {
  contentStyle: {
    background: '#141418',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 12,
  },
  labelStyle: { color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  itemStyle: { color: '#fff' },
}

// Skip chart animations for people who ask their OS for reduced motion.
export const animate = typeof window === 'undefined' || !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
