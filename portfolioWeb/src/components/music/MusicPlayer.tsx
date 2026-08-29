import { useState, type CSSProperties, type PointerEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Pause, Play, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react'
import type { MusicPlayer as Player } from './useMusicPlayer'

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Resting pose: dead-on, the looping idle sway supplies the depth cue instead. */
const REST_TILT = { rx: 0, ry: 0 }

/** The panel leans back a touch so its bottom edge stays visible. */
const PANEL_REST = { rx: 4, ry: 0 }

export function MusicPlayer({
  open,
  player,
  onClose,
}: {
  open: boolean
  player: Player
  onClose: () => void
}) {
  const { track, playing, progress, duration, volume, muted, shuffle, repeat } = player
  const [tilt, setTilt] = useState(REST_TILT)
  const [panelTilt, setPanelTilt] = useState(PANEL_REST)
  // While dragging the scrubber the local value wins, otherwise `timeupdate` fights the thumb.
  const [scrub, setScrub] = useState<number | null>(null)
  const scrubValue = scrub ?? progress

  const commitScrub = () => {
    if (scrub === null) return
    player.seek(scrub)
    setScrub(null)
  }

  const trackTilt = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const nx = (e.clientX - box.left) / box.width - 0.5
    const ny = (e.clientY - box.top) / box.height - 0.5
    setTilt({ rx: -ny * 26, ry: nx * 34 })
  }

  const trackPanelTilt = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const nx = (e.clientX - box.left) / box.width - 0.5
    const ny = (e.clientY - box.top) / box.height - 0.5
    setPanelTilt({ rx: PANEL_REST.rx - ny * 4, ry: nx * 6 })
  }

  return (
    <div className="glass-player-anchor">
      <AnimatePresence>
        {open && (
          <motion.div
            className="glass-player-slab"
            style={{ transformOrigin: 'bottom center' }}
            initial={{ opacity: 0, scaleY: 0.08, scaleX: 0.72, y: 46, rotateX: 64, rotateY: 0 }}
            animate={{ opacity: 1, scaleY: 1, scaleX: 1, y: 0, rotateX: panelTilt.rx, rotateY: panelTilt.ry }}
            exit={{ opacity: 0, scaleY: 0.08, scaleX: 0.72, y: 46, rotateX: 64, rotateY: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            onPointerMove={trackPanelTilt}
            onPointerLeave={() => setPanelTilt(PANEL_REST)}
          >
            <div className="glass-player__side glass-player__side--right" />
            <div className="glass-player__side glass-player__side--left" />
            <div className="glass-player__side glass-player__side--top" />
            <div className="glass-player__side glass-player__side--bottom" />

            <div className="glass-player">
              <div className="glass-player__sheen" aria-hidden />

              <button type="button" className="glass-player__close" onClick={onClose} aria-label="Close player">
                <X size={16} />
              </button>

              <div className="glass-player__meta">
                <span className="glass-player__title">{track.title}</span>
                <span className="glass-player__artist">{track.artist}</span>
              </div>

              <div
                className="glass-player__art"
                onPointerMove={trackTilt}
                onPointerLeave={() => setTilt(REST_TILT)}
              >
                <div className="glass-player__art-idle">
                  <div
                    className="glass-player__art-box"
                    style={{ '--rx': `${tilt.rx}deg`, '--ry': `${tilt.ry}deg` } as CSSProperties}
                  >
                    <img className="glass-player__art-front" src={track.thumbnail} alt="" draggable={false} />
                    <div className="glass-player__art-edge glass-player__art-edge--right" />
                    <div className="glass-player__art-edge glass-player__art-edge--left" />
                    <div className="glass-player__art-edge glass-player__art-edge--top" />
                    <div className="glass-player__art-edge glass-player__art-edge--bottom" />
                    <div className="glass-player__art-gloss" />
                  </div>
                </div>
              </div>

              <div className="glass-player__scrub">
                <span>{formatTime(scrubValue)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={scrubValue}
                  onChange={(e) => setScrub(Number(e.target.value))}
                  onPointerUp={commitScrub}
                  onPointerCancel={commitScrub}
                  onKeyUp={commitScrub}
                  onBlur={commitScrub}
                  aria-label="Seek"
                />
                <span>{formatTime(duration)}</span>
              </div>

              <div className="glass-player__controls">
                <button
                  type="button"
                  className={`glass-player__mode${shuffle ? ' is-active' : ''}`}
                  onClick={player.toggleShuffle}
                  aria-pressed={shuffle}
                  aria-label={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
                  title={shuffle ? 'Shuffle on' : 'Shuffle off'}
                >
                  <Shuffle size={16} />
                </button>
                <button type="button" onClick={player.previous} aria-label="Previous track">
                  <SkipBack size={18} />
                </button>
                <button
                  type="button"
                  className="glass-player__play"
                  onClick={player.toggle}
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? <Pause size={22} /> : <Play size={22} />}
                </button>
                <button type="button" onClick={player.next} aria-label="Next track">
                  <SkipForward size={18} />
                </button>
                <button
                  type="button"
                  className={`glass-player__mode${repeat ? ' is-active' : ''}`}
                  onClick={player.toggleRepeat}
                  aria-pressed={repeat}
                  aria-label={repeat ? 'Disable repeat' : 'Repeat this track'}
                  title={repeat ? 'Repeat on' : 'Repeat off'}
                >
                  <Repeat1 size={16} />
                </button>
              </div>

              <div className="glass-player__volume">
                <button type="button" onClick={player.toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
                  {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={(e) => player.setVolume(Number(e.target.value))}
                  aria-label="Volume"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
