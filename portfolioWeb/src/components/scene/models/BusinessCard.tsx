import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, useState, type JSX } from 'react'
import * as THREE from 'three'
import { profile } from '../../../data/profile'
import type { NoteLang } from '../../../data/notes'
import { asset } from '../../../asset'

const PHOTO_SRC = asset('/photos/me.jpg')
/** The file name has spaces, so it has to travel encoded. */
const BASS_SRC = asset('/photos/backCover%20Business%20card.png')

/** 85 x 55 mm card, kept at the texture's aspect so nothing stretches. */
const FACE_W = 1024
const FACE_H = 668
export const CARD_W = 0.089
export const CARD_D = (CARD_W * FACE_H) / FACE_W
export const CARD_T = 0.0007

/** Where the bass sits on the back face, in canvas pixels. */
const BASS_ART = { x: (FACE_W - 810) / 2, y: 130, w: 810, h: Math.round(810 * 0.549) }
const BASS_SFX = asset('/soundEffects/bass_sound_effect.mp3')
/** Square pad over the middle of the drawing: the only spot that plays the note. */
const BASS_HIT_PX = 260
const BASS_HIT_V = 1 - (BASS_ART.y + BASS_ART.h / 2) / FACE_H

const INK = {
  navy: '#12233f',
  blue: '#1f47a3',
  grey: '#7c8492',
  black: '#1b1f27',
  paper: '#fbf8f1',
  edge: '#efe9dc',
  hairline: 'rgba(18, 35, 63, 0.18)',
}
const FONT_HEAD = "Montserrat, 'Segoe UI', system-ui, sans-serif"
const FONT_BODY = "Inter, 'Segoe UI', system-ui, sans-serif"
const FONT_SPECS = ['800 52px Montserrat', '700 26px Montserrat', '500 25px Inter', '500 27px Inter']

/** The card follows the clipboard's language toggle; only these strings change. */
const COPY: Record<NoteLang, { flip: string; bass: string; click: string; title: string; location: string }> = {
  es: {
    flip: 'PULSA PARA GIRAR',
    bass: 'Y TOCO EL BAJO',
    click: '¡PÚLSALO!',
    title: 'Graduado en Ingeniería del Software',
    location: 'Sevilla, España',
  },
  en: {
    flip: 'CLICK TO FLIP',
    bass: 'AND I PLAY BASS',
    click: 'CLICK IT!',
    title: profile.title,
    location: profile.location,
  },
}

/** lucide outlines and the brand marks from BrandIcons, as raw path data on a 24 grid. */
const ICONS = {
  pin: {
    stroke: [
      'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z',
      'M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    ],
  },
  mail: {
    stroke: [
      'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
      'm22 7-9.03 5.74a2 2 0 0 1-1.94 0L2 7',
    ],
  },
  github: {
    fill: [
      'M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.38 7.86 10.9.57.1.78-.25.78-.55v-2.16c-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11.06 11.06 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.77.12 3.06.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .3.2.66.79.55A10.51 10.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z',
    ],
  },
  linkedin: {
    fill: [
      'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45Z',
    ],
  },
} satisfies Record<string, { stroke?: string[]; fill?: string[] }>

type IconName = keyof typeof ICONS

function drawIcon(ctx: CanvasRenderingContext2D, name: IconName, x: number, y: number, size: number) {
  const icon = ICONS[name] as { stroke?: string[]; fill?: string[] }
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 24, size / 24)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 1.9
  ctx.strokeStyle = INK.blue
  ctx.fillStyle = INK.blue
  for (const d of icon.fill ?? []) ctx.fill(new Path2D(d))
  for (const d of icon.stroke ?? []) ctx.stroke(new Path2D(d))
  ctx.restore()
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

/** Canvas has no letter-spacing everywhere, so tracked capitals are drawn glyph by glyph. */
function fillTracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number) {
  let cx = x
  for (const ch of text) {
    ctx.fillText(ch, cx, y)
    cx += ctx.measureText(ch).width + tracking
  }
}

function trackedWidth(ctx: CanvasRenderingContext2D, text: string, tracking: number) {
  let width = 0
  for (const ch of text) width += ctx.measureText(ch).width + tracking
  return width - tracking
}

