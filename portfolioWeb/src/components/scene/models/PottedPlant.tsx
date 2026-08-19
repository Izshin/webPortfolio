import { useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { enableShadows, asColor, fitToHeight, originalMaterialName } from './modelUtils'

const BASE = '/models/indoor-plant-with-pot-a'

export function PottedPlant({ height = 0.9, ...props }: { height?: number } & JSX.IntrinsicElements['group']) {
  const fbx = useLoader(FBXLoader, `${BASE}/source/Plant A.fbx`)
  const textures = useTexture({
    plantMap: `${BASE}/textures/Plant_A.png`,
    potMap: `${BASE}/textures/Pot_A_albedo.png`,
    potNormal: `${BASE}/textures/Pot_A_normal.png`,
    potRoughness: `${BASE}/textures/Pot_A_roughness.png`,
    soilMap: `${BASE}/textures/soil.png`,
  })

  const model = useMemo(() => fbx.clone(true), [fbx])

  useEffect(() => {
    asColor(textures.plantMap)
    asColor(textures.potMap)
    asColor(textures.soilMap)

    const plantMaterial = new THREE.MeshStandardMaterial({
      map: textures.plantMap,
      transparent: true,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      roughness: 0.9,
    })
    const potMaterial = new THREE.MeshStandardMaterial({
      map: textures.potMap,
      normalMap: textures.potNormal,
      roughnessMap: textures.potRoughness,
      roughness: 1,
    })
    const soilMaterial = new THREE.MeshStandardMaterial({
      map: textures.soilMap,
      roughness: 1,
    })

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const name = originalMaterialName(mesh)
        if (name.toLowerCase().includes('plant')) mesh.material = plantMaterial
        else if (name.toLowerCase().includes('pot')) mesh.material = potMaterial
        else if (name.toLowerCase().includes('soil')) mesh.material = soilMaterial
        else mesh.material = potMaterial
      }
    })
    enableShadows(model)
    fitToHeight(model, height, 'PottedPlant')
  }, [model, textures, height])

  return (
    <group {...props}>
      <primitive object={model} />
    </group>
  )
}
