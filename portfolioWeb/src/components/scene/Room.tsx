import { Suspense, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, PerspectiveCamera, ContactShadows } from '@react-three/drei'
import { Desk } from './models/Desk'
import { Chair } from './models/Chair'
import { Bonsai } from './models/Bonsai'
import { PottedPlant } from './models/PottedPlant'
import { GojoPenHolder } from './models/GojoPenHolder'
import { WacomPen } from './models/WacomPen'
import { Boombox } from './models/Boombox'
import { MusicNotes } from './models/MusicNotes'
import { ClipBoard } from './models/ClipBoard'
import { CardHolder, FLOAT_OUT, FLOAT_Y } from './models/CardHolder'
import { GreekEnvironment } from './models/GreekEnvironment'
import { Skybox } from './models/Skybox'
import { CameraRig } from './CameraRig'
import { Wall } from './Wall'
import { Floor } from './Floor'
import { RetryOnError } from './RetryOnError'
import type { NoteLang } from '../../data/notes'
import { asset } from '../../asset'

const BOING_SOUND = asset('/soundEffects/Boing.mp3')

// Self-hosted instead of drei's `preset="apartment"` (which fetches from raw.githack.com) so
// the env map load doesn't depend on an external CDN being reachable in the critical path.
const APARTMENT_HDRI = asset('/hdri/apartment_1k.hdr')

// Shared with CameraRig's responsive fov/pullback below the WIDE_ASPECT it's tuned for.
const BASE_FOV = 42

const BOOMBOX_POSITION: [number, number, number] = [-0.059, 0.74, -0.249]
const BOOMBOX_ROTATION_Y = -1.7
const FOCUS_DISTANCE = 0.55
/** Camera height and aim height, both relative to the boombox's base. */
const FOCUS_HEIGHT = 0.16
const FOCUS_AIM_HEIGHT = 0.21

// Direction the boombox faces: its front is the model's local -X, i.e. a quarter turn back
// from the group's own yaw. Putting the camera on that normal gives a dead-on, perpendicular
// view; aiming above it keeps the model along the bottom edge, leaving room for the panel.
const FRONT_ANGLE = BOOMBOX_ROTATION_Y + Math.PI / 2
const FRONT_X = Math.sin(FRONT_ANGLE)
const FRONT_Z = Math.cos(FRONT_ANGLE)
const BOOMBOX_FOCUS = {
  position: [
    BOOMBOX_POSITION[0] + FRONT_X * FOCUS_DISTANCE,
    BOOMBOX_POSITION[1] + FOCUS_HEIGHT,
    BOOMBOX_POSITION[2] + FRONT_Z * FOCUS_DISTANCE,
  ] as [number, number, number],
  lookAt: [
    BOOMBOX_POSITION[0],
    BOOMBOX_POSITION[1] + FOCUS_AIM_HEIGHT,
    BOOMBOX_POSITION[2],
  ] as [number, number, number],
}

const CLIPBOARD_POSITION: [number, number, number] = [0.009, 0.75, 0.165]
const CLIPBOARD_ROTATION_Y = 0.39
const CLIPBOARD_DISTANCE = 0.46
// Steep, but well short of vertical: near the pole the up vector barely constrains the roll,
// so lookAt swings the horizon around as the camera settles. Backing off to ~62 degrees keeps
// the framing overhead and the arrival steady.
const CLIPBOARD_PITCH = (62 * Math.PI) / 180
// Offset along the board's own +Z, not the world's, so screen-up follows the page and the
// writing reads straight.
const CLIPBOARD_FOCUS = {
  position: [
    CLIPBOARD_POSITION[0] + Math.sin(CLIPBOARD_ROTATION_Y) * Math.cos(CLIPBOARD_PITCH) * CLIPBOARD_DISTANCE,
    CLIPBOARD_POSITION[1] + Math.sin(CLIPBOARD_PITCH) * CLIPBOARD_DISTANCE,
    CLIPBOARD_POSITION[2] + Math.cos(CLIPBOARD_ROTATION_Y) * Math.cos(CLIPBOARD_PITCH) * CLIPBOARD_DISTANCE,
  ] as [number, number, number],
  lookAt: [...CLIPBOARD_POSITION] as [number, number, number],
}

