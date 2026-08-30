import { useEffect, useMemo, type JSX } from 'react'
import { useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { asColor } from './modelUtils'
import { asset } from '../../../asset'

const BASE = asset('/models/skybox-skydays-3')

/** Sketchfab "Sky Days" skybox mesh (inside-out dome) — scaled up to enclose the whole scene so sky/clouds show through the window. */
export function Skybox({ radius = 20, ...props }: { radius?: number } & JSX.IntrinsicElements['group']) {
  const fbx = useLoader(FBXLoader, `${BASE}/source/extracted/SM_Skybox.FBX`)
  const map = useTexture(`${BASE}/textures/skybox_skydays_3.webp`)

  const model = useMemo(() => fbx.clone(true), [fbx])

  useEffect(() => {
    asColor(map)
    const material = new THREE.MeshBasicMaterial({ map, side: THREE.FrontSide, fog: false, toneMapped: false })

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.material = material
        mesh.castShadow = false
        mesh.receiveShadow = false
      }
    })

    // Guard against StrictMode's double-invoked effect re-measuring the already-scaled model.
    if (model.userData.__scaled) return
    model.userData.__scaled = true

    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    box.getSize(size)

    const maxDim = Math.max(size.x, size.y, size.z) || 1
    model.scale.setScalar((radius * 2) / maxDim)
  }, [model, map, radius])

  return (
    <group {...props}>
      <primitive object={model} />
    </group>
  )
}
