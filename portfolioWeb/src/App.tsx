import { Suspense, useState } from 'react'
import { Room, type FocusTarget } from './components/scene/Room'
import { DetailOverlay } from './components/overlay/DetailOverlay'
import { Dock } from './components/dock/Dock'
import { MusicPlayer } from './components/music/MusicPlayer'
import { useMusicPlayer } from './components/music/useMusicPlayer'
import type { SectionId } from './data/menu'
import './App.css'

function App() {
  const [section, setSection] = useState<SectionId | null>(null)
  const [focus, setFocus] = useState<FocusTarget | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const player = useMusicPlayer()

  return (
    <div className="app">
      <Suspense fallback={<div className="loading-screen">Setting up the desk…</div>}>
        <Room
          onSelectSection={setSection}
          focus={focus}
          onFocus={setFocus}
          onBackgroundClick={() => setFocus(null)}
          musicPlaying={player.playing}
          musicLevel={player.getLevel}
          pageIndex={pageIndex}
          onPageChange={setPageIndex}
        />
      </Suspense>
      <Dock />
      <MusicPlayer open={focus === 'boombox'} player={player} onClose={() => setFocus(null)} />
      <DetailOverlay section={section} onClose={() => setSection(null)} />
    </div>
  )
}

export default App
