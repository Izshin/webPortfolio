import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { GroupProps } from '@react-three/fiber'

type NoteState = {
  life: number
  ttl: number
  rise: number
  swayPhase: number
  swayAmount: number
  spin: number
  origin: THREE.Vector2
}

const PALETTE = ['#ffd66b', '#7fd4ff', '#ff9ad5', '#a5f3a0', '#c4a8ff']

const makeState = (): NoteState => ({
  life: Infinity,
  ttl: 1,
  rise: 0,
  swayPhase: 0,
  swayAmount: 0,
  spin: 0,
  origin: new THREE.Vector2(),
})

/** A quaver: head, stem and flag, so it still reads as a note from any angle. */
function Note({ inner }: { inner: (g: THREE.Group | null) => void }) {
  return (
    <group ref={inner} visible={false}>
      <mesh rotation={[0, 0, -0.4]} scale={[1, 0.72, 0.62]}>
        <sphereGeometry args={[0.5, 14, 12]} />
        <meshStandardMaterial transparent roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh position={[0.42, 0.92, 0]}>
        <boxGeometry args={[0.15, 1.8, 0.15]} />
        <meshStandardMaterial transparent roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh position={[0.62, 1.6, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.45, 0.55, 0.12]} />
        <meshStandardMaterial transparent roughness={0.35} metalness={0.1} />
      </mesh>
    </group>
  )
}

export function MusicNotes({
  playing,
  getLevel,
  count = 8,
  size = 0.025,
  ...props
}: GroupProps & {
  playing: boolean
  getLevel: () => number
  count?: number
  size?: number
}) {
  const notes = useRef<(THREE.Group | null)[]>([])
  const states = useMemo(() => Array.from({ length: count }, makeState), [count])
  const previousLevel = useRef(0)
  const cooldown = useRef(0)
  const color = useMemo(() => new THREE.Color(), [])

  const spawn = (strength: number) => {
    const slot = states.findIndex((s) => s.life >= s.ttl)
    if (slot === -1) return
    const state = states[slot]
    state.life = 0
    state.ttl = 1.5 + Math.random() * 0.9
    state.rise = 0.16 + strength * 0.16
    state.swayPhase = Math.random() * Math.PI * 2
    state.swayAmount = 0.03 + Math.random() * 0.04
    state.spin = (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random())
    state.origin.set((Math.random() - 0.5) * 0.09, (Math.random() - 0.5) * 0.05)

    color.set(PALETTE[Math.floor(Math.random() * PALETTE.length)])
    notes.current[slot]?.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      const material = mesh.material as THREE.MeshStandardMaterial
      material.color.copy(color)
      material.emissive.copy(color)
      material.emissiveIntensity = 0.8
    })
  }

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const level = playing ? getLevel() : 0

    cooldown.current -= dt
    // Onset detection: a rising edge above the noise floor, rate-limited so a
    // sustained bass note doesn't turn into a stream.
    if (level > 0.32 && level - previousLevel.current > 0.05 && cooldown.current <= 0) {
      spawn(level)
      if (level > 0.6) spawn(level)
      cooldown.current = 0.13
    }
    previousLevel.current = level

    states.forEach((state, i) => {
      const group = notes.current[i]
      if (!group) return
      if (state.life >= state.ttl) {
        group.visible = false
        return
      }
      state.life += dt
      const t = Math.min(state.life / state.ttl, 1)

      group.visible = true
      group.position.set(
        state.origin.x + Math.sin(state.swayPhase + t * 6) * state.swayAmount,
        t * state.rise,
        state.origin.y + Math.cos(state.swayPhase + t * 4) * state.swayAmount * 0.6,
      )
      group.rotation.y = state.swayPhase + t * state.spin * 4
      group.rotation.z = Math.sin(state.swayPhase + t * 3) * 0.25

      // Quick pop on birth, then a slow shrink as it fades out.
      const pop = t < 0.14 ? t / 0.14 : 1 - (t - 0.14) / 0.86
      group.scale.setScalar(size * (0.6 + pop * 0.5))

      const opacity = t < 0.1 ? t / 0.1 : 1 - Math.max(0, (t - 0.45) / 0.55)
      group.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (mesh.isMesh) (mesh.material as THREE.MeshStandardMaterial).opacity = opacity
      })
    })
  })

  return (
    <group {...props}>
      {states.map((_, i) => (
        <Note
          key={i}
          inner={(g) => {
            notes.current[i] = g
          }}
        />
      ))}
    </group>
  )
}
