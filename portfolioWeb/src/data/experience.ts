export interface Experience {
  id: string
  company: string
  location: string
  duration: string
  description: string
}

export const experience: Experience[] = [
  {
    id: 'click-it',
    company: 'Click-IT',
    location: 'Barcelona based company',
    duration: '3 Months',
    description:
      'Developed mainly using React, Angular and C# private software solutions, including a ticket management system, a competitor-tracking tool for mesoestetic, and a vehicle management system for La Farga, a public entity managing municipal mobility and parking services in L\'Hospitalet de Llobregat (Barcelona).',
  },
  {
    id: 'knittedforyou',
    company: 'KnittedForYou',
    location: 'Swedish startup company',
    duration: '3 Months',
    description:
      'Developed React components and mainly provided all mockups and user flow for a knitting patterns website.',
  },
]
