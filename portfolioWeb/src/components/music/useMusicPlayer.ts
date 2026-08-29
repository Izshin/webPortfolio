import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { tracks } from '../../data/music'

export function useMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(0.6)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

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

  /** 0..1 energy of the kick/bass bins — enough to drive a beat trigger. */
  const getLevel = useCallback(() => {
    const analyser = analyserRef.current
    const bins = binsRef.current
    if (!analyser || !bins) return 0
    analyser.getByteFrequencyData(bins)
    let sum = 0
    for (let i = 1; i < 9; i += 1) sum += bins[i]
    return sum / (8 * 255)
  }, [])

  const next = useCallback(() => setIndex((i) => (i + 1) % tracks.length), [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setProgress(audio.currentTime)
    const onMeta = () => setDuration(audio.duration || 0)
    const onEnded = () => next()
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnded)
      audio.pause()
    }
  }, [next])

  // Filenames contain spaces, so the src has to be encoded before the browser fetches it.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = encodeURI(track.src)
    setProgress(0)
    setDuration(0)
    if (playing) void audio.play().catch(() => setPlaying(false))
    // `playing` is intentionally omitted: it must not restart the track on pause/resume.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = muted ? 0 : volume
  }, [volume, muted])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      ensureAnalyser()
      void ctxRef.current?.resume()
      void audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false))
    } else {
      audio.pause()
      setPlaying(false)
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

  return useMemo(
    () => ({
      track,
      playing,
      progress,
      duration,
      volume,
      muted,
      toggle,
      next,
      previous,
      seek,
      getLevel,
      setVolume: changeVolume,
      nudgeVolume,
      toggleMute: () => setMuted((m) => !m),
    }),
    [track, playing, progress, duration, volume, muted, toggle, next, previous, seek, getLevel, nudgeVolume, changeVolume],
  )
}

export type MusicPlayer = ReturnType<typeof useMusicPlayer>
