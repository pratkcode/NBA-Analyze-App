import React from 'react'
import { ordinal } from '../utils/format'

// Big number with a label, e.g. "28.4 / PPG".
export function StatTile({ label, value, sub }){
  return (
    <div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-white/50">{label}</div>
      {sub && <div className="text-[11px] text-white/40 mt-0.5">{sub}</div>}
    </div>
  )
}

// Row with a value, league rank and a percentile bar (100 = best in the league).
export function MetricRow({ label, hint, value, rank, percentile, total }){
  const color = percentile == null ? 'bg-white/20' : percentile >= 80 ? 'bg-emerald-400' : percentile >= 50 ? 'bg-accent' : percentile >= 20 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="py-2 border-t border-white/5 first:border-0">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-white/80" title={hint}>{label}{hint && <span className="ml-1 text-white/30 cursor-help">ⓘ</span>}</span>
        <span className="tabular-nums">
          <span className="font-semibold">{value}</span>
          {rank != null && <span className="text-xs text-white/40 ml-2">{ordinal(rank)}{total ? ` of ${total}` : ''}</span>}
        </span>
      </div>
      {percentile != null && (
        <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden" aria-label={`${percentile}th percentile`}>
          <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(3, percentile)}%` }} />
        </div>
      )}
    </div>
  )
}

// Simple tab bar.
export function Tabs({ tabs, value, onChange }){
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-white/10 mb-6 -mx-1 px-1" role="tablist">
      {tabs.map(t => (
        <button
          key={t.key}
          role="tab"
          aria-selected={t.key === value}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${t.key === value ? 'border-accent text-white' : 'border-transparent text-white/60 hover:text-white'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// Horizontally scrollable table wrapper.
export function TableWrap({ children, minWidth = 640 }){
  return (
    <div className="overflow-x-auto -mx-4 md:-mx-5 px-4 md:px-5">
      <table className="w-full text-sm tabular-nums" style={{ minWidth }}>{children}</table>
    </div>
  )
}

// Sortable column header.
export function SortTh({ label, k, sort, onSort, className = '', title }){
  const active = sort.key === k
  return (
    <th className={`font-normal pb-2 px-1.5 whitespace-nowrap ${className}`} title={title}>
      <button onClick={() => onSort(k)} className={`hover:text-white transition-colors ${active ? 'text-white' : ''}`}>
        {label}{active ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
      </button>
    </th>
  )
}
