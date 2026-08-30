import { useEffect, useMemo, type JSX } from 'react'
import { useLoader } from '@react-three/fiber'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import * as THREE from 'three'
import { fitToHeight } from './modelUtils'
import { asset } from '../../../asset'

const BASE = asset('/models/greek-modular-environment/source/extracted/GreekModularEnvironment')

// useLoader keeps ONE loader instance per constructor, and setMaterials mutates it — without a
// private subclass this model and the Gojo OBJ overwrite each other's .mtl before either parses.
class GreekOBJLoader extends OBJLoader {}

// Leaf/hedge diffuse textures ship a real alpha channel for cutout cards (verified: Palm/Cordyline/Hedge Diff.png are RGBA; Grass/Trunk are opaque RGB).
const FOLIAGE_ALPHA_PATTERN = /leaf|hedge|cordyline/i

// These material names have no map_Kd of their own in the .mtl but are duplicate/variant groups of an asset that does.
const ORPHAN_MATERIAL_MAP_SOURCE: Record<string, string> = {
  pasted__blinn1SG: 'blinn1SG', // trunk variant, sibling has TrunkDiff
  blinn3SG1: 'pasted__blinn3SG1', // cordyline variant, sibling has CordylineDiff
  pasted__blinn2SG: 'pasted__pasted__blinn2SG', // palm frond variant, sibling has PalmLeafDiff
}

/** Sketchfab "Greek Modular Environment" diorama (buildings/hedges/grass) — used as distant scenery seen through the Wall's window. */
export function GreekEnvironment({
  height = 8.5,
  onReady,
  ...props
}: { height?: number; onReady?: () => void } & JSX.IntrinsicElements['group']) {
  const materials = useLoader(MTLLoader, `${BASE}/GreekModularEnvironment.mtl`)
  const obj = useLoader(GreekOBJLoader, `${BASE}/GreekModularEnvironment.obj`, (loader) => {
    materials.preload()
    loader.setMaterials(materials)
  })

  const model = useMemo(() => obj.clone(true), [obj])

  useEffect(() => {
    // The .mtl's own map_Kd file name, because on a cold load mat.map.image is still
    // undefined (TextureLoader fills it in asynchronously) and reading .image.src there
    // returned '' — which is why the foliage only looked right after a reload.
    const mapFile = (name: string) => materials.materialsInfo[name]?.map_kd ?? ''

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const meshMaterials = (child as THREE.Mesh).material as THREE.MeshPhongMaterial | THREE.MeshPhongMaterial[]
        const list = Array.isArray(meshMaterials) ? meshMaterials : [meshMaterials]
        for (const mat of list) {
          if (!mat) continue
          // A few material variants (e.g. duplicate trunk/cordyline/palm-leaf groups) are missing their diffuse
          // map in this .mtl even though a sibling material of the same asset has it — borrow that sibling's map.
          const siblingName = ORPHAN_MATERIAL_MAP_SOURCE[mat.name]
          if (!mat.map) {
            const sibling = siblingName ? (materials.materials[siblingName] as THREE.MeshPhongMaterial | undefined) : undefined
            if (sibling?.map) mat.map = sibling.map
          }
          if (mat.map) {
            mat.map.colorSpace = THREE.SRGBColorSpace
            // this .mtl sets Kd (diffuse color) to black wherever map_Kd is used, which multiplies the texture to black — reset to white so the map shows through.
            mat.color.set('#ffffff')
            const textureFile = mapFile(mat.name) || (siblingName ? mapFile(siblingName) : '')
            if (FOLIAGE_ALPHA_PATTERN.test(textureFile)) {
              // leaf/hedge cutout cards ship an alpha channel; without this they render as solid opaque silhouettes.
              mat.transparent = true
              mat.alphaTest = 0.5
              mat.side = THREE.DoubleSide
            }
            mat.needsUpdate = true
          }
        }
      }
    })
    fitToHeight(model, height)
    onReady?.()
  }, [model, height, materials, onReady])

  return (
    <group {...props}>
      <primitive object={model} />
    </group>
  )
}
