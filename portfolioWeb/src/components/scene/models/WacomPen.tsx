import { useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, type JSX } from 'react'
import * as THREE from 'three'
import { enableShadows, asColor, fitToHeight } from './modelUtils'
import { asset } from '../../../asset'

const BASE = asset('/models/wacom-pen')

/** Wacom stylus (single "lambert1" PBR material) — stands upright in the Gojo pen holder. */
export function WacomPen({ height = 0.17, ...props }: { height?: number } & JSX.IntrinsicElements['group']) {
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

  return (
    <group {...props}>
      <primitive object={model} />
    </group>
  )
}
