import { useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, type JSX } from 'react'
import * as THREE from 'three'
import { enableShadows, asColor, fitToHeight, originalMaterialName } from './modelUtils'

const BASE = '/models/clip-board'
const clipboardDividend=100
export function ClipBoard({ height = 1/clipboardDividend, ...props }: { height?: number } & JSX.IntrinsicElements['group']) {
  const fbx = useLoader(FBXLoader, `${BASE}/source/ClipBoard.fbx`)
  const textures = useTexture({
    boardMap: `${BASE}/textures/clipboard2_board_Diffuse.png`,
    pageMap: `${BASE}/textures/clipboard2_page_Diffuse.png`,
  })

  const model = useMemo(() => fbx.clone(true), [fbx])

  useEffect(() => {
    asColor(textures.boardMap)
    asColor(textures.pageMap)

    const boardMaterial = new THREE.MeshStandardMaterial({ map: textures.boardMap, roughness: 0.85 })
    const pageMaterial = new THREE.MeshStandardMaterial({ map: textures.pageMap, roughness: 0.9 })

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const name = originalMaterialName(mesh)
        mesh.material = name.toLowerCase().includes('page') ? pageMaterial : boardMaterial
      }
    })
    enableShadows(model)
    fitToHeight(model, height, 'ClipBoard')
  }, [model, textures, height])

  return (
    <group {...props}>
      <primitive object={model} />
    </group>
  )
}
