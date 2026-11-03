import React, { useState } from 'react'
import { useStandings } from '../hooks/useTeams'
import LoadingSkeleton from './LoadingSkeleton'

// Conference standings with an East/West toggle. `max` limits rows per conference.
export default function Standings({ max }){
  const { data, loading, error } = useStandings()
  const [conf, setConf] = useState(0)

  if (loading) return <LoadingSkeleton className="h-64" />
  if (error) return <div className="text-sm text-white/60">Standings unavailable right now.</div>
  if (!data || data.length === 0) return <div className="text-sm text-white/60">No standings yet.</div>

  const current = data[conf] || data[0]
  const teams = current.teams.slice(0, max)

  return (
    <div>
      <div className="flex gap-1 mb-3 text-xs">
        {data.map((c, i) => (
          <button
            key={c.name}
            onClick={() => setConf(i)}
            className={`px-3 py-1 rounded-md transition-colors ${i === conf ? 'bg-accent/80 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
          >
            {c.abbreviation || c.name}
          </button>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-white/50 text-left">
            <th className="font-normal pb-2 w-6">#</th>
            <th className="font-normal pb-2">Team</th>
            <th className="font-normal pb-2 text-right">W-L</th>
            <th className="font-normal pb-2 text-right">GB</th>
            <th className="font-normal pb-2 text-right">Strk</th>
          </tr>
        </thead>
        <tbody>
          {teams.map(t => (
            <tr key={t.abbreviation} className={`border-t border-white/5 ${t.seed === 6 || t.seed === 10 ? 'border-b border-b-white/20' : ''}`}>
              <td className="py-1.5 text-white/50 tabular-nums">{t.seed}</td>
              <td className="py-1.5">
                <span className="flex items-center gap-2">
                  {t.logo && <img src={t.logo} alt="" className="w-5 h-5" loading="lazy" />}
                  <span className="hidden sm:inline">{t.name}</span>
                  <span className="sm:hidden">{t.abbreviation}</span>
                </span>
              </td>
              <td className="py-1.5 text-right tabular-nums">{t.wins}-{t.losses}</td>
              <td className="py-1.5 text-right tabular-nums text-white/70">{t.games_behind}</td>
              <td className={`py-1.5 text-right tabular-nums ${t.streak?.startsWith('W') ? 'text-emerald-400' : 'text-red-400'}`}>{t.streak}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!max && <div className="mt-2 text-xs text-white/40">Lines mark playoff (top 6) and play-in (7–10) spots.</div>}
    </div>
  )
}
