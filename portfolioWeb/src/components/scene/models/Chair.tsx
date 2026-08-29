import { useLoader } from '@react-three/fiber'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, type JSX } from 'react'
import * as THREE from 'three'
import { enableShadows, asColor, fitToHeight } from './modelUtils'
import { asset } from '../../../asset'

const BASE = asset('/models/office-chair/source/extracted/model')

export function Chair({ height = 1.1, ...props }: { height?: number } & JSX.IntrinsicElements['group']) {
  const collada = useLoader(ColladaLoader, `${BASE}/model.dae`)
  const [map, metalnessMap, normalMap, roughnessMap] = useTexture([
    `${BASE}/textures/01 - Default_albedo.jpg`,
    `${BASE}/textures/01 - Default_metallic.jpg`,
    `${BASE}/textures/01 - Default_normal.png`,
    `${BASE}/textures/01 - Default_roughness.jpg`,
  ])

  const model = useMemo(() => collada?.scene.clone(true) ?? null, [collada])

  useEffect(() => {
    if (!model) return
    asColor(map)
    const material = new THREE.MeshStandardMaterial({
      map,
      metalnessMap,
      normalMap,
      roughnessMap,
      roughness: 1,
      metalness: 1,
    })
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        ;(child as THREE.Mesh).material = material
      }
    })
    enableShadows(model)
    fitToHeight(model, height, 'Chair')
  }, [model, map, metalnessMap, normalMap, roughnessMap, height])

  return (
    <group {...props}>
      {model && <primitive object={model} />}
    </group>
  )
}
