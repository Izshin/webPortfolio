import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, PerspectiveCamera, ContactShadows, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Desk } from './models/Desk'
import { Chair } from './models/Chair'
import { Bonsai } from './models/Bonsai'
import { PottedPlant } from './models/PottedPlant'
import { PenHolder } from './models/PenHolder'
import { ClipBoard } from './models/ClipBoard'
import { CameraRig } from './CameraRig'
import { Wall } from './Wall'
import { MenuCards } from '../menu/MenuCards'
import type { SectionId } from '../../data/menu'

export function Room({ onSelectSection }: { onSelectSection: (id: SectionId) => void }) {
  const controlsRef = useRef<OrbitControlsImpl>(null)

  // Dev helper: drop a camera reading in the console every time you stop orbiting/zooming.
  const logCamera = () => {
    const controls = controlsRef.current
    if (!controls) return
    const p = controls.object.position
    const t = controls.target
    const round = (n: number) => Math.round(n * 100) / 100
    console.log(
      `position={[${round(p.x)}, ${round(p.y)}, ${round(p.z)}]} target={[${round(t.x)}, ${round(t.y)}, ${round(t.z)}]}`,
    )
  }

  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }} performance={{ min: 0.85 }}>
      <PerspectiveCamera
        makeDefault
        position={[0.45, 1.28, 1]}
        fov={42}
        near={0.1}
        far={40}
        onUpdate={(cam) => cam.lookAt(-0.1, 0.55, -0.22)}
      />
      {/* <CameraRig basePosition={[0, 4.9, 2.5]} /> */}
      <OrbitControls ref={controlsRef} onEnd={logCamera} target={[-0.1, 0.55, -0.22]} />

      <color attach="background" args={['#efe0c4']} />
      <fog attach="fog" args={['#efe0c4', 7, 15]} />

      <ambientLight intensity={0.6} />
      <directionalLight
        castShadow
        position={[3, 5.5, 2.5]}
        intensity={1.7}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0005}
      />
      <pointLight position={[-3, 2.4, -1.5]} intensity={0.5} color="#ffd9a0" />
      <pointLight position={[2.5, 1.5, 2]} intensity={0.25} color="#bfe0ff" />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[9, 5]} />
        <meshStandardMaterial color="#b98a5e" roughness={0.95} />
      </mesh>

      <Wall position={[-0.4, 1.8, -2.6]} windowWidth={3} />

      <Suspense fallback={null}>
        <Desk/>
        <Chair position={[-0.3, 0, 0.5]} rotation={[0, Math.PI * 0.92, 0]} />
        <Bonsai position={[-0.62, 0.74, -0.42]} rotation={[0, 0.4, 0]} />
        <PottedPlant position={[-2.6, 0, -2.4]} rotation={[0, 0.6, 0]} />
        <PottedPlant position={[2.7, 0, -2.2]} height={1.05} rotation={[0, -0.5, 0]} />
        <PenHolder position={[0.58, 0.74, -0.36]} />
        <ClipBoard position={[0.08, 0.75, 0.1]} rotation={[0, 0.3, 0]} />
        <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={12} blur={2} far={4} />
        <Environment preset="apartment" environmentIntensity={0.4} />
      </Suspense>

      <Suspense fallback={null}>
        <MenuCards onSelect={onSelectSection} />
      </Suspense>
    </Canvas>
  )
}
