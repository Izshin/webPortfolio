import { useEffect, useMemo, type JSX } from 'react'
import { useLoader } from '@react-three/fiber'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import * as THREE from 'three'
import { enableShadows, fitToHeight } from './modelUtils'
import { asset } from '../../../asset'

const BASE = asset('/models/gojoPenHolder')

/** Gojo figure (flat-color OBJ/MTL, no texture maps) — replaces the plain PenHolder on the desk. */
export function GojoPenHolder({ height = 0.18, ...props }: { height?: number } & JSX.IntrinsicElements['group']) {
  const materials = useLoader(MTLLoader, `${BASE}/Gojo.mtl`)
  const obj = useLoader(OBJLoader, `${BASE}/Gojo.obj`, (loader) => {
    materials.preload()
    loader.setMaterials(materials)
  })

  const model = useMemo(() => obj.clone(true), [obj])

  useEffect(() => {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mats = (child as THREE.Mesh).material as THREE.MeshPhongMaterial | THREE.MeshPhongMaterial[]
        for (const mat of Array.isArray(mats) ? mats : [mats]) {
          // .mtl's Ns 250 + Ks 0.5 gives a glossy plastic look; tone down the specular highlight.
          mat.shininess = 8
          mat.specular.setScalar(0.05)
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
