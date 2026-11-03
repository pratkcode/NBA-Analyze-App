import React from 'react'
import { Link } from 'react-router-dom'
import Hero from '../components/Hero'
import Card from '../components/Card'
import Standings from '../components/Standings'

const FEATURES = [
  { to: '/players', title: 'Player Stats', text: 'Season averages, profile and the last 10 games for any player.' },
  { to: '/teams', title: 'Teams', text: 'Every NBA team and its upcoming schedule.' },
  { to: '/compare', title: 'Compare', text: 'Put two players side by side, stat by stat.' },
]

export default function Landing(){
  return (
    <div className="max-w-7xl mx-auto">
      <Hero />
      <section className="grid md:grid-cols-3 gap-6">
        {FEATURES.map(f => (
          <Link key={f.to} to={f.to} className="block group">
            <Card interactive className="h-full group-hover:border-accent/40">
              <h3 className="text-xl font-semibold">{f.title} <span className="text-accent transition-transform inline-block group-hover:translate-x-1">→</span></h3>
              <p className="text-sm text-white/70 mt-1">{f.text}</p>
            </Card>
          </Link>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Standings</h2>
        <Card>
          <Standings />
        </Card>
      </section>
    </div>
  )
}
