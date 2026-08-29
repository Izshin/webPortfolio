import { useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { Window } from './Window'
import { asset } from '../../asset'

const WALL_TEXTURE = asset('/models/marbeWalltexture.png')

interface WallProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
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
  /** Path to the wall's diffuse texture. Set to null to fall back to a flat `color`. */
  texturePath?: string | null
  /** Real-world size (in wall units) a single texture tile should cover. Omit for one untiled image stretched across the whole wall. */
  textureTileSize?: number
}

/** A flat wall with an actual cut-out window opening (via a Shape hole), filled by a <Window /> with glass panes. */
export function Wall({
  position = [0, 1.8, -2.6],
  rotation = [0, 0, 0],
  width = 8,
  height = 4,
  windowWidth = 1.8,
  windowHeight = 1.4,
  windowOffset = [0, -1.1],
  color = '#ffffff',
  showWindow = true,
  windowFrameColor,
  windowGlassColor,
  texturePath = WALL_TEXTURE,
  textureTileSize,
}: WallProps) {
  const [ox, oy] = windowOffset

  // useTexture suspends, so <Wall /> must be rendered inside a <Suspense> boundary.
  const wallTexture = useTexture(texturePath ?? WALL_TEXTURE)

  useMemo(() => {
    if (!texturePath) return
    wallTexture.wrapS = THREE.RepeatWrapping
    wallTexture.wrapT = THREE.RepeatWrapping
    // ShapeGeometry's auto-UVs are raw local/world coordinates (not normalized 0-1),
    // so `repeat` must be the inverse of the desired tile size in world units — using
    // width/tileSize here (as if UVs were 0-1) over-repeated the texture into dozens
    // of thin vertical strips. With no tileSize, repeat = 1/width & 1/height stretches
    // exactly one copy of the image across the whole wall (no seams/repeats at all).
    const tileX = textureTileSize ?? width
    const tileY = textureTileSize ?? height
    wallTexture.repeat.set(1 / tileX, 1 / tileY)
    wallTexture.colorSpace = THREE.SRGBColorSpace
    wallTexture.needsUpdate = true
  }, [wallTexture, texturePath, width, height, textureTileSize])

  const wallShape = useMemo(() => {
    const hw = width / 2
    const hh = height / 2
    const shape = new THREE.Shape()
    shape.moveTo(-hw, -hh)
    shape.lineTo(hw, -hh)
    shape.lineTo(hw, hh)
    shape.lineTo(-hw, hh)
    shape.lineTo(-hw, -hh)

    if (showWindow) {
      const whw = windowWidth / 2
      const whh = windowHeight / 2
      const hole = new THREE.Path()
      hole.moveTo(ox - whw, oy - whh)
      hole.lineTo(ox + whw, oy - whh)
      hole.lineTo(ox + whw, oy + whh)
      hole.lineTo(ox - whw, oy + whh)
      hole.lineTo(ox - whw, oy - whh)
      shape.holes.push(hole)
    }

    return shape
  }, [width, height, windowWidth, windowHeight, ox, oy, showWindow])

  return (
    <group position={position} rotation={rotation}>
      <mesh receiveShadow>
        <shapeGeometry args={[wallShape]} />
        <meshStandardMaterial
          map={texturePath ? wallTexture : null}
          color={color}
          roughness={1}
          side={THREE.DoubleSide}
        />
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

