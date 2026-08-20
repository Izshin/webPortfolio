import { motion } from 'framer-motion'
import type { MenuItem } from '../../data/menu'

interface PaperCardProps {
  item: MenuItem
  index: number
  onSelect: (id: MenuItem['id']) => void
}

export function PaperCard({ item, index, onSelect }: PaperCardProps) {
  return (
    <motion.button
      type="button"
      className="paper-card"
      style={{ background: item.accent }}
      initial={{ y: -320, opacity: 0, rotate: item.rotation * 2.4 }}
      animate={{ y: 0, opacity: 1, rotate: item.rotation }}
      transition={{ type: 'spring', stiffness: 85, damping: 15, delay: 0.5 + index * 0.13 }}
      onClick={() => onSelect(item.id)}
    >
      <span className="paper-card__pin" />
      <span className="paper-card__label">{item.label}</span>
    </motion.button>
  )
}
