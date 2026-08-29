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
  {
    title: 'Endless Stage',
    artist: '2XKO OST',
    src: '/music/Endless Stage 2XKO.mp3',
    thumbnail: '/musicThumbnails/2xko.jpg',
  },
  {
    title: 'A Fine Red Mist',
    artist: 'Katana ZERO OST',
    src: '/music/A Fine Red Mist Katana Zero.mp3',
    thumbnail: '/musicThumbnails/KatanaZero.jpg',
  },
  {
    title: 'Breezin',
    artist: 'Masayoshi Takanaka',
    src: '/music/BREEZIN TAKANAKA.mp3',
    thumbnail: '/musicThumbnails/Takanaka.jpg',
  },
  {
    title: 'Restaurant Prep',
    artist: 'Dave the Diver OST',
    src: '/music/Dave the Diver OST - Restaurant Prep.mp3',
    thumbnail: '/musicThumbnails/DaveTheDiver.jpg',
  },
  {
    title: 'Seals and Dolphins',
    artist: 'Dave the Diver OST',
    src: '/music/Dave the Diver OST - Seals and Dolphins.mp3',
    thumbnail: '/musicThumbnails/DaveTheDiver.jpg',
  },
]
