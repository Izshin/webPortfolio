import * as THREE from 'three'

interface WindowProps {
  position?: [number, number, number]
  width?: number
  height?: number
  frameThickness?: number
  frameDepth?: number
  frameColor?: string
  glassColor?: string
  glassOpacity?: number
}

/** A framed window with a single glass pane, sized to drop into a Wall's cut-out opening. */
export function Window({
  position = [0, 0, 0],
  width = 1.8,
  height = 1.4,
  frameThickness = 0.05,
  frameDepth = 0.06,
  frameColor = '#ffffff',

  glassColor = '#bfe3ff',
  glassOpacity = 0.35,
}: WindowProps) {
  const hw = width / 2
  const hh = height / 2
  const innerW = width - frameThickness * 2
  const innerH = height - frameThickness * 2

  return (
    <group position={position}>
      {/* Outer frame (top/bottom/left/right) */}
      <mesh position={[0, hh - frameThickness / 2, 0]} castShadow>
        <boxGeometry args={[width, frameThickness, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>
      <mesh position={[0, -hh + frameThickness / 2, 0]} castShadow>
        <boxGeometry args={[width, frameThickness, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>
      <mesh position={[-hw + frameThickness / 2, 0, 0]} castShadow>
        <boxGeometry args={[frameThickness, height, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>
      <mesh position={[hw - frameThickness / 2, 0, 0]} castShadow>
        <boxGeometry args={[frameThickness, height, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>

      {/* Glass — single pane, no mullions; no texture needed since the scene's <Environment> HDRI supplies reflections */}
      <mesh>
        <planeGeometry args={[innerW, innerH]} />
        <meshPhysicalMaterial
          color={glassColor}
          transparent
          opacity={glassOpacity}
          roughness={0.05}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          envMapIntensity={1.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
