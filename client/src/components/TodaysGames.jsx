import React from 'react'
import { Link } from 'react-router-dom'
import { useScoreboard } from '../hooks/useTeams'
import LoadingSkeleton from './LoadingSkeleton'
import ErrorState from './ErrorState'
import { longDate } from '../utils/format'

// Today's scoreboard from NBA.com. If there are no games today, shows the next game day.
// `compact` is the narrow sidebar version.
export default function TodaysGames({ compact = false, max }){
  const { data, loading, error, reload } = useScoreboard()
  const games = (data?.games || []).slice(0, max)

  if (loading) return <LoadingSkeleton className={compact ? 'h-16' : 'h-56'} />
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (data && games.length === 0) return <div className="text-sm text-white/60">No games scheduled.</div>

  return (
    <>
    {data && !data.is_today && <div className="text-xs text-white/50 mb-2">No games today · Next: {longDate(data.date)}</div>}
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
    </>
  )
}

function TeamRow({ team, showScore, winner, logo }){
  return (
    <div className={`flex justify-between items-center ${winner ? 'font-semibold' : ''}`}>
      <span className="flex items-center gap-2">
        {logo && team.logo && <img src={team.logo} alt="" className="w-5 h-5" loading="lazy" />}
        <Link to={`/teams/${team.id}`} className="hover:text-accent transition-colors">{logo ? team.name : team.abbreviation}</Link>
      </span>
      <span className="font-semibold tabular-nums">{showScore ? team.score : ''}</span>
    </div>
  )
}
