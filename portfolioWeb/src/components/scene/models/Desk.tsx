import { useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { enableShadows, asColor, fitToHeight } from './modelUtils'
import { asset } from '../../../asset'

const BASE = asset('/models/office-table')

export function Desk({ height = 0.75, ...props }: { height?: number }) {
  const fbx = useLoader(FBXLoader, `${BASE}/source/table.fbx`)
  const [map, normalMap, roughnessMap, metalnessMap] = useTexture([
    `${BASE}/textures/Table_BaseColor.png`,
    `${BASE}/textures/Table_Normal.png`,
    `${BASE}/textures/Table_Roughness.png`,
    `${BASE}/textures/Table_Metallic.png`,
  ])

  const model = useMemo(() => fbx.clone(true), [fbx])

  useEffect(() => {
    asColor(map)
    const material = new THREE.MeshStandardMaterial({
      map,
      normalMap,
      roughnessMap,
      metalnessMap,
      roughness: 1,
      metalness: 1,
    })
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        ;(child as THREE.Mesh).material = material
      }
    })
    enableShadows(model)
    fitToHeight(model, height)
  }, [model, map, normalMap, roughnessMap, metalnessMap, height])

  return (
    <group {...props}>
      <primitive object={model} />
    </group>
  )
}

useTexture.preload(`${BASE}/textures/Table_BaseColor.png`)
