import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Hide images that fail to load (e.g. a missing player photo) instead of showing a broken icon.
document.addEventListener('error', e => {
  if (e.target instanceof HTMLImageElement) e.target.style.visibility = 'hidden'
}, true)

const root = createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
