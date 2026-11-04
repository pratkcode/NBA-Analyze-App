import React from 'react'

// Catches a crash in part of the page so the rest keeps working.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Section failed to render:', error, info?.componentStack)
  }

  componentDidUpdate(prev) {
    // Try again when the content changes (e.g. navigating to another page).
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return this.props.fallback ?? (
      <div className="text-sm text-white/60">
        This section couldn't be displayed.{' '}
        <button onClick={() => this.setState({ error: null })} className="underline hover:text-white">Try again</button>
      </div>
    )
  }
}
