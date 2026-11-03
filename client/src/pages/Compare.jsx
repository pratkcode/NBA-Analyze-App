import React, { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import PlayerSearch from '../components/PlayerSearch'
import RadarCompare from '../components/charts/RadarCompare'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { usePlayer, useSeasonAverages } from '../hooks/usePlayers'
import { errorMessage } from '../services/api'
import { currentSeason, seasonLabel } from '../utils/season'

// `scale` is a strong-season value used to put each stat on a 0–100 radar axis.
const STATS = [
  { key: 'pts', label: 'PTS', scale: 35 },
  { key: 'reb', label: 'REB', scale: 14 },
  { key: 'ast', label: 'AST', scale: 11 },
  { key: 'stl', label: 'STL', scale: 2.5 },
  { key: 'blk', label: 'BLK', scale: 3 },
]
const PCT_STATS = [
  { key: 'fg_pct', label: 'FG%' },
  { key: 'fg3_pct', label: '3P%' },
  { key: 'ft_pct', label: 'FT%' },
]

const fullName = p => `${p.first_name} ${p.last_name}`

export default function Compare(){
  // Picks live in the URL (?a=ID&b=ID) so a comparison can be shared or refreshed.
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const [known, setKnown] = useState(location.state || {})
  const { data: a } = usePlayer(params.get('a'), known.a)
  const { data: b } = usePlayer(params.get('b'), known.b)

  const choose = slot => p => {
    setKnown(k => ({ ...k, [slot]: p }))
    setParams(prev => { const next = new URLSearchParams(prev); next.set(slot, p.id); return next }, { replace: true })
  }
  const setA = choose('a')
  const setB = choose('b')
  const season = currentSeason()
  // Only fetch once both are picked (the free API tier allows 5 requests/min).
  const ids = a && b ? [a.id, b.id] : []
  const { data, loading, error } = useSeasonAverages(ids, season)

  const byId = new Map((data?.data || []).map(row => [row.player_id, row]))
  const avgA = a ? byId.get(a.id) : null
  const avgB = b ? byId.get(b.id) : null

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-1">Player Comparison</h1>
      <p className="text-white/60 mb-6">{seasonLabel(season)} regular season averages</p>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <div className="mb-4 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#7c5cff]" />Player A</div>
          <PlayerSearch onSelect={setA} />
          {a && <div className="mt-4 text-lg font-semibold"><Link to={`/players/${a.id}`} state={{ player: a }} className="hover:underline">{fullName(a)}</Link> <span className="text-white/50 font-normal text-sm">{a.team?.abbreviation}</span></div>}
        </Card>
        <Card>
          <div className="mb-4 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#00d8ff]" />Player B</div>
          <PlayerSearch onSelect={setB} />
          {b && <div className="mt-4 text-lg font-semibold"><Link to={`/players/${b.id}`} state={{ player: b }} className="hover:underline">{fullName(b)}</Link> <span className="text-white/50 font-normal text-sm">{b.team?.abbreviation}</span></div>}
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <h3 className="font-semibold mb-4">Comparison</h3>
          {!a || !b ? (
            <div className="text-white/60">Pick two players to compare.</div>
          ) : loading ? (
            <LoadingSkeleton className="h-80" />
          ) : error ? (
            <div className="text-white/60">{errorMessage(error)}</div>
          ) : !avgA || !avgB ? (
            <div className="text-white/60">
              No {seasonLabel(season)} averages for {[!avgA && fullName(a), !avgB && fullName(b)].filter(Boolean).join(' or ')} yet.
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <RadarCompare
                keys={STATS.map(s => s.label)}
                dataA={STATS.map(s => toScale(avgA[s.key], s.scale))}
                dataB={STATS.map(s => toScale(avgB[s.key], s.scale))}
                nameA={fullName(a)}
                nameB={fullName(b)}
              />
              <StatTable a={avgA} b={avgB} />
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function toScale(value, scale) {
  return value == null ? 0 : Math.min(100, Math.round((value / scale) * 100))
}

function StatTable({ a, b }){
  const rows = [
    { label: 'Games', key: 'gp', fmt: v => v },
    { label: 'MIN', key: 'min', fmt: v => Number(v).toFixed(1) },
    ...STATS.map(s => ({ ...s, fmt: v => Number(v).toFixed(1) })),
    ...PCT_STATS.map(s => ({ ...s, fmt: v => `${(Number(v) * 100).toFixed(1)}%` })),
  ].filter(r => a[r.key] != null || b[r.key] != null)

  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(r => {
          const va = a[r.key], vb = b[r.key]
          const compare = r.key !== 'gp' && r.key !== 'min' && va != null && vb != null
          return (
            <tr key={r.key} className="border-t border-white/5 first:border-0">
              <td className={`py-2 text-right tabular-nums ${compare && va > vb ? 'font-semibold text-[#a08cff]' : ''}`}>{va != null ? r.fmt(va) : '—'}</td>
              <td className="py-2 text-center text-xs text-white/50 w-20">{r.label}</td>
              <td className={`py-2 tabular-nums ${compare && vb > va ? 'font-semibold text-[#00d8ff]' : ''}`}>{vb != null ? r.fmt(vb) : '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
