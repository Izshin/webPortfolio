import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, PerspectiveCamera, ContactShadows, OrbitControls } from '@react-three/drei'
import { Desk } from './models/Desk'
import { Chair } from './models/Chair'
import { Bonsai } from './models/Bonsai'
import { PottedPlant } from './models/PottedPlant'
import { PenHolder } from './models/PenHolder'
import { CameraRig } from './CameraRig'
import { MenuCards } from '../menu/MenuCards'
import type { SectionId } from '../../data/menu'

export function Room({ onSelectSection }: { onSelectSection: (id: SectionId) => void }) {
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
      <PerspectiveCamera
        makeDefault
        position={[0, 4.9, 2.5]}
        fov={42}
        near={0.1}
        far={40}
        onUpdate={(cam) => cam.lookAt(0, 0.6, -0.3)}
      />
      {/* <CameraRig basePosition={[0, 4.9, 2.5]} /> */}
      <OrbitControls />

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
        <planeGeometry args={[9, 9]} />
        <meshStandardMaterial color="#b98a5e" roughness={0.95} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 1.8, -2.6]}>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial color="#dbe6d6" roughness={1} />
      </mesh>

      <Suspense fallback={null}>
        <Desk position={[0, 0, 0]} />
        <Chair position={[-0.3, 0, 1.5]} rotation={[0, Math.PI * 0.92, 0]} />
        <Bonsai position={[-0.62, 0.74, -0.42]} rotation={[0, 0.4, 0]} />
        <PottedPlant position={[-2.6, 0, -2.4]} rotation={[0, 0.6, 0]} />
        <PottedPlant position={[2.7, 0, -2.2]} height={1.05} rotation={[0, -0.5, 0]} />
        <PenHolder position={[0.58, 0.74, -0.36]} />
        <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={12} blur={2} far={4} />
        <Environment preset="apartment" environmentIntensity={0.4} />
      </Suspense>

      <Suspense fallback={null}>
        <MenuCards onSelect={onSelectSection} />
      </Suspense>
    </Canvas>
  )
}
