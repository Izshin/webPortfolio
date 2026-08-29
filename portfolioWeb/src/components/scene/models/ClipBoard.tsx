import { useFrame, useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import * as THREE from 'three'
import { enableShadows, asColor, fitToHeight, originalMaterialName } from './modelUtils'
import { notePagesByLang, type NoteBlock, type NoteLang, type NotePage } from '../../../data/notes'
import { asset } from '../../../asset'

const BASE = asset('/models/clip-board')
const clipboardDividend=100
const POP_SOUND = asset('/soundEffects/Pop.mp3')
const PAGE_TURN_SOUND = asset('/soundEffects/PageTurn.mp3')

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

/** Language toggle, top right of the first page. */
const FLAG_W = 46
const FLAG_H = 30
const FLAG_TOP = 104
const FLAG_GAP = 12

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

/** Splits `plain [label](url) plain` into styled runs. */
function parseRuns(source: string) {
  const runs: { text: string; url?: string }[] = []
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source))) {
    if (match.index > last) runs.push({ text: source.slice(last, match.index) })
    runs.push({ text: match[1], url: match[2] })
    last = match.index + match[0].length
  }
  if (last < source.length) runs.push({ text: source.slice(last) })
  return runs
}

/**
 * Word-wraps text that may carry inline links, painting those in blue with an underline and
 * collecting their hit rect. Returns the y just past the last line.
 */
function drawRich(
  ctx: CanvasRenderingContext2D,
  source: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  color: string,
  paint: boolean,
  links: LinkRect[],
) {
  const spaceWidth = ctx.measureText(' ').width
  let cx = x
  let first = true

  for (const run of parseRuns(source)) {
    for (const word of run.text.split(/\s+/).filter(Boolean)) {
      const width = ctx.measureText(word).width
      if (!first) {
        if (cx + spaceWidth + width > x + maxWidth) {
          y += lineHeight
          cx = x
        } else {
          cx += spaceWidth
        }
      }
      if (paint) {
        ctx.fillStyle = run.url ? INK.blue : color
        ctx.fillText(word, cx, y)
        if (run.url) {
          ctx.fillRect(cx, y + 6, width, 2)
          links.push({ url: run.url, x0: cx - 4, y0: y - lineHeight * 0.72, x1: cx + width + 4, y1: y + 12 })
        }
      }
      cx += width
      first = false
    }
  }
  return y + lineHeight
}

/** A clickable region of the sheet, in canvas pixels. Either opens a url or picks a language. */
type LinkRect = { url?: string; lang?: NoteLang; x0: number; y0: number; x1: number; y1: number }
type PaintedPage = { texture: THREE.CanvasTexture; links: LinkRect[] }

function drawSpainFlag(ctx: CanvasRenderingContext2D, x: number, y: number, active: boolean) {
  ctx.fillStyle = active ? '#c60b1e' : '#b9bec8'
  ctx.fillRect(x, y, FLAG_W, FLAG_H)
  ctx.fillStyle = active ? '#ffc400' : '#e2e5ea'
  ctx.fillRect(x, y + FLAG_H * 0.25, FLAG_W, FLAG_H * 0.5)
}

function drawUkFlag(ctx: CanvasRenderingContext2D, x: number, y: number, active: boolean) {
  const white = active ? '#ffffff' : '#eef0f3'
  const red = active ? '#c8102e' : '#c6cbd4'
  ctx.fillStyle = active ? '#012169' : '#aab0bb'
  ctx.fillRect(x, y, FLAG_W, FLAG_H)
  for (const [color, thickness] of [
    [white, FLAG_H * 0.28],
    [red, FLAG_H * 0.12],
  ] as const) {
    ctx.strokeStyle = color
    ctx.lineWidth = thickness
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + FLAG_W, y + FLAG_H)
    ctx.moveTo(x + FLAG_W, y)
    ctx.lineTo(x, y + FLAG_H)
    ctx.stroke()
  }
  for (const [color, thickness] of [
    [white, FLAG_H * 0.36],
    [red, FLAG_H * 0.2],
  ] as const) {
    ctx.fillStyle = color
    ctx.fillRect(x, y + (FLAG_H - thickness) / 2, FLAG_W, thickness)
    ctx.fillRect(x + (FLAG_W - thickness) / 2, y, thickness, FLAG_H)
  }
}

