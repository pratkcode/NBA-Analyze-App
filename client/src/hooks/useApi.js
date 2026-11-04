import { useCallback, useEffect, useRef, useState } from 'react'

// Loads data with `fetcher()` whenever `deps` change.
// Returns { data, loading, error, reload }. Pass enabled=false to skip loading.
export function useApi(fetcher, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: null })
  const [nonce, setNonce] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    if (!enabled) { setState({ data: null, loading: false, error: null }); return }
    let cancelled = false
    setState({ data: null, loading: true, error: null })
    fetcherRef.current()
      .then(data => {
        // The server marks data as stale when NBA.com was unreachable and a saved copy was used.
        if (data?.stale) window.dispatchEvent(new Event('nba-data-stale'))
        if (!cancelled) setState({ data, loading: false, error: null })
      })
      .catch(error => { if (!cancelled) setState({ data: null, loading: false, error }) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, nonce])

  const reload = useCallback(() => setNonce(n => n + 1), [])
  return { ...state, reload }
}
