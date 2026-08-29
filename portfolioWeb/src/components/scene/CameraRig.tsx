import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { devDragging } from './DevTransform'

type CameraRigProps = {
  basePosition: [number, number, number]
  lookAt?: [number, number, number]
  /** How far the camera drifts from basePosition at the edges of the viewport, in world units. */
  amplitude?: [number, number]
  /** Lerp factor per frame — lower is smoother/laggier. */
  damping?: number
  /** When set, the camera glides here instead of the base framing (used to zoom onto a prop). */
  focus?: { position: [number, number, number]; lookAt: [number, number, number] } | null
  /** Lerp factor used while flying to/from a focus target. */
  focusDamping?: number
}

/** Gives the camera a very subtle parallax drift that follows the pointer, like a living room, not a static render. */
export function CameraRig({
  basePosition,
  lookAt = [0, 0.55, -0.2],
  amplitude = [0.08, 0.04],
  damping = 0.02,
  focus = null,
  focusDamping = 0.06,
}: CameraRigProps) {
  const target = useRef(new THREE.Vector3())
  const aim = useRef(new THREE.Vector3(...lookAt))
  const desiredAim = useRef(new THREE.Vector3())
  const { camera, pointer } = useThree()
  const [bx, by, bz] = basePosition
  const [ax, ay] = amplitude

  useFrame(() => {
    if (devDragging.active) return

    if (focus) {
      target.current.set(...focus.position)
      desiredAim.current.set(...focus.lookAt)
    } else {
      target.current.set(bx + pointer.x * ax, by - pointer.y * ay, bz)
      desiredAim.current.set(lookAt[0], lookAt[1], lookAt[2])
    }

    // Big moves (flying to a prop and back) use focusDamping; the tiny idle parallax
    // keeps the gentler `damping` so it stays a drift rather than a follow. Position and
    // aim must share the factor, or the last stretch keeps swivelling after the camera
    // has all but stopped.
    const flying = focus !== null || camera.position.distanceTo(target.current) > 0.05
    const t = flying ? focusDamping : damping
    camera.position.lerp(target.current, t)
    aim.current.lerp(desiredAim.current, t)
    camera.lookAt(aim.current)
  })

  return null
}
