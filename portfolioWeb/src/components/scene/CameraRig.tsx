import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/** Gives the camera a very subtle parallax drift that follows the pointer, like a living room, not a static render. */
export function CameraRig({ basePosition }: { basePosition: [number, number, number] }) {
  const target = useRef(new THREE.Vector3())
  const { camera, pointer } = useThree()
  const [bx, by, bz] = basePosition

  useFrame(() => {
    target.current.set(bx + pointer.x * 0.35, by - pointer.y * 0.2, bz)
    camera.position.lerp(target.current, 0.04)
    camera.lookAt(0, 0.55, -0.2)
  })

  return null
}
