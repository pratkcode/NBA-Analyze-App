import React from 'react'
import Card from '../components/Card'
import { useRecentGames } from '../hooks/useTeams'
import { Link } from 'react-router-dom'
import ErrorState from '../components/ErrorState'
import { shortDate } from '../utils/format'
import LoadingSkeleton from '../components/LoadingSkeleton'
import TopScorers from '../components/TopScorers'
import Leaderboard from '../components/Leaderboard'
import TodaysGames from '../components/TodaysGames'
import Standings from '../components/Standings'

export default function Dashboard(){
  const { data: recent, loading: recentLoading, error: recentError, reload: reloadRecent } = useRecentGames(10)
  const games = recent?.games || []

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
      <aside className="lg:col-span-1">
        <Card className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <h3 className="font-semibold mb-3">Today's Games</h3>
          <TodaysGames compact />
        </Card>
      </aside>

      <section className="lg:col-span-3 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold mb-3">Standings</h3>
            <Standings max={10} />
          </Card>
          <Card>
            <h3 className="font-semibold mb-3">Recent Results</h3>
            {recentLoading && <LoadingSkeleton className="h-36" />}
            {recentError && <ErrorState error={recentError} onRetry={reloadRecent} />}
            {recent && games.length === 0 && <div className="text-sm text-white/60">No games played yet this season.</div>}
            {games.length > 0 && (
              <ul className="text-sm space-y-2">
                {games.map(g => (
                  <li key={g.game_id} className="flex items-center justify-between gap-3 border-t border-white/5 pt-2 first:border-0 first:pt-0">
                    <span className="text-xs text-white/50 w-14 shrink-0">{shortDate(g.date)}</span>
                    <span className="flex-1 tabular-nums">
                      <ScoreTeam team={g.away} />
                      <span className="text-white/40"> @ </span>
                      <ScoreTeam team={g.home} />
                    </span>
                    <span className="text-xs text-white/50">Final</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card><TopScorers /></Card>
          <Card><Leaderboard /></Card>
        </div>
      </section>
    </div>
  )
}

function ScoreTeam({ team }){
  return (
    <Link to={`/teams/${team.id}`} className={`hover:text-accent transition-colors ${team.won ? 'font-semibold' : 'text-white/60'}`}>
      {team.abbreviation} {team.score}
    </Link>
  )
}
