import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { SectionId } from '../../data/menu'
import { AboutPanel } from './sections/AboutPanel'
import { ProjectsPanel } from './sections/ProjectsPanel'
import { ExperiencePanel } from './sections/ExperiencePanel'
import { SkillsPanel } from './sections/SkillsPanel'
import { BusinessCard } from './BusinessCard'

const panels: Record<SectionId, React.ReactNode> = {
  about: <AboutPanel />,
  projects: <ProjectsPanel />,
  experience: <ExperiencePanel />,
  skills: <SkillsPanel />,
  contact: <BusinessCard />,
}

export function DetailOverlay({ section, onClose }: { section: SectionId | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {section && (
        <motion.div
          className="overlay-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`overlay-panel${section === 'contact' ? ' overlay-panel--contact' : ''}`}
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 210, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="overlay-panel__close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
            {panels[section]}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
