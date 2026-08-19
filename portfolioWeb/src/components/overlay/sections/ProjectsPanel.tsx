import { projects } from '../../../data/projects'

export function ProjectsPanel() {
  return (
    <div className="panel">
      <h2 className="panel__title">Projects</h2>
      <div className="panel__cards">
        {projects.map((project) => (
          <a key={project.id} href={project.link} target="_blank" rel="noreferrer" className="project-card">
            <h3>{project.name}</h3>
            <p className="panel__muted">{project.subtitle}</p>
            <p>{project.description}</p>
            <ul className="tag-list">
              {project.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          </a>
        ))}
      </div>
    </div>
  )
}