export type FocusTarget = 'boombox' | 'clipboard' | 'card'

const CARD_POSITION: [number, number, number] = [-0.392, 0.75, 0.175]
const CARD_ROTATION_Y = 2.45
const CARD_DISTANCE = 0.16
// Shallower than the clipboard: held up, the card turns to face wherever the camera lands.
const CARD_PITCH = (26 * Math.PI) / 180
// The cards face the holder's own -X, so that normal is where the camera has to sit.
const CARD_FACE_X = -Math.cos(CARD_ROTATION_Y)
const CARD_FACE_Z = Math.sin(CARD_ROTATION_Y)
const CARD_AIM: [number, number, number] = [
  CARD_POSITION[0] + CARD_FACE_X * FLOAT_OUT,
  CARD_POSITION[1] + FLOAT_Y,
  CARD_POSITION[2] + CARD_FACE_Z * FLOAT_OUT,
]
const CARD_FOCUS = {
  position: [
    CARD_AIM[0] + CARD_FACE_X * Math.cos(CARD_PITCH) * CARD_DISTANCE,
    CARD_AIM[1] + Math.sin(CARD_PITCH) * CARD_DISTANCE,
    CARD_AIM[2] + CARD_FACE_Z * Math.cos(CARD_PITCH) * CARD_DISTANCE,
  ] as [number, number, number],
  lookAt: CARD_AIM,
}

const FOCUS_POSES: Record<FocusTarget, typeof BOOMBOX_FOCUS> = {
  boombox: BOOMBOX_FOCUS,
  clipboard: CLIPBOARD_FOCUS,
  card: CARD_FOCUS,
}

// Mobile-only: the fixed idle framing can't show the whole desk width at once (see
// CameraRig's responsive fov/pullback), so a look-left/center/right toggle turns the
// camera in place (yaw) instead of leaving the ends permanently offscreen.
export type CameraPan = 'left' | 'center' | 'right'
// Shared with CameraPanControls (buttons) and App (swipe) so both agree on step order.
export const CAMERA_PAN_ORDER: CameraPan[] = ['left', 'center', 'right']
// Left is less pronounced than right — the desk's own asymmetry (lookAt already sits left
// of the camera's x) made an equal-magnitude left turn feel like it swung too far.
const PAN_ANGLE_LEFT = (16 * Math.PI) / 180
const PAN_ANGLE_RIGHT = (25 * Math.PI) / 180
// Signs flipped relative to the angle's own left/right label — matches CameraRig's yaw direction.
const PAN_BY_VIEW: Record<CameraPan, number> = { left: PAN_ANGLE_LEFT, center: 0, right: -PAN_ANGLE_RIGHT }