function newFace() {
  const canvas = document.createElement('canvas')
  canvas.width = FACE_W
  canvas.height = FACE_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = INK.paper
  ctx.fillRect(0, 0, FACE_W, FACE_H)
  roundRect(ctx, 18, 18, FACE_W - 36, FACE_H - 36, 26)
  ctx.strokeStyle = INK.hairline
  ctx.lineWidth = 3
  ctx.stroke()
  return { canvas, ctx }
}

function toTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

/** A clickable region of the front face, in canvas pixels. */
type LinkRect = { url: string; x0: number; y0: number; x1: number; y1: number }

/** Fills the box with the image, cropping the long side instead of squashing it. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const source = image as { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number }
  const iw = source.naturalWidth || source.width || w
  const ih = source.naturalHeight || source.height || h
  const scale = Math.max(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

const rows = (lang: NoteLang): { icon: IconName; text: string; url?: string }[] => [
  { icon: 'pin', text: COPY[lang].location },
  { icon: 'mail', text: profile.email, url: `mailto:${profile.email}` },
  { icon: 'github', text: `github.com/${profile.githubHandle}`, url: profile.github },
  { icon: 'linkedin', text: profile.linkedinHandle, url: profile.linkedin },
]

/** Photo on the left, everything you can write to on the right. */
function paintFront(photo: CanvasImageSource | undefined, lang: NoteLang) {
  const face = newFace()
  if (!face) return null
  const { canvas, ctx } = face
  const links: LinkRect[] = []

  const photoX = 206
  const photoY = 296
  const radius = 124
  if (photo) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(photoX, photoY, radius, 0, Math.PI * 2)
    ctx.clip()
    drawCover(ctx, photo, photoX - radius, photoY - radius, radius * 2, radius * 2)
    ctx.restore()
  }
  ctx.beginPath()
  ctx.arc(photoX, photoY, radius + 3, 0, Math.PI * 2)
  ctx.strokeStyle = INK.blue
  ctx.lineWidth = 6
  ctx.stroke()

  ctx.font = `600 20px ${FONT_BODY}`
  ctx.fillStyle = INK.grey
  const hint = COPY[lang].flip
  fillTracked(ctx, hint, photoX - trackedWidth(ctx, hint, 4) / 2, 500, 4)

  const x = 380
  const width = FACE_W - x - 70
  let y = 140

  ctx.font = `800 52px ${FONT_HEAD}`
  ctx.fillStyle = INK.navy
  for (const line of wrapText(ctx, profile.name, width)) {
    ctx.fillText(line, x, y)
    y += 58
  }

  ctx.font = `500 25px ${FONT_BODY}`
  ctx.fillStyle = INK.grey
  ctx.fillText(COPY[lang].title, x, y + 26)

  ctx.fillStyle = INK.blue
  ctx.fillRect(x, y + 60, 120, 4)

  ctx.font = `500 27px ${FONT_BODY}`
  let rowY = y + 148
  for (const row of rows(lang)) {
    drawIcon(ctx, row.icon, x, rowY - 25, 30)
    ctx.fillStyle = row.url ? INK.blue : INK.black
    ctx.fillText(row.text, x + 46, rowY)
    if (row.url) {
      const w = ctx.measureText(row.text).width
      ctx.fillRect(x + 46, rowY + 7, w, 2)
      links.push({ url: row.url, x0: x + 38, y0: rowY - 32, x1: x + 54 + w, y1: rowY + 16 })
    }
    rowY += 66
  }

  return { texture: toTexture(canvas), links }
}

/** The b-side: the bass, printed straight onto the card stock. */
function paintBack(bass: CanvasImageSource | undefined, lang: NoteLang) {
  const face = newFace()
  if (!face) return null
  const { canvas, ctx } = face

  if (bass) {
    // Multiply, so the drawing's white background disappears into the card stock.
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(bass, BASS_ART.x, BASS_ART.y, BASS_ART.w, BASS_ART.h)
    ctx.restore()
  }

  ctx.font = `700 26px ${FONT_HEAD}`
  ctx.fillStyle = INK.navy
  const caption = COPY[lang].bass
  fillTracked(ctx, caption, (FACE_W - trackedWidth(ctx, caption, 6)) / 2, 92, 6)

  ctx.font = `700 26px ${FONT_HEAD}`
  ctx.fillStyle = INK.blue
  const hint = COPY[lang].click
  fillTracked(ctx, hint, (FACE_W - trackedWidth(ctx, hint, 6)) / 2, 596, 6)

  return { texture: toTexture(canvas) }
}

