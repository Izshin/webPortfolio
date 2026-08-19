import { skills } from '../../../data/skills'

function SkillGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="panel__block">
      <h3>{title}</h3>
      <ul className="tag-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export function SkillsPanel() {
  return (
    <div className="panel">
      <h2 className="panel__title">Skills</h2>
      <div className="panel__grid">
        <SkillGroup title="Languages" items={skills.languages} />
        <SkillGroup title="Frameworks & Libraries" items={skills.frameworks} />
        <SkillGroup title="Tools & Practices" items={skills.tools} />
      </div>
    </div>
  )
}
