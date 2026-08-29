import { Suspense, useState } from 'react'
import { Room } from './components/scene/Room'
import { DetailOverlay } from './components/overlay/DetailOverlay'
import { Dock } from './components/dock/Dock'
import { profile } from './data/profile'
import type { SectionId } from './data/menu'
import './App.css'

function App() {
  const [section, setSection] = useState<SectionId | null>(null)

  return (
    <div className="app">
      <Suspense fallback={<div className="loading-screen">Setting up the desk…</div>}>
        <Room onSelectSection={setSection} />
      </Suspense>
      <Dock />
      <DetailOverlay section={section} onClose={() => setSection(null)} />
    </div>
  )
}

export default App
