import { useFrame, useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import * as THREE from 'three'
import { enableShadows, asColor, fitToHeight, originalMaterialName } from './modelUtils'
import { notePages, type NoteBlock, type NotePage } from '../../../data/notes'

const BASE = '/models/clip-board'
const clipboardDividend=100

/** The page mesh is 23.76 x 33.1 local units and its UVs span the full 0..1 range. */
const PAGE_W = 744
const PAGE_H = 1024

/** Where the drawn chevrons live, in page UV space, so the hit zones can match them. */
const ARROW_V = 0.09
const ARROW_NEXT_U = 0.84
const ARROW_PREV_U = 0.16

/** Ballpoint palette: navy for headings, bic blue for accents and links, black ink for prose. */
const INK = {
  navy: '#12233f',
  blue: '#1f47a3',
  blueSoft: '#5877c4',
  black: '#1b1f27',
  grey: '#7c8492',
  hairline: 'rgba(18, 35, 63, 0.16)',
}
const FONT_HEAD = "Montserrat, 'Segoe UI', system-ui, sans-serif"
const FONT_BODY = "Inter, 'Segoe UI', system-ui, sans-serif"
/** Loaded up front so the canvas is painted with the real faces instead of the fallback. */
const FONT_SPECS = [
  `800 52px Montserrat`,
  `700 29px Montserrat`,
  `600 21px Inter`,
  `500 26px Inter`,
  `600 25px Inter`,
]

const MARGIN_X = 78
const CONTENT_W = PAGE_W - MARGIN_X * 2

function drawChevron(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: 1 | -1) {
  const r = 32
  ctx.save()
  ctx.strokeStyle = INK.blue
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - dir * r * 0.35, cy - r * 0.55)
  ctx.lineTo(cx + dir * r * 0.45, cy)
  ctx.lineTo(cx - dir * r * 0.35, cy + r * 0.55)
  ctx.stroke()
  ctx.restore()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Canvas has no letter-spacing in every engine, so tracked capitals are drawn glyph by glyph. */
function trackedWidth(ctx: CanvasRenderingContext2D, text: string, tracking: number) {
  let width = 0
  for (const ch of text) width += ctx.measureText(ch).width + tracking
  return width - tracking
}

function fillTracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number) {
  let cx = x
  for (const ch of text) {
    ctx.fillText(ch, cx, y)
    cx += ctx.measureText(ch).width + tracking
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** A clickable region of the sheet, in canvas pixels. */
type LinkRect = { url: string; x0: number; y0: number; x1: number; y1: number }
type PaintedPage = { texture: THREE.CanvasTexture; links: LinkRect[] }

/**
 * Paints one CV page over the paper diffuse. The page's v axis runs from the clip end (v=0)
 * to the far end (v=1) and three flips textures vertically, so drawing the canvas the
 * normal way up already reads correctly from the default camera.
 */
export function drawNote(
  paper: CanvasImageSource,
  page: NotePage,
  index: number,
  total: number,
): PaintedPage | null {
  const canvas = document.createElement('canvas')
  canvas.width = PAGE_W
  canvas.height = PAGE_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(paper, 0, 0, PAGE_W, PAGE_H)
  ctx.textBaseline = 'alphabetic'

  const links: LinkRect[] = []
  let y = 138

  if (page.eyebrow) {
    ctx.font = `600 21px ${FONT_BODY}`
    ctx.fillStyle = INK.blue
    fillTracked(ctx, page.eyebrow.toUpperCase(), MARGIN_X, y, 4.5)
    y += 48
  }

  ctx.font = `800 50px ${FONT_HEAD}`
  ctx.fillStyle = page.titleUrl ? INK.blue : INK.navy
  for (const line of wrapText(ctx, page.title, CONTENT_W)) {
    ctx.fillText(line, MARGIN_X, y)
    if (page.titleUrl) {
      const width = ctx.measureText(line).width
      ctx.fillRect(MARGIN_X, y + 11, width, 4)
      links.push({ url: page.titleUrl, x0: MARGIN_X - 8, y0: y - 44, x1: MARGIN_X + width + 8, y1: y + 20 })
    }
    y += 60
  }

  y += 6
  ctx.fillStyle = INK.blue
  ctx.fillRect(MARGIN_X, y, 88, 5)
  ctx.fillStyle = INK.hairline
  ctx.fillRect(MARGIN_X + 88, y + 2, CONTENT_W - 88, 1.5)
  y += 46

  if (page.subtitle) {
    ctx.font = `500 24px ${FONT_BODY}`
    ctx.fillStyle = INK.grey
    for (const line of wrapText(ctx, page.subtitle, CONTENT_W)) {
      ctx.fillText(line, MARGIN_X, y)
      y += 33
    }
    y += 14
  }

  // The blocks come from data, so measure them first and squash the body slightly if it
  // would run past the footer, instead of letting a long page spill off the sheet.
  const bodyStart = y
  const limit = PAGE_H * (1 - ARROW_V) - 62
  const measured = layoutBlocks(ctx, page.blocks, bodyStart, false, [])
  const fit = measured > limit ? (limit - bodyStart) / (measured - bodyStart) : 1

  const bodyLinks: LinkRect[] = []
  ctx.save()
  ctx.translate(MARGIN_X * (1 - fit), bodyStart * (1 - fit))
  ctx.scale(fit, fit)
  layoutBlocks(ctx, page.blocks, bodyStart, true, bodyLinks)
  ctx.restore()
  for (const rect of bodyLinks) {
    links.push({
      url: rect.url,
      x0: MARGIN_X * (1 - fit) + rect.x0 * fit,
      x1: MARGIN_X * (1 - fit) + rect.x1 * fit,
      y0: bodyStart * (1 - fit) + rect.y0 * fit,
      y1: bodyStart * (1 - fit) + rect.y1 * fit,
    })
  }

  const arrowY = PAGE_H * (1 - ARROW_V)
  ctx.fillStyle = INK.hairline
  ctx.fillRect(MARGIN_X, arrowY - 46, CONTENT_W, 1.5)

  ctx.font = `600 20px ${FONT_BODY}`
  ctx.fillStyle = INK.grey
  const counter = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`
  fillTracked(ctx, counter, (PAGE_W - trackedWidth(ctx, counter, 3)) / 2, arrowY + 7, 3)

  if (index < total - 1) drawChevron(ctx, PAGE_W * ARROW_NEXT_U, arrowY, 1)
  if (index > 0) drawChevron(ctx, PAGE_W * ARROW_PREV_U, arrowY, -1)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return { texture, links }
}

/** Lays the blocks out from `startY`, returning the y it ended on. `paint: false` only measures. */
function layoutBlocks(
  ctx: CanvasRenderingContext2D,
  blocks: NoteBlock[],
  startY: number,
  paint: boolean,
  links: LinkRect[],
) {
  let y = startY
  for (const block of blocks) {
    switch (block.kind) {
      case 'gap': {
        y += block.size ?? 20
        break
      }
      case 'lead':
      case 'text': {
        const size = block.kind === 'lead' ? 27 : 25
        ctx.font = `${block.kind === 'lead' ? 500 : 400} ${size}px ${FONT_BODY}`
        ctx.fillStyle = INK.black
        for (const line of wrapText(ctx, block.text, CONTENT_W)) {
          if (paint) ctx.fillText(line, MARGIN_X, y)
          y += size + 11
        }
        y += 6
        break
      }
      case 'heading': {
        ctx.font = `700 29px ${FONT_HEAD}`
        ctx.fillStyle = block.url ? INK.blue : INK.navy
        for (const line of wrapText(ctx, block.text, CONTENT_W)) {
          const width = ctx.measureText(line).width
          if (paint) {
            ctx.fillText(line, MARGIN_X, y)
            if (block.url) {
              ctx.fillRect(MARGIN_X, y + 7, width, 3)
              links.push({ url: block.url, x0: MARGIN_X - 8, y0: y - 28, x1: MARGIN_X + width + 8, y1: y + 14 })
            }
          }
          y += 38
        }
        y += 4
        break
      }
      case 'meta': {
        ctx.font = `500 22px ${FONT_BODY}`
        ctx.fillStyle = INK.grey
        for (const line of wrapText(ctx, block.text, CONTENT_W)) {
          if (paint) ctx.fillText(line, MARGIN_X, y)
          y += 30
        }
        y += 8
        break
      }
      case 'bullet': {
        const indent = 32
        ctx.font = `400 25px ${FONT_BODY}`
        const lines = wrapText(ctx, block.text, CONTENT_W - indent)
        lines.forEach((line, i) => {
          if (paint) {
            if (i === 0) {
              ctx.fillStyle = INK.blue
              ctx.beginPath()
              ctx.arc(MARGIN_X + 7, y - 8, 4.5, 0, Math.PI * 2)
              ctx.fill()
            }
            ctx.fillStyle = INK.black
            ctx.fillText(line, MARGIN_X + indent, y)
          }
          y += 34
        })
        y += 6
        break
      }
      case 'tags': {
        ctx.font = `600 20px ${FONT_BODY}`
        const height = 34
        const padX = 15
        const gap = 9
        let x = MARGIN_X
        for (const tag of block.items) {
          const width = ctx.measureText(tag).width + padX * 2
          if (x > MARGIN_X && x + width > MARGIN_X + CONTENT_W) {
            x = MARGIN_X
            y += height + gap
          }
          if (paint) {
            roundRect(ctx, x, y - 24, width, height, 9)
            ctx.strokeStyle = INK.blueSoft
            ctx.lineWidth = 2
            ctx.stroke()
            ctx.fillStyle = INK.blue
            ctx.fillText(tag, x + padX, y)
          }
          x += width + gap
        }
        y += height + 14
        break
      }
      case 'links': {
        ctx.font = `600 25px ${FONT_BODY}`
        for (const item of block.items) {
          const width = ctx.measureText(item.label).width
          if (paint) {
            ctx.strokeStyle = INK.blue
            ctx.lineWidth = 3
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.beginPath()
            ctx.moveTo(MARGIN_X + 4, y - 17)
            ctx.lineTo(MARGIN_X + 13, y - 8)
            ctx.lineTo(MARGIN_X + 4, y + 1)
            ctx.stroke()

            ctx.fillStyle = INK.blue
            ctx.fillText(item.label, MARGIN_X + 28, y)
            ctx.fillRect(MARGIN_X + 28, y + 7, width, 2.5)
            links.push({
              url: item.url,
              x0: MARGIN_X - 4,
              y0: y - 28,
              x1: MARGIN_X + 28 + width + 10,
              y1: y + 14,
            })
          }
          y += 42
        }
        y += 4
        break
      }
    }
  }
  return y
}

/** Repaints the sheets once the web fonts are in, so the first paint is not the fallback face. */
function useFontsReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    const done = () => alive && setReady(true)
    Promise.all(FONT_SPECS.map((spec) => document.fonts.load(spec)))
      .then(() => document.fonts.ready)
      .then(done, done)
    return () => {
      alive = false
    }
  }, [])
  return ready
}


type PageFrame = { x: number; y: number; width: number; depth: number; hingeZ: number }

/** Vertical spacing between stacked sheets, in world units. */
const SHEET_GAP = 0.0004
/** How many full circles the sheet wraps onto itself once it is completely rolled. */
const ROLL_TURNS = 1.15
const ROLL_RADIUS = 0.3
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
    group.position.y = frame.y + offset + tuck * ROLL_RADIUS * frame.depth * 0.06

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
  const fontsReady = useFontsReady()

  const painted = useMemo(() => {
    const paper = textures.pageMap.image as CanvasImageSource | undefined
    if (!paper) return []
    return pages.map((p, i) => drawNote(paper, p, i, pages.length))
  }, [textures.pageMap, pages, fontsReady])

  useEffect(() => () => painted.forEach((p) => p?.texture.dispose()), [painted])

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
        painted.map((page, i) => (
          <PageSheet
            key={i}
            frame={frame}
            map={page?.texture ?? null}
            paper={textures.pageMap}
            lifted={i < pageIndex}
            // Top of the stack first, so page 0 sits highest and flips off on its own.
            offset={(painted.length - i) * SHEET_GAP}
          />
        ))}
      {frame && interactive && (
        <>
          {painted[pageIndex]?.links.map((rect, i) => (
            <LinkZone key={i} frame={frame} rect={rect} stack={painted.length} />
          ))}
          {onPageChange && pageIndex < pages.length - 1 && (
            <ArrowZone
              frame={frame}
              u={ARROW_NEXT_U}
              stack={painted.length}
              onSelect={() => onPageChange(pageIndex + 1)}
            />
          )}
          {onPageChange && pageIndex > 0 && (
            <ArrowZone
              frame={frame}
              u={ARROW_PREV_U}
              stack={painted.length}
              onSelect={() => onPageChange(pageIndex - 1)}
            />
          )}
        </>
      )}
    </group>
  )
}

/**
 * Invisible pad over a link drawn on the paper. Canvas pixels map straight to the sheet's
 * UVs, and textures are flipped vertically, so canvas row v sits (1 - v) of the page depth
 * back from the clip edge.
 */
function LinkZone({ frame, rect, stack }: { frame: PageFrame; rect: LinkRect; stack: number }) {
  const u0 = rect.x0 / PAGE_W
  const u1 = rect.x1 / PAGE_W
  const v0 = rect.y0 / PAGE_H
  const v1 = rect.y1 / PAGE_H

  return (
    <mesh
      position={[
        frame.x + ((u0 + u1) / 2 - 0.5) * frame.width,
        frame.y + (stack + 2) * SHEET_GAP,
        frame.hingeZ - (1 - (v0 + v1) / 2) * frame.depth,
      ]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        e.stopPropagation()
        window.open(rect.url, '_blank', 'noopener,noreferrer')
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
    >
      <planeGeometry args={[(u1 - u0) * frame.width, (v1 - v0) * frame.depth]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
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
