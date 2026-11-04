import React from 'react'
import { errorMessage } from '../services/api'

// Inline error with an optional "Try again" button.
export default function ErrorState({ error, onRetry, message, className = '' }){
  return (
    <div className={`flex flex-wrap items-center gap-3 text-sm text-white/60 ${className}`}>
      <span>{message || errorMessage(error)}</span>
      {onRetry && (
        <button onClick={onRetry} className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/15 text-white/80 transition-colors">Try again</button>
      )}
    </div>
  )
}
