import React, { useState } from 'react'
import Card from '../components/Card'
import { useTeams } from '../hooks/useTeams'
import { getSportsdbNextEvents } from '../services/api'
import LoadingSkeleton from '../components/LoadingSkeleton'

export default function TeamStats(){
  const { data: teamsRes, loading } = useTeams()
  const teams = teamsRes && teamsRes.data ? teamsRes.data : []
  const [filter, setFilter] = useState('')
  const [events, setEvents] = useState(null)
  const [loadingEvents, setLoadingEvents] = useState(false)

  const filtered = teams.filter(t => `${t.full_name} ${t.abbreviation}`.toLowerCase().includes(filter.toLowerCase()))

  const loadNext = async (teamId) => {
    setLoadingEvents(true)
    try {
      const res = await getSportsdbNextEvents(teamId)
      setEvents(res)
    } catch (e) {
      setEvents(null)
    } finally { setLoadingEvents(false) }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Team Statistics</h1>
        <input placeholder="Filter teams" value={filter} onChange={(e)=>setFilter(e.target.value)} className="px-3 py-2 rounded-md bg-white/6" />
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
                  <button onClick={()=>loadNext(t.id)} className="px-3 py-1 bg-white/6 rounded-md">Next</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Card>
          <h3 className="font-semibold">Upcoming Events</h3>
          {loadingEvents && <LoadingSkeleton className="h-32" />}
          {!loadingEvents && events && events.events && events.events.length ? (
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              {events.events.map(ev => (
                <li key={ev.idEvent}>{ev.dateEvent} — {ev.strEvent}</li>
              ))}
            </ul>
          ) : <div className="text-white/60 mt-2">Select a team and click "Next" to load upcoming events.</div>}
        </Card>
      </div>
    </div>
  )
}
