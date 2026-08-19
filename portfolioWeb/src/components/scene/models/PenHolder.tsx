import { useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { enableShadows, fitToHeight } from './modelUtils'

const BASE = '/models/pen-holder'

export function PenHolder({ height = 0.14, ...props }: { height?: number } & JSX.IntrinsicElements['group']) {
  const fbx = useLoader(FBXLoader, `${BASE}/source/pen holder.fbx`)
  const [bumpMap, alphaMap] = useTexture([`${BASE}/textures/bump.jpg`, `${BASE}/textures/trans.jpg`])

  const model = useMemo(() => fbx.clone(true), [fbx])

  useEffect(() => {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e7dcc9'),
      bumpMap,
      bumpScale: 0.02,
      alphaMap,
      transparent: true,
      opacity: 0.92,
      roughness: 0.4,
      metalness: 0.1,
    })
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        ;(child as THREE.Mesh).material = material
      }
    })
    enableShadows(model)
    fitToHeight(model, height)
  }, [model, bumpMap, alphaMap, height])

  return (
    <group {...props}>
      <primitive object={model} />
    </group>
  )
}
