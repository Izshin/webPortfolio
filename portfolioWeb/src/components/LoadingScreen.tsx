import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'

/** Matches the .loading-screen fade-out in App.css. */
const FADE_MS = 800

/**
 * Covers the scene until three's loading manager goes quiet. `active` briefly drops
 * between sequential loaders (mtl → obj → textures), so the exit waits a beat and is
 * cancelled if more work comes in. `backgroundReady` gates the exit further: on slow
 * machines the Greek environment (OBJ+MTL, retried on failure — see RetryOnError) can
 * still be loading/retrying after the generic progress tracker goes quiet, so without
 * this the screen could fade out before that background ever appears.
 */
export function LoadingScreen({ backgroundReady = true }: { backgroundReady?: boolean }) {
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
    if (!started.current || !backgroundReady) return
    const timer = setTimeout(() => setFading(true), 700)
    return () => clearTimeout(timer)
  }, [active, backgroundReady])

  // Safety net: if something never settles (stuck `active`/backgroundReady), don't leave
  // the screen stuck forever once loading has visibly finished.
  useEffect(() => {
    if (progress < 100) return
    const timer = setTimeout(() => setFading(true), 10000)
    return () => clearTimeout(timer)
  }, [progress])

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