/** The active flag keeps its colours, the other one is greyed out. */
function drawLanguageToggle(ctx: CanvasRenderingContext2D, lang: NoteLang, links: LinkRect[]) {
  const enX = PAGE_W - MARGIN_X - FLAG_W
  const esX = enX - FLAG_GAP - FLAG_W

  for (const item of [
    { x: esX, lang: 'es' as const },
    { x: enX, lang: 'en' as const },
  ]) {
    const active = item.lang === lang
    ctx.save()
    roundRect(ctx, item.x, FLAG_TOP, FLAG_W, FLAG_H, 4)
    ctx.clip()
    if (item.lang === 'es') drawSpainFlag(ctx, item.x, FLAG_TOP, active)
    else drawUkFlag(ctx, item.x, FLAG_TOP, active)
    ctx.restore()

    roundRect(ctx, item.x, FLAG_TOP, FLAG_W, FLAG_H, 4)
    ctx.strokeStyle = active ? INK.blue : 'rgba(18, 35, 63, 0.2)'
    ctx.lineWidth = active ? 2.5 : 1.5
    ctx.stroke()

    links.push({
      lang: active ? (item.lang === 'es' ? 'en' : 'es') : item.lang,
      x0: item.x - 6,
      y0: FLAG_TOP - 8,
      x1: item.x + FLAG_W + 6,
      y1: FLAG_TOP + FLAG_H + 8,
    })
  }
}

