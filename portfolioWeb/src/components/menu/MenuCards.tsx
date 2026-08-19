import { Html } from '@react-three/drei'
import { menuItems } from '../../data/menu'
import type { SectionId } from '../../data/menu'
import { DESK_HEIGHT } from '../scene/constants'
import { PaperCard } from './PaperCard'

const PX_TO_M = 0.0018

export function MenuCards({ onSelect }: { onSelect: (id: SectionId) => void }) {
  return (
    <>
      {menuItems.map((item, i) => (
        <group
          key={item.id}
          position={[item.position[0], DESK_HEIGHT + i * 0.002, item.position[1]]}
          rotation={[-Math.PI / 2, 0, (item.rotation * Math.PI) / 180]}
        >
          <Html transform scale={PX_TO_M} zIndexRange={[20, 0]} center>
            <PaperCard item={item} index={i} onSelect={onSelect} />
          </Html>
        </group>
      ))}
    </>
  )
}
