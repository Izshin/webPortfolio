import { useFrame, useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef, type JSX } from 'react'
import * as THREE from 'three'
import { enableShadows, asColor, fitToHeight } from './modelUtils'
import { asset } from '../../../asset'

const BASE = asset('/models/wacom-pen')

// A single decaying vertical bounce (world-space meters), played once per `wiggle` change
// (Gojo's onClick bumps a counter).
const WIGGLE_DURATION = 1.1
const WIGGLE_FREQUENCY = 26
const WIGGLE_DECAY = 6
const WIGGLE_AMPLITUDE = 0.012

/** Wacom stylus (single "lambert1" PBR material) — stands upright in the Gojo pen holder. */
export function WacomPen({
  height = 0.17,
  wiggle = 0,
  ...props
}: { height?: number; wiggle?: number } & JSX.IntrinsicElements['group']) {
  const fbx = useLoader(FBXLoader, `${BASE}/source/extracted/Wacom_LP_Tri.fbx`)
  const textures = useTexture({
    map: `${BASE}/textures/Wacom_LP_Tri_lambert1_BaseColor.webp`,
    normalMap: `${BASE}/textures/Wacom_LP_Tri_lambert1_Normal.webp`,
    roughnessMap: `${BASE}/textures/Wacom_LP_Tri_lambert1_Roughness.webp`,
    metalnessMap: `${BASE}/textures/Wacom_LP_Tri_lambert1_Metallic.webp`,
    aoMap: `${BASE}/textures/Wacom_LP_Tri_lambert1_AO.webp`,
  })

  const model = useMemo(() => fbx.clone(true), [fbx])

  useEffect(() => {
    asColor(textures.map)
    // The mesh only has a uv channel, but three defaults aoMap to uv1.
    textures.aoMap.channel = 0

    const material = new THREE.MeshStandardMaterial({
      map: textures.map,
      normalMap: textures.normalMap,
      roughnessMap: textures.roughnessMap,
      metalnessMap: textures.metalnessMap,
      aoMap: textures.aoMap,
      metalness: 1,
      roughness: 1,
    })

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = material
    })

    // The FBX models the pen lying along Z; stand it up before fitToHeight measures it.
    model.rotation.x = -Math.PI / 2
    enableShadows(model)
    fitToHeight(model, height)
  }, [model, textures, height])

  // Bounces the OUTER group's own position.y (its parent, the scene root, carries no rotation
  // here) so the offset is true world-space vertical, unlike rotating a rotated child would be.
  const groupRef = useRef<THREE.Group>(null)
  const baseY = useRef<number | null>(null)
  const wiggleT = useRef(Infinity)
  const prevWiggle = useRef(wiggle)

  useEffect(() => {
    baseY.current = groupRef.current?.position.y ?? null
  }, [])

  useEffect(() => {
    if (wiggle === prevWiggle.current) return
    prevWiggle.current = wiggle
    wiggleT.current = 0
  }, [wiggle])

  useFrame((_, delta) => {
    if (wiggleT.current > WIGGLE_DURATION || !groupRef.current || baseY.current === null) return
    wiggleT.current += delta
    const decay = Math.exp(-wiggleT.current * WIGGLE_DECAY)
    groupRef.current.position.y =
      baseY.current + Math.sin(wiggleT.current * WIGGLE_FREQUENCY) * WIGGLE_AMPLITUDE * decay
  })

  return (
    <group {...props} ref={groupRef}>
      <primitive object={model} />
    </group>
  )
}
