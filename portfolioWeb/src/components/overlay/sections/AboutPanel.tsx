import { profile } from '../../../data/profile'

export function AboutPanel() {
  return (
    <div className="panel">
      <h2 className="panel__title">About Me</h2>
      <p className="panel__lead">{profile.summary}</p>
      <div className="panel__grid">
        <div className="panel__block">
          <h3>Education</h3>
          <p>{profile.education.degree}</p>
          <p className="panel__muted">{profile.education.school}</p>
          <p className="panel__muted">GPA: {profile.education.gpa}</p>
        </div>
        <div className="panel__block">
          <h3>Languages</h3>
          {profile.languages.map((lang) => (
            <p key={lang}>{lang}</p>
          ))}
        </div>
        <div className="panel__block">
          <h3>Extras</h3>
          {profile.extras.map((extra) => (
            <p key={extra}>{extra}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