/** Repaints once the web fonts are in, so the first paint is not the fallback face. */
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

export type CardFaces = {
  front: { texture: THREE.CanvasTexture; links: LinkRect[] } | null
  back: { texture: THREE.CanvasTexture } | null
}

/** Paints both faces once; the holder shares the same pair across the whole stack. */
export function useCardFaces(lang: NoteLang): CardFaces {
  const images = useTexture({ photo: PHOTO_SRC, bass: BASS_SRC })
  const fontsReady = useFontsReady()

  const faces = useMemo(() => {
    return {
      front: paintFront(images.photo.image as CanvasImageSource | undefined, lang),
      back: paintBack(images.bass.image as CanvasImageSource | undefined, lang),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.photo, images.bass, fontsReady, lang])

  useEffect(
    () => () => {
      faces.front?.texture.dispose()
      faces.back?.texture.dispose()
    },
    [faces],
  )

  return faces
}

export function CardMesh({ faces, ...props }: { faces: CardFaces } & JSX.IntrinsicElements['mesh']) {
  return (
    <mesh castShadow receiveShadow {...props}>
      <boxGeometry args={[CARD_W, CARD_T, CARD_D]} />
      {/* Box material order: +x, -x, +y (front), -y (back), +z, -z. */}
      <meshStandardMaterial attach="material-0" color={INK.edge} roughness={0.9} />
      <meshStandardMaterial attach="material-1" color={INK.edge} roughness={0.9} />
      <meshStandardMaterial attach="material-2" map={faces.front?.texture} roughness={0.75} />
      <meshStandardMaterial attach="material-3" map={faces.back?.texture} roughness={0.75} />
      <meshStandardMaterial attach="material-4" color={INK.edge} roughness={0.9} />
      <meshStandardMaterial attach="material-5" color={INK.edge} roughness={0.9} />
    </mesh>
  )
}

export function CardLinks({ links }: { links: LinkRect[] }) {
  return (
    <>
      {links.map((rect, i) => (
        <LinkZone key={i} rect={rect} />
      ))}
    </>
  )
}

/**
 * The back face's hit zones: a square pad over the body of the printed bass plays the note,
 * and the rest of the paper turns the card back over. Both sit above the card mesh, so a
 * click on the back never falls through to it.
 */
export function CardBassZone({ onMiss }: { onMiss?: () => void }) {
  const side = (BASS_HIT_PX / FACE_W) * CARD_W

  return (
    <group position={[0, -CARD_T / 2 - 0.0003, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onMiss?.()
        }}
      >
        <planeGeometry args={[CARD_W, CARD_D]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh
        position={[0, (BASS_HIT_V - 0.5) * CARD_D, 0.0002]}
        onClick={(e) => {
          e.stopPropagation()
          const note = new Audio(BASS_SFX)
          note.volume = 0.7
          void note.play().catch(() => {})
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
      >
        <planeGeometry args={[side, side]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

/**
 * Invisible pad over a link printed on the front. Textures are flipped vertically, so the
 * canvas row that reads at the top of the card sits at the far edge, -z.
 */
function LinkZone({ rect }: { rect: LinkRect }) {
  const u = (rect.x0 / FACE_W + rect.x1 / FACE_W) / 2
  const v = (rect.y0 / FACE_H + rect.y1 / FACE_H) / 2

  return (
    <mesh
      position={[(u - 0.5) * CARD_W, CARD_T / 2 + 0.0003, (v - 0.5) * CARD_D]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        e.stopPropagation()
        if (rect.url.startsWith('mailto:')) window.location.href = rect.url
        else window.open(rect.url, '_blank', 'noopener,noreferrer')
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
    >
      <planeGeometry
        args={[((rect.x1 - rect.x0) / FACE_W) * CARD_W, ((rect.y1 - rect.y0) / FACE_H) * CARD_D]}
      />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}
