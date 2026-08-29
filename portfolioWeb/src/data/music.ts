export type Track = {
  title: string
  artist: string
  /** Path under public/music — spaces are encoded before it reaches the <audio> element. */
  src: string
  /** Square artwork under public/musicThumbnails. */
  thumbnail: string
}

export const tracks: Track[] = [
  {
    title: 'Soul of Garage',
    artist: 'Gran Turismo 2 Soundtrack',
    src: '/music/Gran Turismo 2 Soundtrack 16 Soul of Garage.mp3',
    thumbnail: '/musicThumbnails/grandTurismo2.jpg',
  },
  {
    title: 'Head, Heart, and Hands',
    artist: '2XKO OST',
    src: '/music/2XKO OST _ Lobby & PS5 Menu Theme _ Head, Heart, and Hands (Alpha Lab 2).mp3',
    thumbnail: '/musicThumbnails/2xko.jpg',
  },
]
