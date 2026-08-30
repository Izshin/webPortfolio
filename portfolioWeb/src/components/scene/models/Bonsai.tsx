import { useFrame, useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef, type JSX } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { enableShadows, asColor, fitToHeight, originalMaterialName, saturateTexture } from './modelUtils'
import { asset } from '../../../asset'

// R3F types event handler props as `Fn | Readonly<Fn>`, and Readonly<Fn> has no call signature.
type ClickHandler = (event: ThreeEvent<MouseEvent>) => void
type PointerHandler = (event: ThreeEvent<PointerEvent>) => void

const BASE = asset('/models/bonsaitree')
const TREE_SWAY_SOUND = asset('/soundEffects/TreeSway.mp3')

// A single decaying side-to-side rustle (rotation, radians), played once per click.
const SHAKE_DURATION = 1.2
const SHAKE_FREQUENCY = 18
const SHAKE_DECAY = 5
const SHAKE_AMPLITUDE = 0.12

export function Bonsai({
  height = 0.35,
  saturation = 1.4,
  ...props
}: { height?: number; saturation?: number } & JSX.IntrinsicElements['group']) {
  const fbx = useLoader(FBXLoader, `${BASE}/source/Bonsai_Final.fbx`)
  const textures = useTexture({
    trunkMap: `${BASE}/textures/LP_Cutted_Retopo_New_BaseColor.png`,
    trunkNormal: `${BASE}/textures/LP_Cutted_Retopo_New_Normal.png`,
    trunkRoughness: `${BASE}/textures/LP_Cutted_Retopo_New_Roughness.png`,
    leavesMap: `${BASE}/textures/Plane_standardSurface1_BaseColor.png`,
    leavesMetalness: `${BASE}/textures/Plane_standardSurface1_Metallic.png`,
    potMap: `${BASE}/textures/Pot_Cutted_standardSurface1_BaseColor.png`,
    potNormal: `${BASE}/textures/Pot_Cutted_standardSurface1_Normal.png`,
    potRoughness: `${BASE}/textures/Pot_Cutted_standardSurface1_Roughness.png`,
  })

  const model = useMemo(() => fbx.clone(true), [fbx])

  useEffect(() => {
    asColor(textures.trunkMap)
    asColor(textures.leavesMap)
    asColor(textures.potMap)

    const trunkMap = saturateTexture(textures.trunkMap, saturation)
    const leavesMap = saturateTexture(textures.leavesMap, saturation)
    const potMap = saturateTexture(textures.potMap, saturation)

    const trunkMaterial = new THREE.MeshStandardMaterial({
      map: trunkMap,
      normalMap: textures.trunkNormal,
      roughnessMap: textures.trunkRoughness,
      roughness: 1,
    })
    const leavesMaterial = new THREE.MeshStandardMaterial({
      map: leavesMap,
      metalnessMap: textures.leavesMetalness,
      transparent: true,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      roughness: 0.9,
    })
    const potMaterial = new THREE.MeshStandardMaterial({
      map: potMap,
      normalMap: textures.potNormal,
      roughnessMap: textures.potRoughness,
      roughness: 1,
    })

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const name = originalMaterialName(mesh)
        if (name.includes('Leaves')) mesh.material = leavesMaterial
        else if (name.includes('Pot')) mesh.material = potMaterial
        else mesh.material = trunkMaterial
      }
    })
    enableShadows(model)
    fitToHeight(model, height, 'Bonsai')
  }, [model, textures, height, saturation])

  // Rustles the group's own rotation.z on click (parent has no rotation baked in that would
  // make a local-Z spin read as something other than a side-to-side sway in world space).
  const groupRef = useRef<THREE.Group>(null)
  const baseRotationZ = useRef(0)
  const shakeT = useRef(Infinity)
  const swayRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    baseRotationZ.current = groupRef.current?.rotation.z ?? 0
  }, [])

  useFrame((_, delta) => {
    if (shakeT.current > SHAKE_DURATION || !groupRef.current) return
    shakeT.current += delta
    const decay = Math.exp(-shakeT.current * SHAKE_DECAY)
    groupRef.current.rotation.z =
      baseRotationZ.current + Math.sin(shakeT.current * SHAKE_FREQUENCY) * SHAKE_AMPLITUDE * decay
  })

  return (
    <group
      {...props}
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation()
        shakeT.current = 0
        if (!swayRef.current) swayRef.current = new Audio(TREE_SWAY_SOUND)
        swayRef.current.currentTime = 0
        swayRef.current.play().catch(() => {})
        ;(props.onClick as ClickHandler | undefined)?.(e)
      }}
      onPointerOver={(e) => {
        document.body.style.cursor = 'pointer'
        ;(props.onPointerOver as PointerHandler | undefined)?.(e)
      }}
      onPointerOut={(e) => {
        document.body.style.cursor = 'auto'
        ;(props.onPointerOut as PointerHandler | undefined)?.(e)
      }}
    >
      <primitive object={model} />
    </group>
  )
}
