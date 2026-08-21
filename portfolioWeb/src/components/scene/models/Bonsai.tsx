import { useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { enableShadows, asColor, fitToHeight, originalMaterialName, saturateTexture } from './modelUtils'

const BASE = '/models/bonsaitree'

export function Bonsai({
  height = 0.35,
  saturation = 1.4,
  ...props
}: { height?: number; saturation?: number } & JSX.IntrinsicElements['group']) {
  const fbx = useLoader(FBXLoader, `${BASE}/source/Bonsai_Final.fbx`)
  const textures = useTexture({
    trunkMap: `${BASE}/textures/LP_Cutted_Retopo_New_BaseColor.png`,
    trunkNormal: `${BASE}/textures/LP_Cutted_Retopo_New_Normal.png`,
    trunkRoughness: `${BASE}/textures/LP_Cutted_Retopo_New_Roughness.png`,
    leavesMap: `${BASE}/textures/Plane_standardSurface1_BaseColor.png`,
    leavesMetalness: `${BASE}/textures/Plane_standardSurface1_Metallic.png`,
    potMap: `${BASE}/textures/Pot_Cutted_standardSurface1_BaseColor.png`,
    potNormal: `${BASE}/textures/Pot_Cutted_standardSurface1_Normal.png`,
    potRoughness: `${BASE}/textures/Pot_Cutted_standardSurface1_Roughness.png`,
  })

  const model = useMemo(() => fbx.clone(true), [fbx])

  useEffect(() => {
    asColor(textures.trunkMap)
    asColor(textures.leavesMap)
    asColor(textures.potMap)

    const trunkMap = saturateTexture(textures.trunkMap, saturation)
    const leavesMap = saturateTexture(textures.leavesMap, saturation)
    const potMap = saturateTexture(textures.potMap, saturation)

    const trunkMaterial = new THREE.MeshStandardMaterial({
      map: trunkMap,
      normalMap: textures.trunkNormal,
      roughnessMap: textures.trunkRoughness,
      roughness: 1,
    })
    const leavesMaterial = new THREE.MeshStandardMaterial({
      map: leavesMap,
      metalnessMap: textures.leavesMetalness,
      transparent: true,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      roughness: 0.9,
    })
    const potMaterial = new THREE.MeshStandardMaterial({
      map: potMap,
      normalMap: textures.potNormal,
      roughnessMap: textures.potRoughness,
      roughness: 1,
    })

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const name = originalMaterialName(mesh)
        if (name.includes('Leaves')) mesh.material = leavesMaterial
        else if (name.includes('Pot')) mesh.material = potMaterial
        else mesh.material = trunkMaterial
      }
    })
    enableShadows(model)
    fitToHeight(model, height, 'Bonsai')
  }, [model, textures, height, saturation])

  return (
    <group {...props}>
      <primitive object={model} />
    </group>
  )
}
