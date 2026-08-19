export interface Project {
  id: string
  name: string
  subtitle: string
  link: string
  description: string
  tags: string[]
}

export const projects: Project[] = [
  {
    id: 'scubex',
    name: 'Scubex',
    subtitle: "Bachelor's Thesis — Social Media app (React MobX + Spring)",
    link: 'https://github.com/Izshin',
    description:
      'Developed, documented and deployed a full-stack social network for scuba divers (React, Spring Boot, PostgreSQL) on Vercel and Railway, with Google OAuth, species detection via GBIF API, weather forecasting via Open-Meteo and 137 unit tests achieving over 90% code coverage.',
    tags: ['React', 'MobX', 'Spring Boot', 'PostgreSQL', 'OAuth 2.0', 'GBIF API', 'Open-Meteo'],
  },
  {
    id: 'orquesta-elegidos',
    name: 'Orquesta Elegidos',
    subtitle: 'Web design and development (React + Vite, GitHub Pages)',
    link: 'https://github.com/Izshin',
    description:
      "Developed and deployed a website for real client Orquesta Elegidos, an Andalusian music band with over 30 years of experience in its field. Features include news feed updates every 24h, Gmail integration for contact and full UI design.",
    tags: ['React', 'Vite', 'GitHub Pages', 'UI Design'],
  },
]
