import * as THREE from 'three'

/** Marks every mesh in the hierarchy as a shadow caster/receiver. */
export function enableShadows(object: THREE.Object3D) {
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
}

export function asColor(tex?: THREE.Texture) {
  if (tex) tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * Returns the mesh's original (as-parsed) material name, caching it in userData.
 * Needed because material-matching effects reassign `mesh.material` to a brand-new
 * (unnamed) material; without caching, React StrictMode's double effect invocation
 * in dev would read back that blank name on the second run and mis-route materials.
 */
export function originalMaterialName(mesh: THREE.Mesh) {
  if (mesh.userData.__originalMaterialName === undefined) {
    mesh.userData.__originalMaterialName = (mesh.material as THREE.Material | undefined)?.name ?? mesh.name
  }
  return mesh.userData.__originalMaterialName as string
}

/**
 * Scales the object so its bounding-box height matches targetHeight, then grounds/centers it at the local origin.
 *
 * Measures while temporarily detached from its parent. `Box3.setFromObject` works in
 * world space, so if left attached, any rotation/position on the wrapping `<group>`
 * (set via JSX props, e.g. Room.tsx) would leak into the measurement — producing a
 * world-space offset that then gets applied to the object's local position, shifting
 * or hiding rotated models. Detaching also sidesteps a timing race where the parent's
 * matrixWorld may not be up to date yet on the very first render (before any frame
 * has been rendered), which otherwise made results depend on load timing.
 */
export function fitToHeight(object: THREE.Object3D, targetHeight: number, debugLabel?: string) {
  // Guard against StrictMode's double-invoked effects re-fitting an already-fitted object.
  if (object.userData.__fitted) return
  object.userData.__fitted = true

  const parent = object.parent
  parent?.remove(object)

  const box = new THREE.Box3().setFromObject(object)
  const size = new THREE.Vector3()
  box.getSize(size)
  if (debugLabel) {
    // eslint-disable-next-line no-console
    console.warn(`[fitToHeight] ${debugLabel} raw size:`, size.x, size.y, size.z)
  }
  if (size.y > 0) {
    // multiplyScalar (not setScalar): some loaders (e.g. ColladaLoader) bake a unit
    // conversion into the root object's own scale. Overwriting it outright ignores
    // that factor, throwing off the size by whatever that baked-in scale was.
    object.scale.multiplyScalar(targetHeight / size.y)
  }
  const box2 = new THREE.Box3().setFromObject(object)
  const center = new THREE.Vector3()
  box2.getCenter(center)
  object.position.x -= center.x
  object.position.z -= center.z
  object.position.y -= box2.min.y

  parent?.add(object)
}
