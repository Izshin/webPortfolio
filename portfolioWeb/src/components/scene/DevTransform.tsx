import { useRef, type ReactNode } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

type DevTransformProps = {
  label?: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  /** Set false to freeze it once you've found the spot (keeps the props, drops the listeners). */
  enabled?: boolean
  children: ReactNode
}

const UP = new THREE.Vector3(0, 1, 0)

/** Read by CameraRig so the pointer parallax doesn't move the ray out from under an active drag. */
export const devDragging = { active: false }

/**
 * Dev-only helper: drag the wrapped model around and log its transform so the
 * numbers can be pasted straight back into the JSX.
 *
 *   drag          → slide on the XZ plane
 *   shift + drag  → spin around Y
 *   alt + drag    → raise / lower (Y)
 */
export function DevTransform({
  label = 'DevTransform',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  enabled = true,
  children,
}: DevTransformProps) {
  const group = useRef<THREE.Group>(null)
  const controls = useThree((state) => state.controls) as { enabled: boolean } | null

  const mode = useRef<'move' | 'rotate' | 'lift' | null>(null)
  const plane = useRef(new THREE.Plane())
  const offset = useRef(new THREE.Vector3())
  const hit = useRef(new THREE.Vector3())

  const log = () => {
    const g = group.current
    if (!g) return
    const r = (n: number) => Math.round(n * 1000) / 1000
    console.log(
      `${label}: position={[${r(g.position.x)}, ${r(g.position.y)}, ${r(g.position.z)}]} rotation={[${r(g.rotation.x)}, ${r(g.rotation.y)}, ${r(g.rotation.z)}]}`,
    )
  }

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    const g = group.current
    if (!g) return
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    if (controls) controls.enabled = false

    mode.current = e.shiftKey ? 'rotate' : e.altKey ? 'lift' : 'move'
    devDragging.active = true
    plane.current.setFromNormalAndCoplanarPoint(UP, g.position)
    if (e.ray.intersectPlane(plane.current, hit.current)) {
      offset.current.copy(g.position).sub(hit.current)
    }
  }

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const g = group.current
    if (!g || !mode.current) return
    e.stopPropagation()

    if (mode.current === 'move') {
      if (e.ray.intersectPlane(plane.current, hit.current)) {
        g.position.x = hit.current.x + offset.current.x
        g.position.z = hit.current.z + offset.current.z
      }
    } else if (mode.current === 'rotate') {
      g.rotation.y += e.movementX * 0.01
    } else {
      g.position.y -= e.movementY * 0.002
    }
  }

  const endDrag = (e: ThreeEvent<PointerEvent>) => {
    if (!mode.current) return
    ;(e.target as Element).releasePointerCapture(e.pointerId)
    mode.current = null
    devDragging.active = false
    if (controls) controls.enabled = true
    log()
  }

  return (
    <group
      ref={group}
      position={position}
      rotation={rotation}
      onPointerDown={enabled ? onPointerDown : undefined}
      onPointerMove={enabled ? onPointerMove : undefined}
      onPointerUp={enabled ? endDrag : undefined}
      onPointerCancel={enabled ? endDrag : undefined}
      onPointerOver={enabled ? () => (document.body.style.cursor = 'grab') : undefined}
      onPointerOut={enabled ? () => (document.body.style.cursor = 'auto') : undefined}
    >
      {children}
    </group>
  )
}
