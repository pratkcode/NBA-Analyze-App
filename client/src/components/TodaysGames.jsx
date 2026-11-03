import React from 'react'
import { useLiveScores } from '../hooks/useTeams'
import LoadingSkeleton from './LoadingSkeleton'

// Today's scoreboard (ESPN). `compact` is the narrow sidebar version.
export default function TodaysGames({ compact = false, max }){
  const { data, loading, error } = useLiveScores()
  const games = (data?.data || []).slice(0, max)

  if (loading) return <LoadingSkeleton className={compact ? 'h-16' : 'h-56'} />
  if (error) return <div className="text-sm text-white/60">Scores unavailable right now.</div>
  if (data && games.length === 0) return <div className="text-sm text-white/60">No games today.</div>

  return (
    <ul className={compact ? 'space-y-3 text-sm' : 'grid sm:grid-cols-2 gap-3 text-sm'}>
      {games.map(g => (
        <li key={g.id} className={compact ? '' : 'rounded-lg bg-white/5 p-3'}>
          <TeamRow team={g.away} showScore={g.state !== 'pre'} winner={g.state === 'post' && g.away.score > g.home.score} logo={!compact} />
          <TeamRow team={g.home} showScore={g.state !== 'pre'} winner={g.state === 'post' && g.home.score > g.away.score} logo={!compact} />
          <div className={`mt-1 text-xs ${g.state === 'in' ? 'text-red-400' : 'text-white/50'}`}>
            {g.state === 'in' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5 align-middle animate-pulse" />}
            {g.status}
          </div>
        </li>
      ))}
    </ul>
  )
}

function TeamRow({ team, showScore, winner, logo }){
  return (
    <div className={`flex justify-between items-center ${winner ? 'font-semibold' : ''}`}>
      <span className="flex items-center gap-2">
        {logo && team.logo && <img src={team.logo} alt="" className="w-5 h-5" loading="lazy" />}
        {logo ? team.name : team.abbreviation}
      </span>
      <span className="font-semibold tabular-nums">{showScore ? team.score : ''}</span>
    </div>
  )
}
