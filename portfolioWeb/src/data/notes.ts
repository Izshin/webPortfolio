export type NoteItem = { text: string; done?: boolean }
export type NotePage = { title: string; items: NoteItem[] }

export const notePages: NotePage[] = [
  {
    title: 'TO DO',
    items: [
      { text: 'Model the desk', done: true },
      { text: 'Wire the boombox', done: true },
      { text: 'Water the bonsai' },
      { text: 'Ship the portfolio' },
    ],
  },
  {
    title: 'STACK',
    items: [
      { text: 'React + TypeScript', done: true },
      { text: 'Three.js / R3F', done: true },
      { text: 'Node & Express', done: true },
      { text: 'Learn WebGPU' },
    ],
  },
  {
    title: 'NOTES',
    items: [
      { text: 'Coffee before code', done: true },
      { text: 'Commit small' },
      { text: 'Say hi below' },
    ],
  },
]
