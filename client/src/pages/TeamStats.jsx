import React, { useState } from 'react'
import Card from '../components/Card'
import { useTeams } from '../hooks/useTeams'
import { getTeamUpcoming, errorMessage } from '../services/api'
import LoadingSkeleton from '../components/LoadingSkeleton'

export default function TeamStats(){
  const { data: teamsRes, loading } = useTeams()
  const teams = teamsRes && teamsRes.data ? teamsRes.data : []
  const [filter, setFilter] = useState('')
  const [events, setEvents] = useState(null)
  const [eventsError, setEventsError] = useState(null)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [loadingEvents, setLoadingEvents] = useState(false)

  const filtered = teams.filter(t => `${t.full_name} ${t.abbreviation}`.toLowerCase().includes(filter.toLowerCase()))

  const loadNext = async (team) => {
    setSelectedTeam(team)
    setLoadingEvents(true); setEventsError(null); setEvents(null)
    try {
      const res = await getTeamUpcoming(team.id)
      setEvents(res.data || [])
    } catch (e) {
      setEventsError(errorMessage(e, 'Could not load upcoming games.'))
    } finally { setLoadingEvents(false) }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-3xl font-bold">Team Statistics</h1>
        <input placeholder="Filter teams" value={filter} onChange={(e)=>setFilter(e.target.value)} className="w-full sm:w-64 px-3 py-2 rounded-md bg-white/5 border border-white/10 outline-none focus:border-accent/60 placeholder:text-white/40" />
      </div>

      {loading ? <LoadingSkeleton className="h-40" /> : (
        <div className="grid md:grid-cols-3 gap-6">
          {filtered.map(t => (
            <Card key={t.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{t.full_name}</div>
                  <div className="text-xs text-white/70">{t.abbreviation}</div>
                </div>
                <div>
                  <button onClick={()=>loadNext(t)} className="px-3 py-1 bg-white/10 rounded-md">Next</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Card>
          <h3 className="font-semibold">Upcoming Games{selectedTeam ? ` — ${selectedTeam.full_name}` : ''}</h3>
          {loadingEvents && <LoadingSkeleton className="h-32 mt-4" />}
          {!loadingEvents && eventsError && <div className="text-white/60 mt-2">{eventsError}</div>}
          {!loadingEvents && !eventsError && events && events.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              {events.map(g => (
                <li key={g.id}>{formatGameDate(g)} — {g.visitor_team.full_name} @ {g.home_team.full_name}</li>
              ))}
            </ul>
          )}
          {!loadingEvents && !eventsError && events && events.length === 0 && <div className="text-white/60 mt-2">No games in the next 30 days.</div>}
          {!loadingEvents && !eventsError && !events && <div className="text-white/60 mt-2">Click "Next" on a team to see its upcoming games.</div>}
        </Card>
      </div>
    </div>
  )
}

function formatGameDate(g) {
  const d = new Date(g.datetime || `${g.date}T12:00:00`)
  const opts = g.datetime
    ? { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { weekday: 'short', month: 'short', day: 'numeric' }
  return d.toLocaleString(undefined, opts)
}
