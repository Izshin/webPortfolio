import { useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { useAnimations, useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef, type JSX } from 'react'
import * as THREE from 'three'
import { enableShadows, asColor, fitToHeight } from './modelUtils'

const BASE = '/models/sci-fi-boombox-hoverboard-animation'

/** Clips baked into the FBX: 'Activate' | 'Idle Loop' | 'Deactivate' | 'Idle Fidget 1' | 'Idle Fidget 2'. */
export function Boombox({
  height = 0.12,
  animation = 'Idle Loop',
  speed = 0.56,
  emissiveIntensity = 1.6,
  ...props
}: {
  height?: number
  animation?: string
  speed?: number
  emissiveIntensity?: number
} & JSX.IntrinsicElements['group']) {
  const group = useRef<THREE.Group>(null)
  const fbx = useLoader(FBXLoader, `${BASE}/source/Boombox_FullAnimation.fbx`)
  const textures = useTexture({
    map: `${BASE}/textures/Boombox_Animate_Material.png`,
    normalMap: `${BASE}/textures/ManuelLagonera_PropModel_Normal.png`,
    roughnessMap: `${BASE}/textures/ManuelLagonera_PropModel_Roughness.png`,
    metalnessMap: `${BASE}/textures/ManuelLagonera_PropModel_Metallic.png`,
    emissiveMap: `${BASE}/textures/ManuelLagonera_PropModel_Emissive.png`,
  })

  // SkeletonUtils.clone (not Object3D.clone) — a plain clone leaves the copy's
  // SkinnedMeshes bound to the original's bones, so the animation wouldn't play.
  const model = useMemo(() => cloneSkinned(fbx), [fbx])
  const { actions } = useAnimations(fbx.animations, group)

  useEffect(() => {
    asColor(textures.map)
    asColor(textures.emissiveMap)

    const material = new THREE.MeshStandardMaterial({
      map: textures.map,
      normalMap: textures.normalMap,
      roughnessMap: textures.roughnessMap,
      metalnessMap: textures.metalnessMap,
      emissiveMap: textures.emissiveMap,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity,
      metalness: 1,
      roughness: 1,
    })

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = material
    })
    enableShadows(model)
    fitToHeight(model, height)
  }, [model, textures, height, emissiveIntensity])

  useEffect(() => {
    const action = actions[animation]
    if (!action) return
    action.reset().fadeIn(0.4).play()
    return () => {
      action.fadeOut(0.3)
    }
  }, [actions, animation])

  // Separate from the play effect so changing speed doesn't restart/cross-fade the clip.
  useEffect(() => {
    const action = actions[animation]
    if (action) action.timeScale = speed
  }, [actions, animation, speed])

  return (
    <group ref={group} {...props}>
      <primitive object={model} />
    </group>
  )
}
