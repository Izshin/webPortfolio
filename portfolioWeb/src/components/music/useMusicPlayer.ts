import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { tracks } from '../../data/music'

const randomIndex = (exclude = -1) => {
  if (tracks.length < 2) return 0
  let i = exclude
  while (i === exclude) i = Math.floor(Math.random() * tracks.length)
  return i
}

export function useMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [index, setIndex] = useState(() => randomIndex())
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(0.6)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [shuffle, setShuffle] = useState(true)
  const [repeat, setRepeat] = useState(false)

  const track = tracks[index]

  if (!audioRef.current && typeof Audio !== 'undefined') {
    audioRef.current = new Audio()
    audioRef.current.preload = 'metadata'
  }

  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const binsRef = useRef<Uint8Array | null>(null)

  // Deferred until the first play: an AudioContext needs a user gesture, and
  // createMediaElementSource may only ever be called once per <audio> element.
  const ensureAnalyser = useCallback(() => {
    const audio = audioRef.current
    if (!audio || ctxRef.current) return
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.6
    ctx.createMediaElementSource(audio).connect(analyser)
    analyser.connect(ctx.destination)
    ctxRef.current = ctx
    analyserRef.current = analyser
    binsRef.current = new Uint8Array(analyser.frequencyBinCount)
  }, [])

  /** Reused so the per-frame callers don't allocate. */
  const levelsRef = useRef({ bass: 0, treble: 0 })

  /** 0..1 energy of the kick/bass bins and of the bright bins, for beat triggers. */
  const getLevels = useCallback(() => {
    const out = levelsRef.current
    const analyser = analyserRef.current
    const bins = binsRef.current
    if (!analyser || !bins) {
      out.bass = 0
      out.treble = 0
      return out
    }
    analyser.getByteFrequencyData(bins)
    let low = 0
    for (let i = 1; i < 9; i += 1) low += bins[i]
    let high = 0
    for (let i = 16; i < 48; i += 1) high += bins[i]
    out.bass = low / (8 * 255)
    out.treble = high / (32 * 255)
    return out
  }, [])

  // Read through a ref so toggling shuffle never re-creates `next` (and re-runs the effect below).
  const shuffleRef = useRef(shuffle)
  useEffect(() => {
    shuffleRef.current = shuffle
  }, [shuffle])

  // With loop on, the element never fires `ended`, so it repeats the current track.
  const repeatRef = useRef(repeat)
  useEffect(() => {
    repeatRef.current = repeat
    const audio = audioRef.current
    if (audio) audio.loop = repeat
  }, [repeat])

  const next = useCallback(
    () => setIndex((i) => (shuffleRef.current ? randomIndex(i) : (i + 1) % tracks.length)),
    [],
  )

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setProgress(audio.currentTime)
    const onMeta = () => setDuration(audio.duration || 0)
    const onEnded = () => next()
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [next])

  // Filenames contain spaces, so the src has to be encoded before the browser fetches it.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const wasPlaying = !audio.paused || playing
    audio.src = encodeURI(track.src)
    audio.loop = repeatRef.current
    setProgress(0)
    setDuration(0)
    if (wasPlaying) void audio.play().catch(() => undefined)
    // `playing` is intentionally omitted: it must not restart the track on pause/resume.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = muted ? 0 : volume
  }, [volume, muted])

  // Autoplay is usually blocked until the visitor interacts, so retry on the first gesture.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    let cancelled = false
    void audio.play().catch(() => undefined)

    const onGesture = () => {
      if (cancelled) return
      ensureAnalyser()
      void ctxRef.current?.resume()
      if (audio.paused) void audio.play().catch(() => undefined)
    }
    const events = ['pointerdown', 'keydown', 'touchstart'] as const
    events.forEach((e) => window.addEventListener(e, onGesture, { once: true }))
    return () => {
      cancelled = true
      events.forEach((e) => window.removeEventListener(e, onGesture))
    }
  }, [ensureAnalyser])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      ensureAnalyser()
      void ctxRef.current?.resume()
      void audio.play().catch(() => undefined)
    } else {
      audio.pause()
    }
  }, [ensureAnalyser])

  const previous = useCallback(() => {
    const audio = audioRef.current
    // Same behaviour as most players: restart the track unless you're near the start.
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    setIndex((i) => (i - 1 + tracks.length) % tracks.length)
  }, [])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (audio) audio.currentTime = seconds
    setProgress(seconds)
  }, [])

  const nudgeVolume = useCallback((delta: number) => {
    setMuted(false)
    setVolume((v) => Math.min(1, Math.max(0, Math.round((v + delta) * 100) / 100)))
  }, [])

  const changeVolume = useCallback((v: number) => {
    setMuted(false)
    setVolume(Math.min(1, Math.max(0, v)))
  }, [])

  // Repeat-one and shuffle contradict each other: a looping track never reaches `ended`.
  const toggleShuffle = useCallback(() => {
    setShuffle(!shuffle)
    if (!shuffle) setRepeat(false)
  }, [shuffle])

  const toggleRepeat = useCallback(() => {
    setRepeat(!repeat)
    if (!repeat) setShuffle(false)
  }, [repeat])

  return useMemo(
    () => ({
      track,
      playing,
      progress,
      duration,
      volume,
      muted,
      shuffle,
      repeat,
      toggle,
      next,
      previous,
      seek,
      getLevels,
      setVolume: changeVolume,
      nudgeVolume,
      toggleMute: () => setMuted((m) => !m),
      toggleShuffle,
      toggleRepeat,
    }),
    [track, playing, progress, duration, volume, muted, shuffle, repeat, toggle, next, previous, seek, getLevels, nudgeVolume, changeVolume, toggleShuffle, toggleRepeat],
  )
}

export type MusicPlayer = ReturnType<typeof useMusicPlayer>
