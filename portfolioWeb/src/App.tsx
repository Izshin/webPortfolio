import { Suspense, useState } from 'react'
import { Room, type FocusTarget } from './components/scene/Room'
import { MusicPlayer } from './components/music/MusicPlayer'
import { useMusicPlayer } from './components/music/useMusicPlayer'
import { LoadingScreen } from './components/LoadingScreen'
import type { NoteLang } from './data/notes'
import './App.css'

function App() {
  const [focus, setFocus] = useState<FocusTarget | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [lang, setLang] = useState<NoteLang>('es')
  const [backgroundReady, setBackgroundReady] = useState(false)
  const player = useMusicPlayer()

  return (
    <div className="app">
      <Suspense fallback={null}>
        <Room
          focus={focus}
          onFocus={setFocus}
          onBackgroundClick={() => setFocus(null)}
          musicPlaying={player.playing}
          musicLevels={player.getLevels}
          pageIndex={pageIndex}
          onPageChange={setPageIndex}
          lang={lang}
          onLangChange={setLang}
          onBackgroundReady={() => setBackgroundReady(true)}
        />
      </Suspense>
      <LoadingScreen backgroundReady={backgroundReady} />
      <MusicPlayer open={focus === 'boombox'} player={player} onClose={() => setFocus(null)} />
    </div>
  )
}

export default App
