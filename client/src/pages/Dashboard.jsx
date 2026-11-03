import React from 'react'
import Card from '../components/Card'
import { useTeams, useRecentGames, useLiveScores } from '../hooks/useTeams'
import LoadingSkeleton from '../components/LoadingSkeleton'
import TopScorers from '../components/TopScorers'
import Leaderboard from '../components/Leaderboard'

export default function Dashboard(){
  const { data: teams, loading: teamsLoading } = useTeams()
  const { data: recent, loading: recentLoading } = useRecentGames()
  const { data: live, loading: liveLoading, error: liveError } = useLiveScores()

  

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
      <aside className="lg:col-span-1">
        <Card className="sticky top-24">
          <h3 className="font-semibold">Navigation</h3>
          <div className="mt-4 text-sm text-white/70">Dashboard links and filters</div>
        </Card>
        <div className="mt-6">
          <Card>
            <h4 className="font-semibold mb-2">Today's Games</h4>
            {liveLoading && <LoadingSkeleton className="h-16" />}
            {!liveLoading && liveError && <div className="text-sm text-white/60">Scores unavailable right now.</div>}
            {!liveLoading && live?.data?.length === 0 && <div className="text-sm text-white/60">No games today.</div>}
            {!liveLoading && live?.data?.length > 0 && (
              <ul className="space-y-3 text-sm">
                {live.data.map(g => (
                  <li key={g.id}>
                    <div className="flex justify-between"><span>{g.away.abbreviation}</span><span className="font-semibold">{g.state !== 'pre' ? g.away.score : ''}</span></div>
                    <div className="flex justify-between"><span>{g.home.abbreviation}</span><span className="font-semibold">{g.state !== 'pre' ? g.home.score : ''}</span></div>
                    <div className={`text-xs ${g.state === 'in' ? 'text-red-400' : 'text-white/50'}`}>{g.status}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </aside>

      <section className="lg:col-span-3">
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <TopScorers />
          </Card>
          <Card>
            <Leaderboard />
          </Card>
          <Card>
            <h3 className="font-semibold">Team Rankings</h3>
            {teamsLoading ? <LoadingSkeleton className="h-36" /> : (
              <ul className="space-y-2 text-sm text-white/70">
                {teams && teams.data && teams.data.slice(0,6).map(t => (
                  <li key={t.id}>{t.full_name} — {t.abbreviation}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <h3 className="font-semibold">Standings</h3>
            <div className="text-sm text-white/70 mt-2">Conference standings and rankings will appear here.</div>
          </Card>
          <Card>
            <h3 className="font-semibold">Trending Players</h3>
            {recentLoading ? <LoadingSkeleton className="h-36" /> : (
              <ul className="text-sm text-white/70 space-y-2">
                {recent && recent.data && recent.data.slice(0,5).map(g => (
                  <li key={g.id}>{g.home_team_score} - {g.visitor_team_score} ({g.status})</li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h3 className="font-semibold">Recent Games</h3>
            {recentLoading ? <LoadingSkeleton className="h-36" /> : (
              <ul className="text-sm text-white/70 space-y-2">
                {recent && recent.data && recent.data.slice(0,6).map(g => (
                  <li key={g.id}>{g.date} — {g.home_team.full_name} vs {g.visitor_team.full_name}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>
    </div>
  )
}
