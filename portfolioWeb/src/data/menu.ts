export type SectionId = 'about' | 'projects' | 'experience' | 'skills' | 'contact'

export interface MenuItem {
  id: SectionId
  label: string
  accent: string
  /** Position on the desk surface, in meters relative to desk center. */
  position: [number, number]
  rotation: number
}

export const menuItems: MenuItem[] = [
  { id: 'about', label: 'About Me', accent: '#f6efe1', position: [-0.42, 0.28], rotation: -8 },
  { id: 'projects', label: 'Projects', accent: '#eef1e6', position: [0.02, 0.4], rotation: 5 },
  { id: 'experience', label: 'Experience', accent: '#f1e9e6', position: [0.46, 0.24], rotation: -4 },
  { id: 'skills', label: 'Skills', accent: '#e9eef4', position: [-0.22, -0.18], rotation: 7 },
  { id: 'contact', label: 'Contact', accent: '#fdf3d7', position: [0.28, -0.2], rotation: -10 },
]
