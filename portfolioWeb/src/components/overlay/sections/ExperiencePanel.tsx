import { experience } from '../../../data/experience'

export function ExperiencePanel() {
  return (
    <div className="panel">
      <h2 className="panel__title">Experience</h2>
      <div className="panel__timeline">
        {experience.map((job) => (
          <div key={job.id} className="timeline-item">
            <h3>{job.company}</h3>
            <p className="panel__muted">
              {job.location} · {job.duration}
            </p>
            <p>{job.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
