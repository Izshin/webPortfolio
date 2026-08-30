import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { devDragging } from './DevTransform'

type CameraRigProps = {
  basePosition: [number, number, number]
  lookAt?: [number, number, number]
  /** How far the camera drifts from basePosition at the edges of the viewport, in world units. */
  amplitude?: [number, number]
  /** Lerp factor per frame — lower is smoother/laggier. */
  damping?: number
  /** When set, the camera glides here instead of the base framing (used to zoom onto a prop). */
  focus?: { position: [number, number, number]; lookAt: [number, number, number] } | null
  /** Lerp factor used while flying to/from a focus target. */
  focusDamping?: number
  /** Must match the <PerspectiveCamera fov> this rig drives, so the responsive adjustment below has an unadjusted baseline to lerp from. */
  baseFov?: number
  /** Yaw (radians) applied to the idle look-at point around the camera position — mobile's look left/right toggle. Turns the camera in place instead of sliding it sideways. */
  pan?: number
  /** >1 dollies the focus camera closer to `focus.lookAt` — mobile pinch/double-tap zoom while reading a prop. No effect when idle. */
  zoom?: number
}

// The whole scene (desk position, lookAt, fov) was composed for a landscape browser window.
// On a narrower/taller viewport (portrait phones) a fixed fov+distance crops the sides hard —
// e.g. the boombox/clipboard framing goes edge-to-edge — so both fov and camera distance widen
// smoothly as aspect drops below this reference, back to exactly the tuned framing above it.
const WIDE_ASPECT = 1.6
const NARROW_ASPECT = 0.5
const MAX_FOV = 56
const MAX_PULLBACK = 1.35
const Y_AXIS = new THREE.Vector3(0, 1, 0)

/** Gives the camera a very subtle parallax drift that follows the pointer, like a living room, not a static render. */
export function CameraRig({
  basePosition,
  lookAt = [0, 0.55, -0.2],
  amplitude = [0.08, 0.04],
  damping = 0.02,
  focus = null,
  focusDamping = 0.06,
  baseFov = 42,
  pan = 0,
  zoom = 1,
}: CameraRigProps) {
  const target = useRef(new THREE.Vector3())
  const aim = useRef(new THREE.Vector3(...lookAt))
  const desiredAim = useRef(new THREE.Vector3())
  const idleBase = useRef(new THREE.Vector3(...basePosition))
  const aimOffset = useRef(new THREE.Vector3())
  const zoomLookAt = useRef(new THREE.Vector3())
  const { camera, pointer, size } = useThree()
  const [ax, ay] = amplitude

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    if (!cam.isPerspectiveCamera) return

    const aspect = size.width / size.height
    const t = THREE.MathUtils.clamp((WIDE_ASPECT - aspect) / (WIDE_ASPECT - NARROW_ASPECT), 0, 1)

    cam.fov = THREE.MathUtils.lerp(baseFov, MAX_FOV, t)
    cam.updateProjectionMatrix()

    const pullback = THREE.MathUtils.lerp(1, MAX_PULLBACK, t)
    const lookAtVec = new THREE.Vector3(...lookAt)
    idleBase.current
      .set(...basePosition)
      .sub(lookAtVec)
      .multiplyScalar(pullback)
      .add(lookAtVec)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, size.width, size.height, baseFov, basePosition[0], basePosition[1], basePosition[2], lookAt[0], lookAt[1], lookAt[2]])

  useFrame(() => {
    if (devDragging.active) return

    if (focus) {
      zoomLookAt.current.set(...focus.lookAt)
      target.current.set(...focus.position)
      // Dolly toward the look-at point along the same line, rather than changing fov, so
      // the framing stays perspective-correct while zoomed in.
      if (zoom !== 1) target.current.sub(zoomLookAt.current).divideScalar(zoom).add(zoomLookAt.current)
      desiredAim.current.set(...focus.lookAt)
    } else {
      const { x: bx, y: by, z: bz } = idleBase.current
      target.current.set(bx + pointer.x * ax, by - pointer.y * ay, bz)

      // Rotate the look-at point around the idle camera position instead of sliding the
      // camera sideways — turning to look left/right feels natural without changing seat.
      aimOffset.current.set(lookAt[0] - bx, lookAt[1] - by, lookAt[2] - bz)
      aimOffset.current.applyAxisAngle(Y_AXIS, pan)
      desiredAim.current.set(bx + aimOffset.current.x, by + aimOffset.current.y, bz + aimOffset.current.z)
    }

    // Big moves (flying to a prop and back) use focusDamping; the tiny idle parallax
    // keeps the gentler `damping` so it stays a drift rather than a follow. Position and
    // aim must share the factor, or the last stretch keeps swivelling after the camera
    // has all but stopped.
    const flying = focus !== null || camera.position.distanceTo(target.current) > 0.05
    const t = flying ? focusDamping : damping
    camera.position.lerp(target.current, t)
    aim.current.lerp(desiredAim.current, t)
    camera.lookAt(aim.current)
  })

  return null
}

