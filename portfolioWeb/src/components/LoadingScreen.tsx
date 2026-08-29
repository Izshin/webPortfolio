import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'

/** Matches the .loading-screen fade-out in App.css. */
const FADE_MS = 800

/**
 * Covers the scene until three's loading manager goes quiet. `active` briefly drops
 * between sequential loaders (mtl → obj → textures), so the exit waits a beat and is
 * cancelled if more work comes in.
 */
export function LoadingScreen() {
  const { active, progress, loaded, total } = useProgress()
  const started = useRef(false)
  const [fading, setFading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (active) {
      started.current = true
      setFading(false)
      return
    }
    if (!started.current) return
    const timer = setTimeout(() => setFading(true), 700)
    return () => clearTimeout(timer)
  }, [active])

  useEffect(() => {
    if (!fading) return
    const timer = setTimeout(() => setDone(true), FADE_MS)
    return () => clearTimeout(timer)
  }, [fading])

  if (done) return null

  return (
    <div
      className={`loading-screen${fading ? ' is-hidden' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="loading-screen__inner">
        <div className="loading-screen__spinner" />
        <p className="loading-screen__title">Setting up the desk…</p>
        <div className="loading-screen__bar">
          <div className="loading-screen__fill" style={{ width: `${Math.round(progress)}%` }} />
        </div>
        <p className="loading-screen__meta">
          {Math.round(progress)}% · {loaded}/{total || '…'} files
        </p>
      </div>
    </div>
  )
}
