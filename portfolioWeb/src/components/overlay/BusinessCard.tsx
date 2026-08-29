import { useState } from 'react'
import { motion } from 'framer-motion'
import { profile } from '../../data/profile'
import { GithubIcon, LinkedinIcon, MailIcon, LocationIcon } from '../icons/BrandIcons'

export function BusinessCard() {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="business-card-scene">
      <motion.div
        className="business-card"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 16 }}
        onClick={() => setFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        aria-label="Flip business card"
      >
        <div className="business-card__face business-card__front">
          <p className="business-card__eyebrow">Software Engineering</p>
          <h3 className="business-card__name">{profile.name}</h3>
          <ul className="business-card__contacts">
            <li>
              <LocationIcon size={16} /> {profile.location}
            </li>
            <li>
              <MailIcon size={16} />
              <a href={`mailto:${profile.email}`} onClick={(e) => e.stopPropagation()}>
                {profile.email}
              </a>
            </li>
            <li>
              <GithubIcon size={16} />
              <a href={profile.github} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                {profile.githubHandle}
              </a>
            </li>
            <li>
              <LinkedinIcon size={16} />
              <a href={profile.linkedin} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                {profile.linkedinHandle}
              </a>
            </li>
          </ul>
          <span className="business-card__hint">tap to flip</span>
        </div>
        <div className="business-card__face business-card__back">
          <p className="business-card__eyebrow">Always eager to contribute</p>
          <p className="business-card__quote">"Clean, user-friendly software — with a bit of frontend polish."</p>
          <span className="business-card__hint">tap to flip back</span>
        </div>
      </motion.div>
    </div>
  )
}
