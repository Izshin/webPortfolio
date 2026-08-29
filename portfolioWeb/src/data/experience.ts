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
    duration: '4 Months',
    description:
      'Developed private software using React, Angular, Fastify and C#: La Farga, a vehicle and parking management system for the public entity running municipal mobility in L\'Hospitalet de Llobregat (Barcelona); GSharp, Click-IT\'s own internal CRM; and Kam, mesoestetic\'s competitor-tracking software for international market and product management.',
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
