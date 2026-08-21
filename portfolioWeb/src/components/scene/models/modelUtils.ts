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
 * Returns a color-boosted copy of a diffuse texture (luminance-preserving saturation push,
 * done via canvas pixel manipulation since three.js textures don't expose HSL adjustment).
 * Result is cached on the source texture's userData so StrictMode's double effect invocation
 * (and repeat calls) don't rebuild the canvas/texture every time.
 */
export function saturateTexture(texture: THREE.Texture, amount = 1.3): THREE.Texture {
  if (amount === 1) return texture
  if (texture.userData.__saturated) return texture.userData.__saturated as THREE.Texture

  const image = texture.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined
  if (!image || !image.width || !image.height) return texture

  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return texture

  ctx.drawImage(image as CanvasImageSource, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  const clamp255 = (v: number) => Math.min(255, Math.max(0, v))

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const luma = 0.299 * r + 0.587 * g + 0.114 * b
    data[i] = clamp255(luma + (r - luma) * amount)
    data[i + 1] = clamp255(luma + (g - luma) * amount)
    data[i + 2] = clamp255(luma + (b - luma) * amount)
  }
  ctx.putImageData(imageData, 0, 0)

  const saturated = new THREE.CanvasTexture(canvas)
  saturated.colorSpace = texture.colorSpace
  saturated.wrapS = texture.wrapS
  saturated.wrapT = texture.wrapT
  saturated.flipY = texture.flipY
  saturated.repeat.copy(texture.repeat)
  saturated.needsUpdate = true

  texture.userData.__saturated = saturated
  return saturated
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
 * Returns the mesh's original (as-parsed) diffuse color, caching it in userData for the
 * same StrictMode-safety reason as `originalMaterialName`. Some FBX models (e.g. the pen
 * holder, whose "pens" are separate meshes each with their own DiffuseColor) rely on this
 * per-mesh color instead of a single shared material name/texture.
 */
export function originalMaterialColor(mesh: THREE.Mesh, fallback: THREE.ColorRepresentation = '#ffffff') {
  if (mesh.userData.__originalColor === undefined) {
    const material = mesh.material as THREE.MeshStandardMaterial | THREE.MeshPhongMaterial | undefined
    mesh.userData.__originalColor = material?.color ? material.color.clone() : new THREE.Color(fallback)
  }
  return mesh.userData.__originalColor as THREE.Color
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
