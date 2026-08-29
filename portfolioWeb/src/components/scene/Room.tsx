import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, PerspectiveCamera, ContactShadows } from '@react-three/drei'
import { Desk } from './models/Desk'
import { Chair } from './models/Chair'
import { Bonsai } from './models/Bonsai'
import { PottedPlant } from './models/PottedPlant'
import { GojoPenHolder } from './models/GojoPenHolder'
import { WacomPen } from './models/WacomPen'
import { Boombox } from './models/Boombox'
import { ClipBoard } from './models/ClipBoard'
import { GreekEnvironment } from './models/GreekEnvironment'
import { Skybox } from './models/Skybox'
import { CameraRig } from './CameraRig'
import { DevTransform } from './DevTransform'
import { Wall } from './Wall'
import { Floor } from './Floor'
import type { SectionId } from '../../data/menu'

export function Room({ onSelectSection }: { onSelectSection: (id: SectionId) => void }) {
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }} performance={{ min: 0.85 }}>
      <PerspectiveCamera makeDefault position={[0.4, 1.13, 0.79]} fov={42} near={0.1} far={40} />
      {/* Fixed framing; CameraRig only adds a small pointer-driven drift around it. */}
      <CameraRig basePosition={[0.4, 1.13, 0.79]} lookAt={[-0.08, 0.57, -0.24]} />

      <color attach="background" args={['#efe0c4']} />
      {/* <fog attach="fog" args={['#d1e6f8', 10, 15]} /> */}

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
    

      {/* Floor */}
      <Suspense fallback={null}>
        <Floor />
      </Suspense>

      <Suspense fallback={null}>
        <Wall position={[-0.4, 1.8, -2.6]} windowWidth={3} />
        <Wall
          position={[-4.4, 1.8, -0.05]}
          rotation={[0, Math.PI / 2, 0]}
          width={5.1}
          showWindow={false}
        />
      </Suspense>

      <Suspense fallback={null}>
        <Skybox position={[0, -5, 0]}/>
        <GreekEnvironment position={[0.5, -5.3, -9.5]} rotation={[0, Math.PI * 1, 0]}/>
      </Suspense>

      <Suspense fallback={null}>
        <Desk/>
        <Chair position={[-0.3, 0, 0.5]} rotation={[0, Math.PI * 0.92, 0]} />
        <DevTransform label="Bonsai" position={[-0.618, 0.74, -0.178]} rotation={[0, 0.63, 0]}>
          <Bonsai />
        </DevTransform>
        <PottedPlant position={[-2.6, 0, -2.4]} rotation={[0, 0.6, 0]} />
        <PottedPlant position={[1.2, 0, -2.2]} height={1.05} rotation={[0, -0.5, 0]} />
        <DevTransform label="GojoPenHolder" position={[0.505, 0.752, -0.142]} rotation={[0, -0.5, 0]}>
          <GojoPenHolder />
        </DevTransform>
        <DevTransform label="WacomPen" position={[0.581, 0.92, -0.113]} rotation={[Math.PI / 2, 0, Math.PI / 1.5]}>
          <WacomPen />
        </DevTransform>
        <DevTransform label="Boombox" position={[-0.059, 0.74, -0.249]} rotation={[0, -1.7, 0]}>
          <Boombox />
        </DevTransform>
        <DevTransform label="ClipBoard" position={[0.009, 0.75, 0.165]} rotation={[0, 0.39, 0]}>
          <ClipBoard />
        </DevTransform>
        <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={12} blur={2} far={4} />
        <Environment preset="apartment" environmentIntensity={0.4} />
      </Suspense>
    </Canvas>
  )
}
