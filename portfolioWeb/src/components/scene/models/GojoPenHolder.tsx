import { useEffect, useMemo, type JSX } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { enableShadows, fitToHeight } from './modelUtils'
import { asset } from '../../../asset'

// Decimated from the original 237k-face OBJ (28.75 MB) down to ~30k faces via Blender headless
// (tools/decimate-gojo.py) and re-exported as GLB (~1.4 MB) — see OPTIMIZATION_PLAN.md phase 3.1.
const MODEL = asset('/models/gojoPenHolder/gojo.glb')

/** Gojo figure (flat-color, no texture maps) — replaces the plain PenHolder on the desk. */
export function GojoPenHolder({ height = 0.18, ...props }: { height?: number } & JSX.IntrinsicElements['group']) {
  const gltf = useGLTF(MODEL)

  const model = useMemo(() => gltf.scene.clone(true), [gltf])

  useEffect(() => {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mats = (child as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[]
        for (const mat of Array.isArray(mats) ? mats : [mats]) {
          // Toned-down matte plastic look, same intent as the old Phong shininess/specular tweak.
          mat.roughness = 0.6
          mat.metalness = 0
        }
      }
    })
    enableShadows(model)
    fitToHeight(model, height)
  }, [model, height])

  return (
    <group {...props}>
      <primitive object={model} />
    </group>
  )
}