export function Room({
  focus,
  onFocus,
  onBackgroundClick,
  musicPlaying,
  musicLevels,
  pageIndex,
  onPageChange,
  lang,
  onLangChange,
  cameraPan = 'center',
}: {
  focus: FocusTarget | null
  onFocus: (target: FocusTarget | null) => void
  onBackgroundClick: () => void
  musicPlaying: boolean
  musicLevels: () => { bass: number; treble: number }
  pageIndex: number
  onPageChange: (index: number) => void
  lang: NoteLang
  onLangChange: (lang: NoteLang) => void
  cameraPan?: CameraPan
}) {
  // Bumped on every Gojo click; WacomPen watches it and plays a one-shot wiggle each time it changes.
  const [penWiggle, setPenWiggle] = useState(0)
  const boingRef = useRef<HTMLAudioElement | null>(null)

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      performance={{ min: 0.85 }}
      onPointerMissed={onBackgroundClick}
    >
      <PerspectiveCamera makeDefault position={[0.4, 1.13, 0.79]} fov={BASE_FOV} near={0.1} far={40} />
      {/* Fixed framing; CameraRig only adds a small pointer-driven drift, plus a responsive fov/pullback on narrow viewports. */}
      <CameraRig
        basePosition={[0.4, 1.13, 0.79]}
        lookAt={[-0.08, 0.57, -0.24]}
        focus={focus ? FOCUS_POSES[focus] : null}
        baseFov={BASE_FOV}
        pan={PAN_BY_VIEW[cameraPan]}
      />

      <color attach="background" args={['#efe0c4']} />
      {/* <fog attach="fog" args={['#d1e6f8', 10, 15]} /> */}

      <ambientLight intensity={0.6} />
      <directionalLight
        castShadow
        position={[3, 5.5, 2.5]}
        intensity={1.7}
        shadow-mapSize={[1024, 1024]}
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
          position={[-3.8, 1.8, -0.05]}
          rotation={[0, Math.PI / 2, 0]}
          width={5.1}
          showWindow={false}
        />
      </Suspense>

      {/* Own Suspense so the (fast) skybox shows the outside view right away instead of
          waiting on the much heavier Greek environment below. */}
      <Suspense fallback={null}>
        <Skybox position={[0, -5, 0]} />
      </Suspense>

      {/* Slow OBJ+MTL diorama: left in its own boundary so it can pop in whenever it's
          ready, without gating the skybox or the loading screen on it. */}
      <Suspense fallback={null}>
        <RetryOnError>
          <GreekEnvironment
            position={[0.5, -5.3, -9.5]}
            rotation={[0, Math.PI * 1, 0]}
          />
        </RetryOnError>
      </Suspense>

      <Suspense fallback={null}>
        <Desk/>
        <Chair position={[-0.3, 0, 0.5]} rotation={[0, Math.PI * 0.92, 0]} />
        <Bonsai position={[-0.618, 0.74, -0.178]} rotation={[0, 0.63, 0]} />
        <PottedPlant position={[-2.6, 0, -2.4]} rotation={[0, 0.6, 0]} />
        <PottedPlant position={[1.2, 0, -2.2]} height={1.05} rotation={[0, -0.5, 0]} />
        <GojoPenHolder
          position={[0.505, 0.752, -0.142]}
          rotation={[0, -0.5, 0]}
          onClick={(e) => {
            e.stopPropagation()
            setPenWiggle((n) => n + 1)
            if (!boingRef.current) boingRef.current = new Audio(BOING_SOUND)
            boingRef.current.currentTime = 0
            boingRef.current.play().catch(() => {})
          }}
        />
        <WacomPen
          position={[0.581, 0.92, -0.113]}
          rotation={[Math.PI / 2, 0, Math.PI / 1.5]}
          wiggle={penWiggle}
        />
        <Boombox
          position={BOOMBOX_POSITION}
          rotation={[0, BOOMBOX_ROTATION_Y, 0]}
          speed={0.42}
          onClick={(e) => {
            e.stopPropagation()
            onFocus(focus === 'boombox' ? null : 'boombox')
          }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = 'auto')}
        />
        <MusicNotes
          playing={musicPlaying}
          getLevels={musicLevels}
          position={[BOOMBOX_POSITION[0], BOOMBOX_POSITION[1] + 0.13, BOOMBOX_POSITION[2]]}
        />
        <ClipBoard
          position={CLIPBOARD_POSITION}
          rotation={[0, CLIPBOARD_ROTATION_Y, 0]}
          pageIndex={pageIndex}
          interactive={focus === 'clipboard'}
          lang={lang}
          onLangChange={onLangChange}
          onPageChange={onPageChange}
          onClick={(e) => {
            e.stopPropagation()
            // Focus only: while reading, clicks on the board must not close it, or turning
            // a page near the edge of a chevron would kick you out. Exit is a click outside.
            onFocus('clipboard')
          }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = 'auto')}
        />
        <CardHolder
          position={CARD_POSITION}
          rotation={[0, CARD_ROTATION_Y, 0]}
          interactive={focus === 'card'}
          lang={lang}
          onActivate={() => onFocus('card')}
        />
        <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={12} blur={2} far={4} frames={1} />
        <Environment files={APARTMENT_HDRI} environmentIntensity={0.4} />
      </Suspense>
    </Canvas>
  )
}
