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
}

/** Gives the camera a very subtle parallax drift that follows the pointer, like a living room, not a static render. */
export function CameraRig({
  basePosition,
  lookAt = [0, 0.55, -0.2],
  amplitude = [0.12, 0.07],
  damping = 0.04,
}: CameraRigProps) {
  const target = useRef(new THREE.Vector3())
  const { camera, pointer } = useThree()
  const [bx, by, bz] = basePosition
  const [ax, ay] = amplitude

  useFrame(() => {
    if (devDragging.active) return
    target.current.set(bx + pointer.x * ax, by - pointer.y * ay, bz)
    camera.position.lerp(target.current, damping)
    camera.lookAt(lookAt[0], lookAt[1], lookAt[2])
  })

  return null
}
