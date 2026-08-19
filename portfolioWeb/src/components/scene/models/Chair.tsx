import { useLoader } from '@react-three/fiber'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, type JSX } from 'react'
import * as THREE from 'three'
import { enableShadows, asColor, fitToHeight } from './modelUtils'

const BASE = '/models/office-chair/source/extracted/model'

export function Chair({ height = 0.85, ...props }: { height?: number } & JSX.IntrinsicElements['group']) {
  const collada = useLoader(ColladaLoader, `${BASE}/model.dae`)
  const [map, metalnessMap, normalMap, roughnessMap] = useTexture([
    `${BASE}/textures/01 - Default_albedo.jpg`,
    `${BASE}/textures/01 - Default_metallic.jpg`,
    `${BASE}/textures/01 - Default_normal.png`,
    `${BASE}/textures/01 - Default_roughness.jpg`,
  ])

  const model = useMemo(() => collada.scene.clone(true), [collada])

  useEffect(() => {
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
    console.warn('[Chair DEBUG] sync scale/pos', model.scale.toArray(), model.position.toArray(), 'parent', model.parent?.type)
    requestAnimationFrame(() => {
      model.updateWorldMatrix(true, true)
      const worldBox = new THREE.Box3().setFromObject(model)
      console.warn('[Chair DEBUG] world box min/max', worldBox.min.toArray(), worldBox.max.toArray())
      let node: THREE.Object3D | null = model
      const chain = []
      while (node) {
        chain.push({ type: node.type, name: node.name, scale: node.scale.toArray(), pos: node.position.toArray() })
        node = node.parent
      }
      console.warn('[Chair DEBUG] ancestor chain', JSON.stringify(chain))
    })
  }, [model, map, metalnessMap, normalMap, roughnessMap, height])

  return (
    <group {...props}>
      <primitive object={model} />
    </group>
  )
}