/**
 * Paints one CV page over the paper diffuse. The page's v axis runs from the clip end (v=0)
 * to the far end (v=1) and three flips textures vertically, so drawing the canvas the
 * normal way up already reads correctly from the default camera.
 */function drawNote(
  paper: CanvasImageSource,
  page: NotePage,
  index: number,
  total: number,
  lang: NoteLang,
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

  if (index === 0) drawLanguageToggle(ctx, lang, links)

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
  // The accent rule doubles as a progress bar: full width on the last page.
  const progress = (CONTENT_W * (index + 1)) / total
  ctx.fillStyle = INK.blue
  ctx.fillRect(MARGIN_X, y, progress, 5)
  ctx.fillStyle = INK.hairline
  ctx.fillRect(MARGIN_X + progress, y + 2, CONTENT_W - progress, 1.5)
  y += 46

  if (page.subtitle) {
    ctx.font = `500 24px ${FONT_BODY}`
    y = drawRich(ctx, page.subtitle, MARGIN_X, y, CONTENT_W, 33, INK.grey, true, links)
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

/** The model's page diffuse is a dull grey scan; this washes it back to real paper white. */
const PAPER_WASH = 0.7

function whitenPaper(source: CanvasImageSource) {
  const canvas = document.createElement('canvas')
  canvas.width = PAGE_W
  canvas.height = PAGE_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(source, 0, 0, PAGE_W, PAGE_H)
  ctx.fillStyle = `rgba(255, 255, 255, ${PAPER_WASH})`
  ctx.fillRect(0, 0, PAGE_W, PAGE_H)
  return canvas
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
        y = drawRich(ctx, block.text, MARGIN_X, y, CONTENT_W, size + 11, INK.black, paint, links)
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
        y = drawRich(ctx, block.text, MARGIN_X, y, CONTENT_W, 30, INK.grey, paint, links)
        y += 8
        break
      }
      case 'hint': {
        ctx.font = `500 23px ${FONT_BODY}`
        ctx.fillStyle = INK.blue
        for (const line of wrapText(ctx, block.text, CONTENT_W)) {
          if (paint) {
            ctx.fillText(line, MARGIN_X, y)
            const at = block.underline ? line.indexOf(block.underline) : -1
            if (at >= 0 && block.underline) {
              const x = MARGIN_X + ctx.measureText(line.slice(0, at)).width
              ctx.fillRect(x, y + 6, ctx.measureText(block.underline).width, 2)
            }
          }
          y += 32
        }
        y += 6
        break
      }
      case 'bullet': {
        const indent = 32
        ctx.font = `400 25px ${FONT_BODY}`
        if (paint) {
          ctx.fillStyle = INK.blue
          ctx.beginPath()
          ctx.arc(MARGIN_X + 7, y - 8, 4.5, 0, Math.PI * 2)
          ctx.fill()
        }
        y = drawRich(ctx, block.text, MARGIN_X + indent, y, CONTENT_W - indent, 34, INK.black, paint, links)
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
  // Swapping the language swaps the texture, so the sheet gives a small settle instead of
  // changing in place with no warning.
  const swap = useRef(0)
  const lastSwap = useRef(0)
  const lastMap = useRef<THREE.Texture | null>(null)

  useEffect(() => {
    if (lastMap.current && lastMap.current !== map) swap.current = 1
    lastMap.current = map
  }, [map])

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(frame.width, frame.depth, 1, 56)
    g.userData.rest = Float32Array.from(g.attributes.position.array as Float32Array)
    return g
  }, [frame.width, frame.depth])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, delta) => {
    const group = pivot.current
    if (!group) return
    const dt = Math.min(delta, 0.05)
    progress.current = THREE.MathUtils.damp(progress.current, lifted ? 1 : 0, 3.2, dt)
    swap.current = swap.current > 0.002 ? THREE.MathUtils.damp(swap.current, 0, 9, dt) : 0
    const t = progress.current
    if (
      Math.abs(t - lastProgress.current) < 0.0004 &&
      Math.abs(swap.current - lastSwap.current) < 0.0004
    )
      return
    lastProgress.current = t
    lastSwap.current = swap.current

    // Two overlapping beats: the sheet rolls itself up first, then the finished scroll
    // swings over the clip and tucks underneath. It never unrolls, so it stays a scroll.
    const roll = smoothstep(0, 0.6, t)
    const tuck = smoothstep(0.3, 1, t)
    // Negative, so the sheet lifts away from the board on its way over rather than diving.
    group.rotation.x = -tuck * Math.PI
    group.position.y =
      frame.y + offset + tuck * ROLL_RADIUS * frame.depth * 0.06 + swap.current * 0.0025
    group.scale.setScalar(1 + swap.current * 0.014)

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
  pageIndex = 0,
  interactive = false,
  lang = 'es',
  onLangChange,
  onPageChange,
  ...props
}: {
  height?: number
  pageIndex?: number
  interactive?: boolean
  lang?: NoteLang
  onLangChange?: (lang: NoteLang) => void
  onPageChange?: (index: number) => void
} & JSX.IntrinsicElements['group']) {
  const fbx = useLoader(FBXLoader, `${BASE}/source/ClipBoard.fbx`)
  const textures = useTexture({
    boardMap: `${BASE}/textures/clipboard2_board_Diffuse.png`,
    pageMap: `${BASE}/textures/clipboard2_page_Diffuse.png`,
  })

  const model = useMemo(() => fbx.clone(true), [fbx])
  const [frame, setFrame] = useState<PageFrame | null>(null)
  const popRef = useRef<HTMLAudioElement | null>(null)
  const pageTurnRef = useRef<HTMLAudioElement | null>(null)
  const fontsReady = useFontsReady()

  const handleLang = (next: NoteLang) => {
    if (next === lang) return
    if (!popRef.current) popRef.current = new Audio(POP_SOUND)
    popRef.current.currentTime = 0
    popRef.current.play().catch(() => {})
    onLangChange?.(next)
  }

  const handlePageChange = (index: number) => {
    if (!pageTurnRef.current) pageTurnRef.current = new Audio(PAGE_TURN_SOUND)
    pageTurnRef.current.currentTime = 0
    pageTurnRef.current.play().catch(() => {})
    onPageChange?.(index)
  }

  const paper = useMemo(() => {
    const source = textures.pageMap.image as CanvasImageSource | undefined
    const canvas = source ? whitenPaper(source) : null
    if (!canvas) return { canvas: null, texture: textures.pageMap }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    return { canvas, texture }
  }, [textures.pageMap])

  // Both languages are painted up front, so switching only swaps an already built texture.
  const painted = useMemo(() => {
    const sheet = paper.canvas
    const build = (l: NoteLang) =>
      sheet ? notePagesByLang[l].map((p, i) => drawNote(sheet, p, i, notePagesByLang[l].length, l)) : []
    return { es: build('es'), en: build('en') }
  }, [paper, fontsReady])

  const sheets = painted[lang]

  useEffect(
    () => () => {
      for (const set of Object.values(painted)) set.forEach((p) => p?.texture.dispose())
    },
    [painted],
  )

  useEffect(() => {
    asColor(textures.boardMap)
    asColor(textures.pageMap)

    const boardMaterial = new THREE.MeshStandardMaterial({ map: textures.boardMap, roughness: 0.85 })
    const pageMaterial = new THREE.MeshStandardMaterial({ map: paper.texture, roughness: 0.9 })

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
  }, [model, textures, height, paper])

  return (
    <group {...props}>
      <primitive object={model} />
      {frame &&
        sheets.map((page, i) => (
          <PageSheet
            key={i}
            frame={frame}
            map={page?.texture ?? null}
            paper={paper.texture}
            lifted={i < pageIndex}
            // Top of the stack first, so page 0 sits highest and flips off on its own.
            offset={(sheets.length - i) * SHEET_GAP}
          />
        ))}
      {frame && interactive && (
        <>
          {sheets[pageIndex]?.links.map((rect, i) => (
            <LinkZone key={i} frame={frame} rect={rect} stack={sheets.length} onLang={handleLang} />
          ))}
          {onPageChange && pageIndex < sheets.length - 1 && (
            <ArrowZone
              frame={frame}
              u={ARROW_NEXT_U}
              stack={sheets.length}
              onSelect={() => handlePageChange(pageIndex + 1)}
            />
          )}
          {onPageChange && pageIndex > 0 && (
            <ArrowZone
              frame={frame}
              u={ARROW_PREV_U}
              stack={sheets.length}
              onSelect={() => handlePageChange(pageIndex - 1)}
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
function LinkZone({
  frame,
  rect,
  stack,
  onLang,
}: {
  frame: PageFrame
  rect: LinkRect
  stack: number
  onLang: (lang: NoteLang) => void
}) {
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
        if (rect.url) window.open(rect.url, '_blank', 'noopener,noreferrer')
        else if (rect.lang) onLang(rect.lang)
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
