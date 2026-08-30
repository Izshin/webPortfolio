import { Suspense, useRef, useState, type TouchEvent } from 'react'
import { Room, CAMERA_PAN_ORDER, type CameraPan, type FocusTarget } from './components/scene/Room'
import { MusicPlayer } from './components/music/MusicPlayer'
import { useMusicPlayer } from './components/music/useMusicPlayer'
import { LoadingScreen } from './components/LoadingScreen'
import { CameraPanControls } from './components/CameraPanControls'
import { useIsMobile } from './hooks/useIsMobile'
import type { NoteLang } from './data/notes'
import './App.css'

// Below this, a touch is a tap/scroll attempt, not an intentional swipe.
const SWIPE_THRESHOLD = 48

function App() {
  const [focus, setFocus] = useState<FocusTarget | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [lang, setLang] = useState<NoteLang>('es')
  const [cameraPan, setCameraPan] = useState<CameraPan>('center')
  const isMobile = useIsMobile()
  const player = useMusicPlayer()
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  // Opening the boombox panel is usually the visitor's first tap/click on the page: start
  // playback right on that gesture instead of relying solely on the global unlock listener.
  const handleFocus = (target: FocusTarget | null) => {
    setFocus(target)
    if (target === 'boombox') player.ensurePlaying()
  }

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (!isMobile || focus !== null) return
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return
    const dir = dx < 0 ? 1 : -1
    const next = CAMERA_PAN_ORDER[CAMERA_PAN_ORDER.indexOf(cameraPan) + dir]
    if (next) setCameraPan(next)
  }

  return (
    <div className="app" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <Suspense fallback={null}>
        <Room
          focus={focus}
          onFocus={handleFocus}
          onBackgroundClick={() => setFocus(null)}
          musicPlaying={player.playing}
          musicLevels={player.getLevels}
          pageIndex={pageIndex}
          onPageChange={setPageIndex}
          lang={lang}
          onLangChange={setLang}
          cameraPan={isMobile ? cameraPan : 'center'}
        />
      </Suspense>
      <LoadingScreen />
      {isMobile && (
        <CameraPanControls view={cameraPan} onChange={setCameraPan} disabled={focus !== null} />
      )}
      <MusicPlayer open={focus === 'boombox'} player={player} onClose={() => setFocus(null)} />
    </div>
  )
}

export default App
