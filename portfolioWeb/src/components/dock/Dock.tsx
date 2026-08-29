import { profile } from '../../data/profile'
import { GithubIcon, LinkedinIcon, MailIcon } from '../icons/BrandIcons'

export function Dock() {
  return (
    <nav className="dock" aria-label="Social links">
      <a href={profile.github} target="_blank" rel="noreferrer" className="dock__item" aria-label="GitHub">
        <GithubIcon size={20} />
      </a>
      <a href={profile.linkedin} target="_blank" rel="noreferrer" className="dock__item" aria-label="LinkedIn">
        <LinkedinIcon size={20} />
      </a>
      <a href={`mailto:${profile.email}`} className="dock__item" aria-label="Email">
        <MailIcon size={20} />
      </a>
    </nav>
  )
}
