import { useFrame, useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import * as THREE from 'three'
import { enableShadows, asColor, fitToHeight, originalMaterialName } from './modelUtils'
import { notePages, type NoteItem, type NotePage } from '../../../data/notes'

const BASE = '/models/clip-board'
const clipboardDividend=100

/** The page mesh is 23.76 x 33.1 local units and its UVs span the full 0..1 range. */
const PAGE_W = 744
const PAGE_H = 1024

/** Where the drawn chevrons live, in page UV space, so the hit zones can match them. */
const ARROW_V = 0.09
const ARROW_NEXT_U = 0.84
const ARROW_PREV_U = 0.16

function drawChevron(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: 1 | -1) {
  const r = 40
  ctx.save()
  ctx.lineWidth = 10
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - dir * r * 0.4, cy - r * 0.6)
  ctx.lineTo(cx + dir * r * 0.5, cy)
  ctx.lineTo(cx - dir * r * 0.4, cy + r * 0.6)
  ctx.stroke()
  ctx.restore()
}

/**
 * Paints the note over the paper diffuse. The page's v axis runs from the clip end (v=0)
 * to the far end (v=1) and three flips textures vertically, so drawing the canvas the
 * normal way up already reads correctly from the default camera.
 */
function drawNote(
  paper: CanvasImageSource,
  title: string,
  items: NoteItem[],
  hasPrev: boolean,
  hasNext: boolean,
) {
  const canvas = document.createElement('canvas')
  canvas.width = PAGE_W
  canvas.height = PAGE_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(paper, 0, 0, PAGE_W, PAGE_H)

  const marginX = 90
  const ink = '#26303f'
  const handwriting = `'Segoe Script', 'Bradley Hand', 'Comic Sans MS', cursive`

  ctx.fillStyle = ink
  ctx.strokeStyle = ink
  ctx.textBaseline = 'alphabetic'

  ctx.font = `bold 86px ${handwriting}`
  ctx.fillText(title, marginX, 210)
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(marginX, 240)
  ctx.lineTo(marginX + ctx.measureText(title).width, 240)
  ctx.stroke()

  ctx.font = `52px ${handwriting}`
  ctx.lineWidth = 5

  items.forEach((item, i) => {
    const y = 360 + i * 115
    const box = 44

    ctx.strokeRect(marginX, y - box + 8, box, box)
    ctx.fillText(item.text, marginX + box + 28, y)

    if (!item.done) return
    ctx.beginPath()
    ctx.moveTo(marginX + 8, y - box / 2 + 6)
    ctx.lineTo(marginX + box / 2, y + 4)
    ctx.lineTo(marginX + box + 14, y - box - 6)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(marginX + box + 22, y - 16)
    ctx.lineTo(marginX + box + 36 + ctx.measureText(item.text).width, y - 16)
    ctx.stroke()
  })

  const arrowY = PAGE_H * (1 - ARROW_V)
  if (hasNext) drawChevron(ctx, PAGE_W * ARROW_NEXT_U, arrowY, 1)
  if (hasPrev) drawChevron(ctx, PAGE_W * ARROW_PREV_U, arrowY, -1)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

type PageFrame = { x: number; y: number; width: number; depth: number; hingeZ: number }

/** Vertical spacing between stacked sheets, in world units. */
const SHEET_GAP = 0.0004
/** How many full circles the sheet wraps onto itself once it is completely rolled. */
const ROLL_TURNS = 1.15

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/**
 * One sheet, hinged on the far edge from the clip. It rolls itself into an even scroll and
 * then swings a half turn around that edge so the scroll ends up tucked under the board.
 */
function PageSheet({
  frame,
  map,
  paper,
  lifted,
  offset,
}: {
  frame: PageFrame
  map: THREE.Texture | null
  paper: THREE.Texture
  lifted: boolean
  offset: number
}) {
  const pivot = useRef<THREE.Group>(null)
  const progress = useRef(lifted ? 1 : 0)
  const lastProgress = useRef(-1)

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(frame.width, frame.depth, 1, 56)
    g.userData.rest = Float32Array.from(g.attributes.position.array as Float32Array)
    return g
  }, [frame.width, frame.depth])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, delta) => {
    const group = pivot.current
    if (!group) return
    progress.current = THREE.MathUtils.damp(
      progress.current,
      lifted ? 1 : 0,
      3.2,
      Math.min(delta, 0.05),
    )
    const t = progress.current
    if (Math.abs(t - lastProgress.current) < 0.0004) return
    lastProgress.current = t

    // Two overlapping beats: the sheet rolls itself up first, then the finished scroll
    // swings over the clip and tucks underneath. It never unrolls, so it stays a scroll.
    const roll = smoothstep(0, 0.6, t)
    const tuck = smoothstep(0.3, 1, t)
    // Negative, so the sheet lifts away from the board on its way over rather than diving.
    group.rotation.x = -tuck * Math.PI
    group.position.y = frame.y + offset + Math.sin(Math.PI * t) * frame.depth * 0.06

    // Roll onto a cylinder whose axis is the hinge: a point s along the page maps to the
    // arc (sin(ks)/k, (1-cos(ks))/k). k is the curvature, so 1/k is the scroll's radius.
    // s runs from the bottom edge upward, which is where the sheet peels from.
    const half = frame.depth / 2
    const k = (roll * ROLL_TURNS * Math.PI * 2) / frame.depth
    const position = geometry.attributes.position
    const rest = geometry.userData.rest as Float32Array
    for (let i = 0; i < position.count; i += 1) {
      const restY = rest[i * 3 + 1]
      if (k < 1e-4) {
        position.setY(i, restY)
        position.setZ(i, 0)
        continue
      }
      const s = half - restY
      position.setY(i, half - Math.sin(k * s) / k)
      position.setZ(i, (1 - Math.cos(k * s)) / k)
    }
    position.needsUpdate = true
    geometry.computeVertexNormals()
  })

  return (
    <group ref={pivot} position={[frame.x, frame.y + offset, frame.hingeZ - frame.depth]}>
      <mesh geometry={geometry} position={[0, 0, frame.depth / 2]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <meshStandardMaterial map={map ?? paper} roughness={0.9} side={THREE.FrontSide} />
      </mesh>
      {/* Same geometry, back faces only: a flipped page shows blank paper, not mirrored ink. */}
      <mesh geometry={geometry} position={[0, 0, frame.depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial map={paper} roughness={0.9} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

export function ClipBoard({
  height = 1 / clipboardDividend,
  pages = notePages,
  pageIndex = 0,
  interactive = false,
  onPageChange,
  ...props
}: {
  height?: number
  pages?: NotePage[]
  pageIndex?: number
  interactive?: boolean
  onPageChange?: (index: number) => void
} & JSX.IntrinsicElements['group']) {
  const fbx = useLoader(FBXLoader, `${BASE}/source/ClipBoard.fbx`)
  const textures = useTexture({
    boardMap: `${BASE}/textures/clipboard2_board_Diffuse.png`,
    pageMap: `${BASE}/textures/clipboard2_page_Diffuse.png`,
  })

  const model = useMemo(() => fbx.clone(true), [fbx])
  const [frame, setFrame] = useState<PageFrame | null>(null)

  const pageMaps = useMemo(() => {
    const paper = textures.pageMap.image as CanvasImageSource | undefined
    if (!paper) return []
    return pages.map((p, i) => drawNote(paper, p.title, p.items, i > 0, i < pages.length - 1))
  }, [textures.pageMap, pages])

  useEffect(() => () => pageMaps.forEach((t) => t?.dispose()), [pageMaps])

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

    // The sheets are separate planes laid over the model's page, so they need that
    // mesh's box expressed in the wrapping group's space.
    const pageMesh = model.getObjectByName('page') as THREE.Mesh | null
    if (!pageMesh) return
    pageMesh.geometry.computeBoundingBox()
    model.updateMatrix()
    model.updateMatrixWorld(true)
    const pageToModel = new THREE.Matrix4().copy(model.matrixWorld).invert().multiply(pageMesh.matrixWorld)
    const pageToGroup = new THREE.Matrix4().multiplyMatrices(model.matrix, pageToModel)
    const box = pageMesh.geometry.boundingBox!.clone().applyMatrix4(pageToGroup)

    setFrame({
      x: (box.min.x + box.max.x) / 2,
      y: box.max.y,
      width: box.max.x - box.min.x,
      depth: box.max.z - box.min.z,
      hingeZ: box.max.z,
    })
  }, [model, textures, height])

  return (
    <group {...props}>
      <primitive object={model} />
      {frame &&
        pageMaps.map((map, i) => (
          <PageSheet
            key={i}
            frame={frame}
            map={map}
            paper={textures.pageMap}
            lifted={i < pageIndex}
            // Top of the stack first, so page 0 sits highest and flips off on its own.
            offset={(pageMaps.length - i) * SHEET_GAP}
          />
        ))}
      {frame && interactive && onPageChange && (
        <>
          {pageIndex < pages.length - 1 && (
            <ArrowZone
              frame={frame}
              u={ARROW_NEXT_U}
              stack={pageMaps.length}
              onSelect={() => onPageChange(pageIndex + 1)}
            />
          )}
          {pageIndex > 0 && (
            <ArrowZone
              frame={frame}
              u={ARROW_PREV_U}
              stack={pageMaps.length}
              onSelect={() => onPageChange(pageIndex - 1)}
            />
          )}
        </>
      )}
    </group>
  )
}

/**
 * Invisible pad over a chevron drawn on the paper. It has to stay renderable (opacity 0
 * rather than visible={false}) or it drops out of the raycast.
 */
function ArrowZone({
  frame,
  u,
  stack,
  onSelect,
}: {
  frame: PageFrame
  u: number
  stack: number
  onSelect: () => void
}) {
  return (
    <mesh
      position={[
        frame.x + (u - 0.5) * frame.width,
        frame.y + (stack + 2) * SHEET_GAP,
        // Textures are flipped vertically, so the chevron's canvas row maps to v = ARROW_V,
        // which sits ARROW_V of the way from the clip end.
        frame.hingeZ - ARROW_V * frame.depth,
      ]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
    >
      <planeGeometry args={[frame.width * 0.28, frame.depth * 0.14]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}
