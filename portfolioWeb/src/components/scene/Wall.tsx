import { useMemo } from 'react'
import * as THREE from 'three'
import { Window } from './Window'

interface WallProps {
  position?: [number, number, number]
  width?: number
  height?: number
  windowWidth?: number
  windowHeight?: number
  /** Offset of the window's center from the wall's own center, in wall-local units. */
  windowOffset?: [number, number]
  color?: string
  /** Set to false to leave the cut-out empty (e.g. render your own window model instead). */
  showWindow?: boolean
  windowFrameColor?: string
  windowGlassColor?: string
}

/** A flat wall with an actual cut-out window opening (via a Shape hole), filled by a <Window /> with glass panes. */
export function Wall({
  position = [0, 1.8, -2.6],
  width = 8,
  height = 4,
  windowWidth = 1.8,
  windowHeight = 1.4,
  windowOffset = [0, -1.1],
  color = '#dbe6d6',
  showWindow = true,
  windowFrameColor,
  windowGlassColor,
}: WallProps) {
  const [ox, oy] = windowOffset

  const wallShape = useMemo(() => {
    const hw = width / 2
    const hh = height / 2
    const shape = new THREE.Shape()
    shape.moveTo(-hw, -hh)
    shape.lineTo(hw, -hh)
    shape.lineTo(hw, hh)
    shape.lineTo(-hw, hh)
    shape.lineTo(-hw, -hh)

    const whw = windowWidth / 2
    const whh = windowHeight / 2
    const hole = new THREE.Path()
    hole.moveTo(ox - whw, oy - whh)
    hole.lineTo(ox + whw, oy - whh)
    hole.lineTo(ox + whw, oy + whh)
    hole.lineTo(ox - whw, oy + whh)
    hole.lineTo(ox - whw, oy - whh)
    shape.holes.push(hole)

    return shape
  }, [width, height, windowWidth, windowHeight, ox, oy])

  return (
    <group position={position}>
      <mesh receiveShadow>
        <shapeGeometry args={[wallShape]} />
        <meshStandardMaterial color={color} roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {showWindow && (
        <Window
          position={[ox, oy, 0.01]}
          width={windowWidth}
          height={windowHeight}
          {...(windowFrameColor !== undefined ? { frameColor: windowFrameColor } : {})}
          {...(windowGlassColor !== undefined ? { glassColor: windowGlassColor } : {})}
        />
      )}
    </group>
  )
}

