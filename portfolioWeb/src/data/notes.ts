import { profile } from './profile'
import { skills } from './skills'

export type NoteLink = { label: string; url: string }

export type NoteBlock =
  | { kind: 'lead'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'heading'; text: string; url?: string }
  | { kind: 'meta'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'tags'; items: string[] }
  | { kind: 'links'; items: NoteLink[] }
  | { kind: 'gap'; size?: number }

export type NotePage = {
  eyebrow?: string
  title: string
  titleUrl?: string
  subtitle?: string
  blocks: NoteBlock[]
}

export const notePages: NotePage[] = [
  {
    eyebrow: 'Curriculum vitae',
    title: 'Iván Fernández',
    subtitle: 'Software Engineering Graduate · Seville, Spain',
    blocks: [
      {
        kind: 'lead',
        text: 'Software Engineering graduate who loves building clean, user-friendly products. Frontend and UX design are my thing, backed by solid full-stack experience.',
      },
      { kind: 'text', text: 'Fluent in English and Spanish, always eager to contribute.' },
      { kind: 'gap' },
      { kind: 'heading', text: 'Get in touch' },
      {
        kind: 'links',
        items: [
          { label: profile.email, url: `mailto:${profile.email}` },
          { label: 'linkedin.com/in/ivaferlim', url: profile.linkedin },
          { label: 'github.com/Izshin', url: profile.github },
        ],
      },
      { kind: 'gap' },
      { kind: 'meta', text: 'Turn the page for projects, experience and stack.' },
    ],
  },
  {
    eyebrow: 'Project 01',
    title: 'Scubex',
    titleUrl: 'https://scubex.vercel.app/',
    subtitle: "Bachelor's Thesis · Social network for scuba divers",
    blocks: [
      {
        kind: 'lead',
        text: 'A full-stack social network for scuba divers, deployed on Vercel and Railway.',
      },
      { kind: 'gap', size: 6 },
      { kind: 'bullet', text: 'React + MobX front end over a Spring Boot and PostgreSQL API' },
      { kind: 'bullet', text: 'Google OAuth 2.0 sign-in' },
      { kind: 'bullet', text: 'Species detection through the GBIF API' },
      { kind: 'bullet', text: 'Dive weather forecasting with Open-Meteo' },
      { kind: 'bullet', text: '137 unit tests, over 90% code coverage' },
      { kind: 'gap' },
      {
        kind: 'links',
        items: [
          { label: 'scubex.vercel.app', url: 'https://scubex.vercel.app/' },
          { label: 'github.com/Izshin/Scubex', url: 'https://github.com/Izshin/Scubex' },
        ],
      },
      { kind: 'gap', size: 8 },
      {
        kind: 'tags',
        items: ['React', 'MobX', 'Spring Boot', 'PostgreSQL'],
      },
    ],
  },
  {
    eyebrow: 'Project 02',
    title: 'Orquesta Elegidos',
    titleUrl: 'https://orquestaelegidos.com/',
    subtitle: 'Real client · Web design and development',
    blocks: [
      {
        kind: 'lead',
        text: 'Website designed, built and deployed for Orquesta Elegidos, an Andalusian band with over 30 years on stage.',
      },
      { kind: 'gap', size: 6 },
      { kind: 'bullet', text: 'Full UI design, from wireframe to production' },
      { kind: 'bullet', text: 'News feed that refreshes itself every 24 hours' },
      { kind: 'bullet', text: 'Gmail integration for the contact form' },
      { kind: 'bullet', text: 'Continuous deployment on GitHub Pages' },
      { kind: 'gap' },
      {
        kind: 'links',
        items: [
          { label: 'orquestaelegidos.com', url: 'https://orquestaelegidos.com/' },
          { label: 'github.com/Izshin/Elegidos', url: 'https://github.com/Izshin/Elegidos' },
        ],
      },
      { kind: 'gap', size: 8 },
      { kind: 'tags', items: ['React', 'Vite', 'GitHub Pages', 'UI Design'] },
    ],
  },
  {
    eyebrow: 'Experience',
    title: 'Where I have worked',
    blocks: [
      { kind: 'heading', text: 'Click-IT', url: 'https://click-it.es/' },
      { kind: 'meta', text: 'Barcelona, Spain · 3 months' },
      { kind: 'bullet', text: 'Private software solutions in React, Angular and C#' },
      { kind: 'bullet', text: 'Ticket management system' },
      { kind: 'bullet', text: 'Competitor-tracking tool for mesoestetic' },
      {
        kind: 'bullet',
        text: 'Vehicle and parking management for La Farga (L’Hospitalet de Llobregat)',
      },
      { kind: 'gap' },
      { kind: 'heading', text: 'KnittedForYou', url: 'https://www.facebook.com/knittedforyou/' },
      { kind: 'meta', text: 'Swedish startup · 3 months' },
      { kind: 'bullet', text: 'React components for a knitting-patterns site' },
      { kind: 'bullet', text: 'Designed every mockup and the user flow' },
      { kind: 'gap', size: 6 },
      {
        kind: 'links',
        items: [
          {
            label: 'Figma mockups',
            url: 'https://www.figma.com/design/ivY7HPLWbzuRNq33VFGL4U/Knitting-Preview-mock?node-id=199-4858',
          },
        ],
      },
    ],
  },
  {
    eyebrow: 'Toolbox',
    title: 'Stack',
    subtitle: 'Technologies I have worked with',
    blocks: [
      { kind: 'heading', text: 'Languages' },
      { kind: 'tags', items: skills.languages },
      { kind: 'gap', size: 10 },
      { kind: 'heading', text: 'Libraries and frameworks' },
      { kind: 'tags', items: skills.frameworks },
      { kind: 'gap', size: 10 },
      { kind: 'heading', text: 'Tools and practices' },
      { kind: 'tags', items: skills.tools },
    ],
  },
  {
    eyebrow: 'Academic record',
    title: 'Education',
    blocks: [
      { kind: 'heading', text: profile.education.degree },
      { kind: 'meta', text: profile.education.school },
      { kind: 'text', text: `GPA ${profile.education.gpa}` },
      { kind: 'gap' },
      { kind: 'heading', text: 'English C1' },
      { kind: 'meta', text: 'Language Institute, University of Seville' },
      { kind: 'gap' },
      { kind: 'heading', text: 'Also' },
      { kind: 'bullet', text: 'Spanish (native) and English (C1)' },
      { kind: 'bullet', text: 'Driving license' },
      { kind: 'gap' },
      {
        kind: 'links',
        items: [{ label: `Say hello · ${profile.email}`, url: `mailto:${profile.email}` }],
      },
    ],
  },
]
