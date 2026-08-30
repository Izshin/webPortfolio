import { Suspense, useEffect, useRef, useState } from 'react'
import { Room, CAMERA_PAN_ORDER, type CameraPan, type FocusTarget } from './components/scene/Room'
import { MusicPlayer } from './components/music/MusicPlayer'
import { useMusicPlayer } from './components/music/useMusicPlayer'
import { LoadingScreen } from './components/LoadingScreen'
import { CameraPanControls } from './components/CameraPanControls'
import { useIsMobile } from './hooks/useIsMobile'
import { notePagesByLang, type NoteLang } from './data/notes'
import { asset } from './asset'
import './App.css'

// Below this, a touch is a tap/scroll attempt, not an intentional swipe.
const SWIPE_THRESHOLD = 48
const PAGE_TURN_SOUND = asset('/soundEffects/PageTurn.mp3')

// Mobile résumé zoom: pinch scales continuously between these, double-tap snaps to/from DOUBLE_TAP_ZOOM.
const MIN_ZOOM = 1
const MAX_ZOOM = 2.4
const DOUBLE_TAP_ZOOM = 1.8
const DOUBLE_TAP_MS = 320
const DOUBLE_TAP_DIST = 32

const touchDistance = (a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) =>
  Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)

function App() {
  const [focus, setFocus] = useState<FocusTarget | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [lang, setLang] = useState<NoteLang>('es')
  const [cameraPan, setCameraPan] = useState<CameraPan>('center')
  const [clipboardZoom, setClipboardZoom] = useState(1)
  const isMobile = useIsMobile()
  const player = useMusicPlayer()
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null)
  const pageTurnRef = useRef<HTMLAudioElement | null>(null)
  const appRef = useRef<HTMLDivElement | null>(null)
  // Read inside the native listeners below so they don't need to be torn down and
  // re-attached on every state change — only the ref assignment changes each render.
  const state = useRef({ focus, pageIndex, lang, cameraPan, clipboardZoom, isMobile })
  state.current = { focus, pageIndex, lang, cameraPan, clipboardZoom, isMobile }

  // Opening the boombox panel is usually the visitor's first tap/click on the page: start
  // playback right on that gesture instead of relying solely on the global unlock listener.
  const handleFocus = (target: FocusTarget | null) => {
    setFocus(target)
    if (target === 'boombox') player.ensurePlaying()
  }

  const changePage = (index: number) => {
    if (!pageTurnRef.current) pageTurnRef.current = new Audio(PAGE_TURN_SOUND)
    pageTurnRef.current.currentTime = 0
    pageTurnRef.current.play().catch(() => {})
    setPageIndex(index)
  }

  // Zoom only makes sense while actually reading the résumé.
  useEffect(() => {
    if (focus !== 'clipboard') setClipboardZoom(1)
  }, [focus])

  // Native listeners in the capture phase on the root div itself: a swipe usually starts
  // over a DOM overlay (the music player panel, the mobile pan pill), and attaching only
  // as React's bubble-phase onTouch* props meant any of those swallowing the touch first
  // (or just being a scrollable/interactive element) could eat the gesture before it got
  // here — capture always sees it first, regardless of what's underneath the finger.
  useEffect(() => {
    const el = appRef.current
    if (!el) return

    const onStart = (e: TouchEvent) => {
      const { focus, clipboardZoom } = state.current
      if (e.touches.length === 2 && focus === 'clipboard') {
        touchStart.current = null
        pinch.current = { dist: touchDistance(e.touches[0], e.touches[1]), zoom: clipboardZoom }
        return
      }
      if (!state.current.isMobile) return
      const t = e.touches[0]
      touchStart.current = { x: t.clientX, y: t.clientY }

      if (focus === 'clipboard') {
        const now = performance.now()
        const last = lastTap.current
        lastTap.current = { time: now, x: t.clientX, y: t.clientY }
        if (last && now - last.time < DOUBLE_TAP_MS && Math.hypot(t.clientX - last.x, t.clientY - last.y) < DOUBLE_TAP_DIST) {
          lastTap.current = null
          touchStart.current = null
          setClipboardZoom((z) => (z > 1 ? 1 : DOUBLE_TAP_ZOOM))
        }
      }
    }

    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinch.current || state.current.focus !== 'clipboard') return
      const scale = touchDistance(e.touches[0], e.touches[1]) / pinch.current.dist
      setClipboardZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinch.current.zoom * scale)))
    }

    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch.current = null
      const start = touchStart.current
      touchStart.current = null
      if (!start) return
      const t = e.changedTouches[0]
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return
      const { focus, pageIndex, lang, cameraPan } = state.current
      // While reading the résumé, swipe turns pages instead of panning — left goes forward,
      // right goes back, and backing up past the first page exits (same as the in-page arrow).
      if (focus === 'clipboard') {
        const total = notePagesByLang[lang].length
        if (dx < 0) {
          if (pageIndex < total - 1) changePage(pageIndex + 1)
        } else if (pageIndex > 0) {
          changePage(pageIndex - 1)
        } else {
          setFocus(null)
        }
        return
      }
      // While focused on any other prop, a look-around pan makes no sense — swiping right
      // instead backs out of it, same as clicking the background.
      if (focus !== null) {
        if (dx > 0) setFocus(null)
        return
      }
      const dir = dx < 0 ? 1 : -1
      const next = CAMERA_PAN_ORDER[CAMERA_PAN_ORDER.indexOf(cameraPan) + dir]
      if (next) setCameraPan(next)
    }

    el.addEventListener('touchstart', onStart, { capture: true, passive: true })
    el.addEventListener('touchmove', onMove, { capture: true, passive: true })
    el.addEventListener('touchend', onEnd, { capture: true, passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart, { capture: true })
      el.removeEventListener('touchmove', onMove, { capture: true })
      el.removeEventListener('touchend', onEnd, { capture: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="app" ref={appRef}>
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
          clipboardZoom={clipboardZoom}
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
