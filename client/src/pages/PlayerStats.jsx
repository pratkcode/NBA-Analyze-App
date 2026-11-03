import React from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import Card from '../components/Card'
import PlayerSearch from '../components/PlayerSearch'
import { usePlayer, useSeasonAverages, usePlayerGameLog } from '../hooks/usePlayers'
import LoadingSkeleton from '../components/LoadingSkeleton'
import SimpleLineChart from '../components/charts/SimpleLineChart'
import { currentSeason, seasonLabel } from '../utils/season'
import { errorMessage } from '../services/api'

const AVG_STATS = [
  { key: 'pts', label: 'PPG' },
  { key: 'reb', label: 'RPG' },
  { key: 'ast', label: 'APG' },
  { key: 'stl', label: 'SPG' },
  { key: 'blk', label: 'BPG' },
  { key: 'fg_pct', label: 'FG%', pct: true },
  { key: 'fg3_pct', label: '3P%', pct: true },
  { key: 'ft_pct', label: 'FT%', pct: true },
]

export default function PlayerStats(){
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const season = currentSeason()
  // Coming from search or a leaderboard, the player is passed along so no extra request is needed.
  const { data: player, loading: playerLoading, error: playerError } = usePlayer(id, location.state?.player)
  const playerIds = player ? [player.id] : []
  const { data: avgs, loading: avgLoading, error: avgError } = useSeasonAverages(playerIds, season)
  const { data: games, loading: gamesLoading, error: gamesError } = usePlayerGameLog(player?.id, season)

  const openPlayer = p => navigate(`/players/${p.id}`, { state: { player: p } })

  const avg = avgs?.data?.[0]
  // Oldest → newest so the chart reads left to right.
  const trend = (games || []).slice().reverse().map(g => ({ name: formatShortDate(g.date), value: g.pts }))

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Player Statistics</h1>
        <PlayerSearch onSelect={openPlayer} />
      </div>

      {!id ? (
        <Card><div className="text-white/60">Search for a player to see their stats.</div></Card>
      ) : playerLoading ? (
        <LoadingSkeleton className="h-48" />
      ) : playerError || !player ? (
        <Card><div className="text-white/60">{playerError ? errorMessage(playerError, 'Could not load this player.') : 'Player not found.'}</div></Card>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <div>
                  <h3 className="text-2xl font-semibold">{player.first_name} {player.last_name}</h3>
                  <div className="text-sm text-white/70 mt-1">{player?.team?.full_name}</div>
                  <Link to={`/compare?a=${player.id}`} state={{ a: player }} className="inline-block mt-3 text-sm text-accent hover:underline">Compare with another player →</Link>
                  <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                    <Info label="Position" value={player?.position} />
                    <Info label="Jersey" value={player?.jersey_number && `#${player.jersey_number}`} />
                    <Info label="Height" value={player?.height} />
                    <Info label="Weight" value={player?.weight && `${player.weight} lb`} />
                    <Info label="College" value={player?.college} />
                    <Info label="Draft" value={player?.draft_year && `${player.draft_year} · Rd ${player.draft_round ?? '—'} · #${player.draft_number ?? '—'}`} />
                  </dl>
              </div>
            </Card>

            <Card className="md:col-span-2">
              <h3 className="font-semibold">Season Averages <span className="text-white/50 font-normal">{seasonLabel(season)}</span></h3>
              {avgLoading ? <LoadingSkeleton className="h-24 mt-3" /> : avg ? (
                <div className="mt-4 grid grid-cols-4 gap-4">
                  {AVG_STATS.map(s => (
                    <div key={s.key}>
                      <div className="text-2xl font-bold tabular-nums">{formatStat(avg[s.key], s.pct)}</div>
                      <div className="text-xs text-white/50">{s.label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-white/60 mt-2">{avgError ? errorMessage(avgError) : `No ${seasonLabel(season)} averages yet.`}</div>
              )}
            </Card>
          </div>

          <div className="mt-6">
            <Card>
              <h3 className="font-semibold mb-3">Last 10 Games</h3>
              {gamesLoading ? <LoadingSkeleton className="h-60" /> : gamesError ? (
                <div className="text-sm text-white/60">{errorMessage(gamesError)}</div>
              ) : !games || games.length === 0 ? (
                <div className="text-sm text-white/60">No games played this season yet.</div>
              ) : (
                <>
                  <div className="text-xs text-white/50 mb-1">Points per game</div>
                  <SimpleLineChart data={trend} />
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead>
                        <tr className="text-xs text-white/50 text-left">
                          {['Date', 'Opp', 'Result', 'MIN', 'PTS', 'REB', 'AST', 'FG', '3PT'].map(h => <th key={h} className="font-normal pb-2">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody className="tabular-nums">
                        {games.map(g => {
                          const won = g.team_score > g.opponent_score
                          return (
                            <tr key={g.game_id} className="border-t border-white/5">
                              <td className="py-1.5">{formatShortDate(g.date)}</td>
                              <td>{g.home ? 'vs' : '@'} {g.opponent}</td>
                              <td className={won ? 'text-emerald-400' : 'text-red-400'}>{won ? 'W' : 'L'} {g.team_score}-{g.opponent_score}</td>
                              <td>{g.min}</td>
                              <td className="font-semibold">{g.pts}</td>
                              <td>{g.reb}</td>
                              <td>{g.ast}</td>
                              <td>{g.fgm}-{g.fga}</td>
                              <td>{g.fg3m}-{g.fg3a}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function Info({ label, value }){
  return (
    <>
      <dt className="text-white/50">{label}</dt>
      <dd>{value || '—'}</dd>
    </>
  )
}

function formatStat(v, pct) {
  if (v == null) return '—'
  return pct ? `${(Number(v) * 100).toFixed(1)}%` : Number(v).toFixed(1)
}

function formatShortDate(date) {
  return new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
