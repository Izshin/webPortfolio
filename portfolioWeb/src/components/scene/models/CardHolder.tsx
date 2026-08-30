import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import * as THREE from 'three'
import { enableShadows, fitToHeight } from './modelUtils'
import { CARD_D, CardBassZone, CardLinks, CardMesh, useCardFaces, type CardFaces } from './BusinessCard'
import type { NoteLang } from '../../../data/notes'
import { asset } from '../../../asset'

const MODEL = asset('/models/card-holder/source/card-holder.glb')
/** The .blend keeps four stacked variants of the tray; only this one is the finished piece. */
const HOLDER_NODE = 'CardHolder'

/** How many cards sit in the tray, and how thick the stack reads. */
const STACK = 9
const CARD_GAP = 0.0019
/** Bottom of the cards, measured from the tray's base. Raise it if they sink into the model. */
const CARD_FLOOR = 0.01
/** Slides the whole stack deeper into the tray (+) or out towards the front (-). */
const CARD_BACK = 0.006
/** How far the stack leans back inside the tray, in radians. */
const LEAN = -0.4

/** Where the taken card ends up, in the holder's own space. */
export const FLOAT_Y = 0.1
/** How far it steps out along the tray's reading side (-x). */
export const FLOAT_OUT = 0.055

// Same damp() curve for the pull-out/put-back motion, but slower going back into the tray
// so closing reads as a calm settle rather than the snappy pull-out reversed.
const OUT_DAMP_OPEN = 4
const OUT_DAMP_CLOSE = 1.8

const X_AXIS = new THREE.Vector3(1, 0, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)

/**
 * Upright in the tray: the card's long side runs along z, its printed top points up and its
 * face looks down -x, which is the direction the stack is read from.
 */
const Q_UPRIGHT = new THREE.Quaternion()
  .setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0))
  .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)))
const Q_STACK = new THREE.Quaternion()
  .setFromEuler(new THREE.Euler(0, 0, LEAN))
  .multiply(Q_UPRIGHT)

function slotX(index: number) {
  return CARD_BACK + (index - (STACK - 1) / 2) * CARD_GAP
}

const CARD_Y = CARD_FLOOR + CARD_D / 2

export function CardHolder({
  height = 0.045,
  interactive = false,
  lang = 'es',
  onActivate,
  ...props
}: {
  height?: number
  interactive?: boolean
  lang?: NoteLang
  onActivate?: () => void
} & JSX.IntrinsicElements['group']) {
  const gltf = useGLTF(MODEL)
  const faces = useCardFaces(lang)

  const holder = useMemo(() => gltf.scene.getObjectByName(HOLDER_NODE)?.clone(true) ?? null, [gltf])

  useEffect(() => {
    if (!holder) return
    const material = new THREE.MeshStandardMaterial({
      color: '#2e3542',
      roughness: 0.42,
      metalness: 0.3,
    })
    holder.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = material
    })
    enableShadows(holder)
    fitToHeight(holder, height)
  }, [holder, height])

  return (
    <group
      {...props}
      // One hitbox for the whole prop: the tray and every card trigger the same pickup.
      onClick={(e) => {
        e.stopPropagation()
        if (!interactive) onActivate?.()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      {holder && <primitive object={holder} />}
      {/* The front slot stays empty while its card is out in the air. */}
      {Array.from({ length: STACK - 1 }, (_, i) => (
        <group key={i} position={[slotX(i + 1), CARD_Y, 0]} quaternion={Q_STACK}>
          <CardMesh faces={faces} />
        </group>
      ))}
      <TakenCard faces={faces} interactive={interactive} onActivate={onActivate} />
    </group>
  )
}

/** The card that slides out of the tray, floats in the air and turns over when clicked. */
function TakenCard({
  faces,
  interactive,
  onActivate,
}: {
  faces: CardFaces
  interactive: boolean
  onActivate?: () => void
}) {
  const card = useRef<THREE.Group>(null)
  const [flipped, setFlipped] = useState(false)
  const out = useRef(0)
  const spin = useRef(0)

  const scratch = useMemo(
    () => ({
      stackPosition: new THREE.Vector3(slotX(0), CARD_Y, 0),
      floatPosition: new THREE.Vector3(-FLOAT_OUT, FLOAT_Y, 0),
      camera: new THREE.Vector3(),
      normal: new THREE.Vector3(),
      down: new THREE.Vector3(),
      side: new THREE.Vector3(),
      basis: new THREE.Matrix4(),
      float: new THREE.Quaternion(),
      turn: new THREE.Quaternion(),
      sway: new THREE.Quaternion(),
    }),
    [],
  )

  useEffect(() => {
    if (!interactive) setFlipped(false)
  }, [interactive])

  useFrame((state, delta) => {
    const group = card.current
    if (!group) return
    const dt = Math.min(delta, 0.05)
    const clock = state.clock.elapsedTime

    out.current = THREE.MathUtils.damp(out.current, interactive ? 1 : 0, interactive ? OUT_DAMP_OPEN : OUT_DAMP_CLOSE, dt)
    spin.current = THREE.MathUtils.damp(spin.current, flipped ? Math.PI : 0, 7, dt)
    const t = out.current

    group.position.lerpVectors(scratch.stackPosition, scratch.floatPosition, t)
    // Small arc, so the card looks pulled up out of the tray instead of sliding through it.
    group.position.y += Math.sin(Math.PI * t) * 0.018 + t * Math.sin(clock * 1.5) * 0.0022

    // Held up, the card is a billboard: its printed side (+y) aims straight at the camera and
    // its top edge (-z) stays as close to world up as the aim allows, so the text reads level.
    scratch.camera.copy(state.camera.position)
    group.parent?.worldToLocal(scratch.camera)
    scratch.normal.subVectors(scratch.camera, group.position).normalize()
    scratch.down
      .set(0, -1, 0)
      .addScaledVector(scratch.normal, scratch.normal.y)
      .normalize()
    scratch.side.crossVectors(scratch.normal, scratch.down)
    scratch.basis.makeBasis(scratch.side, scratch.normal, scratch.down)
    scratch.float.setFromRotationMatrix(scratch.basis)

    group.quaternion.slerpQuaternions(Q_STACK, scratch.float, t)
    // Turning about the card's own long axis is what shows the back the right way up.
    group.quaternion.multiply(scratch.turn.setFromAxisAngle(X_AXIS, spin.current))
    group.quaternion.multiply(scratch.sway.setFromAxisAngle(Z_AXIS, t * Math.sin(clock * 0.7) * 0.03))
  })

  return (
    <group ref={card}>
      <CardMesh
        faces={faces}
        onClick={(e) => {
          e.stopPropagation()
          if (interactive) setFlipped((f) => !f)
          else onActivate?.()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      />
      {interactive && !flipped && faces.front && <CardLinks links={faces.front.links} />}
      {interactive && flipped && <CardBassZone onMiss={() => setFlipped(false)} hint={faces.back?.hint} />}
    </group>
  )
}

useGLTF.preload(MODEL)
