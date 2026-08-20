import { useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { enableShadows, fitToHeight, originalMaterialColor } from './modelUtils'

const BASE = '/models/pen-holder'

export function PenHolder({ height = 0.14, ...props }: { height?: number } & JSX.IntrinsicElements['group']) {
  const fbx = useLoader(FBXLoader, `${BASE}/source/pen holder.fbx`)
  const [bumpMap, alphaMap] = useTexture([`${BASE}/textures/bump.jpg`, `${BASE}/textures/trans.jpg`])

  const model = useMemo(() => fbx.clone(true), [fbx])

  useEffect(() => {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        // Each "pen" is its own mesh with its own FBX-parsed color; preserve it
        // instead of flattening every mesh to one shared material/color.
        mesh.material = new THREE.MeshStandardMaterial({
          color: originalMaterialColor(mesh, '#0c0000'),
          bumpMap,
          bumpScale: 0.12,
          alphaMap,
          transparent: true,
          opacity: 2,
          roughness: 1,
          metalness: 0.1,
        })
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
