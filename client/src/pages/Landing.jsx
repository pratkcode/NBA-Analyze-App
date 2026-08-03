import React from 'react'
import Hero from '../components/Hero'
import Card from '../components/Card'

export default function Landing(){
  return (
    <div className="max-w-7xl mx-auto">
      <Hero />
      <section id="features" className="grid md:grid-cols-3 gap-6">
        <Card>
          <h3 className="text-xl font-semibold">Deep Player Insights</h3>
          <p className="text-sm text-white/70">Advanced metrics and visualizations for every player.</p>
        </Card>
        <Card>
          <h3 className="text-xl font-semibold">Team Trends</h3>
          <p className="text-sm text-white/70">Analyze team form, strengths, and matchups.</p>
        </Card>
        <Card>
          <h3 className="text-xl font-semibold">Live Widgets</h3>
          <p className="text-sm text-white/70">Plug-and-play live scores and highlights.</p>
        </Card>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Featured Analytics</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>Chart placeholder</Card>
          <Card>Standings placeholder</Card>
          <Card>Trending players placeholder</Card>
        </div>
      </section>
    </div>
  )
}
