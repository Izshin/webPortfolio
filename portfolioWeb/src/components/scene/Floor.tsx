import { useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { asset } from '../../asset'

const FLOOR_TEXTURE = asset('/models/woodTextureFloor.jpg')

interface FloorProps {
  position?: [number, number, number]
  width?: number
  depth?: number
  color?: string
  /** Path to the floor's diffuse texture. Set to null to fall back to a flat `color`. */
  texturePath?: string | null
  /** Real-world size (in floor units) a single texture tile should cover. Omit for one untiled image stretched across the whole floor. */
  textureTileSize?: number
}

/** A flat ground plane, textured with a wood floor image by default. */
export function Floor({
  position = [0, -0.001, 0],
  width = 9,
  depth = 5,
  color = '#ffffff',
  texturePath = FLOOR_TEXTURE,
  textureTileSize,
}: FloorProps) {
  // useTexture suspends, so <Floor /> must be rendered inside a <Suspense> boundary.
  const floorTexture = useTexture(texturePath ?? FLOOR_TEXTURE)

  useMemo(() => {
    if (!texturePath) return
    floorTexture.wrapS = THREE.RepeatWrapping
    floorTexture.wrapT = THREE.RepeatWrapping
    // Unlike ShapeGeometry (raw world-unit UVs), PlaneGeometry's UVs ARE normalized
    // 0-1, so repeat = size/tileSize tiles correctly here. No tileSize stretches one
    // untiled copy of the image across the whole floor (repeat stays at 1).
    floorTexture.repeat.set(textureTileSize ? width / textureTileSize : 1, textureTileSize ? depth / textureTileSize : 1)
    floorTexture.colorSpace = THREE.SRGBColorSpace
    floorTexture.needsUpdate = true
  }, [floorTexture, texturePath, width, depth, textureTileSize])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial map={texturePath ? floorTexture : null} color={color} roughness={0.95} />
    </mesh>
  )
}
