import { profile } from './profile'
import { skills } from './skills'

/** Inline links are written markdown-style inside text: `... [Github](https://…) ...`. */
export type NoteBlock =
  | { kind: 'lead'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'heading'; text: string; url?: string }
  | { kind: 'meta'; text: string }
  | { kind: 'hint'; text: string; underline?: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'tags'; items: string[] }
  | { kind: 'gap'; size?: number }

export type NotePage = {
  eyebrow?: string
  title: string
  titleUrl?: string
  subtitle?: string
  blocks: NoteBlock[]
}

export type NoteLang = 'es' | 'en'

const URL = {
  scubex: 'https://scubex.vercel.app/',
  scubexRepo: 'https://github.com/Izshin/Scubex',
  elegidos: 'https://orquestaelegidos.com/',
  elegidosRepo: 'https://github.com/Izshin/Elegidos',
  todoJardin: 'https://github.com/Izshin/Todo-Jardin-Des',
  truco: 'https://github.com/Izshin/Truco',
  othello: 'https://github.com/Izshin/Othelo-AI-bot',
  uvlhub: 'https://github.com/Izshin/uvlhub',
  clickIt: 'https://click-it.es/',
  knitted: 'https://www.facebook.com/knittedforyou/',
  figma:
    'https://www.figma.com/design/ivY7HPLWbzuRNq33VFGL4U/Knitting-Preview-mock?node-id=199-4858',
}

const enPages: NotePage[] = [
  {
    eyebrow: 'Curriculum vitae',
    title: 'Iván Fernández',
    subtitle: 'Software Engineering Graduate · Seville, Spain',
    blocks: [
      { kind: 'heading', text: 'Who am I?' },
      {
        kind: 'lead',
        text: "As the top says, I'm Iván! A Software Engineering graduate who loves building clean, user-friendly products. Frontend and UX design are my thing, backed by solid full-stack experience.",
      },
      { kind: 'gap', size: 6 },
      { kind: 'bullet', text: 'Spanish — native speaker' },
      { kind: 'bullet', text: 'English — C1, University of Seville' },
      { kind: 'gap' },
      { kind: 'heading', text: 'Get in touch' },
      {
        kind: 'text',
        text: 'Click anywhere {{outside the clipboard}} to see the table and click the business card :)',
      },
      { kind: 'gap', size: 8 },
      {
        kind: 'hint',
        text: 'HINT: Click on the underlined words to see my work.',
        underline: 'underlined',
      },
    ],
  },
  {
    eyebrow: 'Project 01',
    title: 'Scubex',
    titleUrl: 'https://scubex.vercel.app/',
    subtitle:
      "Bachelor's Thesis, social network for scuba divers: [Github](https://github.com/Izshin/Scubex) (React MobX + Spring)",
    blocks: [
      {
        kind: 'lead',
        text: "Scubex is my bachelor's thesis: a full-stack social network for scuba divers that I designed, built and deployed on Vercel and Railway.",
      },
      { kind: 'gap', size: 6 },
      { kind: 'bullet', text: 'React + MobX front end over a Spring Boot and PostgreSQL API' },
      { kind: 'bullet', text: 'Google OAuth 2.0 sign-in' },
      { kind: 'bullet', text: 'Species detection through the GBIF API' },
      { kind: 'bullet', text: 'Dive weather forecasting with Open-Meteo' },
      { kind: 'bullet', text: '137 unit tests, over 90% code coverage' },
      { kind: 'gap', size: 12 },
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
    subtitle:
      'Web design and development: [Github](https://github.com/Izshin/Elegidos) (React + Vite, GitHub Pages)',
    blocks: [
      {
        kind: 'lead',
        text: 'Orquesta Elegidos is an Andalusian band with over 30 years on stage, and I designed, built and deployed their whole website from scratch.',
      },
      { kind: 'gap', size: 6 },
      { kind: 'bullet', text: 'Full UI design, from wireframe to production' },
      { kind: 'bullet', text: 'News feed that refreshes itself every 24 hours' },
      { kind: 'bullet', text: 'Gmail integration for the contact form' },
      { kind: 'bullet', text: 'Continuous deployment on GitHub Pages' },
      { kind: 'gap', size: 12 },
      { kind: 'tags', items: ['React', 'Vite', 'GitHub Pages', 'UI Design'] },
    ],
  },
  {
    eyebrow: 'University',
    title: 'Uni projects',
    blocks: [
      {
        kind: 'lead',
        text: 'Most of what I know I learned by building — these are the projects that gave me my technical base.',
      },
      { kind: 'gap', size: 6 },
      {
        kind: 'bullet',
        text: `[Todo Jardín](${URL.todoJardin}) — a Django storefront for a garden shop: catalog, cart, checkout with Braintree and an admin panel to run it.`,
      },
      {
        kind: 'bullet',
        text: `[Truco Beasts](${URL.truco}) — a Spring Boot and React card game built by six of us; I owned the interface and every animation in it.`,
      },
      {
        kind: 'bullet',
        text: `[Othello AI](${URL.othello}) — a Keras CNN over a dual-channel 8×8 board, trained on MCTS self-play games with class weighting and early stopping, and then used to score positions inside the search.`,
      },
      {
        kind: 'bullet',
        text: `[uvlhub](${URL.uvlhub}) — a Flask project where I learned to dockerize everything and cover it with Selenium and Locust tests.`,
      },
    ],
  },
  {
    eyebrow: 'Experience 01',
    title: 'Click-IT',
    titleUrl: URL.clickIt,
    subtitle: 'Barcelona, Spain · 4 months',
    blocks: [
      {
        kind: 'lead',
        text: 'Four months at a Barcelona company, my first time working on bigger products and dealing with bigger clients.',
      },
      { kind: 'gap', size: 6 },
      {
        kind: 'bullet',
        text: 'La Farga: vehicle and parking management for L’Hospitalet, with Angular and Fastify and the client on the other side.',
      },
      {
        kind: 'bullet',
        text: 'GSharp: Click-IT’s own internal CRM, where I went deeper into Django and used Microsoft’s API to bring in Planner.',
      },
      {
        kind: 'bullet',
        text: 'Kam: mesoestetic’s competition tracker, a big international market and product management suite: campaigns by country, city and year, market targets, catalogue…',
      },
      {
        kind: 'bullet',
        text: 'In Kam I refactored plenty of code and wrote my first .NET and C# backend, where I learnt about dealing with bottlenecks and legacy code',
      },
    ],
  },
  {
    eyebrow: 'Experience 02',
    title: 'KnittedForYou',
    titleUrl: URL.knitted,
    subtitle: 'Swedish startup · 3 months',
    blocks: [
      {
        kind: 'lead',
        text: 'I spent three months from university vacation with a Swedish startup, building the site where their knitting patterns were stored.',
      },
      { kind: 'gap', size: 6 },
      {
        kind: 'bullet',
        text: `I designed every [mockup](${URL.figma}) and the whole user flow of the site.`,
      },
      { kind: 'bullet', text: 'Then I built some of those screens as React components for the site.' },
      { kind: 'gap' },
      {
        kind: 'text',
        text: 'Doing the design and the frontend separately taught me to think about the flow and how intuitive the app felt.',
      },
    ],
  },
  {
    eyebrow: 'Toolbox',
    title: 'Stack',
    subtitle: 'Everything here I have used on a real project, not just read about',
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
      {
        kind: 'lead',
        text: 'I studied Software Engineering at the University of Seville, and picked up a few things along the way.',
      },
      { kind: 'gap', size: 6 },
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
      { kind: 'meta', text: `Reach me at ${profile.email}` },
      { kind: 'gap', size: 14 },
      {
        kind: 'meta',
        text: 'This site is a personal, non-commercial portfolio. Third-party 3D models/assets remain the property of their original creators and are used here only to showcase this project.',
      },
    ],
  },
]

const esPages: NotePage[] = [
  {
    eyebrow: 'Currículum',
    title: 'Iván Fernández',
    subtitle: 'Graduado en Ingeniería del Software · Sevilla, España',
    blocks: [
      { kind: 'heading', text: '¿Quién soy?' },
      {
        kind: 'lead',
        text: 'Como pone arriba, ¡Soy Iván! Un graduado en Ingeniería del Software al que le encanta construir productos limpios y fáciles de usar. Lo mío es el frontend y el diseño UX, con una buena base full-stack detrás.',
      },
      { kind: 'gap', size: 6 },
      { kind: 'bullet', text: 'Español — nativo' },
      { kind: 'bullet', text: 'Inglés — C1, Universidad de Sevilla' },
      { kind: 'gap' },
      { kind: 'heading', text: 'Contacto' },
      {
        kind: 'text',
        text: 'Haz clic {{fuera del portafolios}} para ver la mesa y pincha en la tarjeta de visita :)',
      },
      { kind: 'gap', size: 8 },
      {
        kind: 'hint',
        text: 'PISTA: haz clic en las palabras subrayadas para ver mi trabajo.',
        underline: 'subrayadas',
      },
    ],
  },
  {
    eyebrow: 'Proyecto 01',
    title: 'Scubex',
    titleUrl: URL.scubex,
    subtitle: `Trabajo de Fin de Grado, red social para buceadores: [Github](${URL.scubexRepo}) (React MobX + Spring)`,
    blocks: [
      {
        kind: 'lead',
        text: 'Scubex es mi Trabajo de Fin de Grado: una red social full-stack para buceadores que diseñé, desarrollé y desplegúe en Vercel y Railway.',
      },
      { kind: 'gap', size: 6 },
      { kind: 'bullet', text: 'Frontend en React + MobX sobre una API de Spring Boot y PostgreSQL' },
      { kind: 'bullet', text: 'Inicio de sesión con Google OAuth 2.0' },
      { kind: 'bullet', text: 'Detección de especies mediante la API de GBIF' },
      { kind: 'bullet', text: 'Previsión meteorológica para inmersiones con Open-Meteo' },
      { kind: 'bullet', text: '137 tests unitarios, más del 90% de cobertura' },
      { kind: 'gap', size: 12 },
      { kind: 'tags', items: ['React', 'MobX', 'Spring Boot', 'PostgreSQL'] },
    ],
  },
  {
    eyebrow: 'Proyecto 02',
    title: 'Orquesta Elegidos',
    titleUrl: URL.elegidos,
    subtitle: `Diseño y desarrollo web: [Github](${URL.elegidosRepo}) (React + Vite, GitHub Pages)`,
    blocks: [
      {
        kind: 'lead',
        text: 'Orquesta Elegidos es una banda andaluza con más de 30 años sobre el escenario, y yo diseñé, desarrollé y desplegúe su web entera desde cero.',
      },
      { kind: 'gap', size: 6 },
      { kind: 'bullet', text: 'Diseño completo de la interfaz, del wireframe a producción' },
      { kind: 'bullet', text: 'Sección de noticias que se actualiza sola cada 24 horas' },
      { kind: 'bullet', text: 'Integración con Gmail para el formulario de contacto' },
      { kind: 'bullet', text: 'Despliegue continuo en GitHub Pages' },
      { kind: 'gap', size: 12 },
      { kind: 'tags', items: ['React', 'Vite', 'GitHub Pages', 'Diseño UI'] },
    ],
  },
  {
    eyebrow: 'Universidad',
    title: 'Proyectos de carrera',
    blocks: [
      {
        kind: 'lead',
        text: 'Casi todo lo que sé lo he aprendido construyendo: de estos proyectos sale la base técnica que tengo.',
      },
      { kind: 'gap', size: 6 },
      {
        kind: 'bullet',
        text: `[Todo Jardín](${URL.todoJardin}) — una tienda en Django para un vivero: catálogo, carrito, checkout con Braintree y un panel de administración para gestionarlo.`,
      },
      {
        kind: 'bullet',
        text: `[Truco Beasts](${URL.truco}) — un juego de cartas en Spring Boot y React que hicimos entre seis; me encargué de la interfaz y de todas sus animaciones.`,
      },
      {
        kind: 'bullet',
        text: `[Othello AI](${URL.othello}) — una CNN en Keras sobre un tablero 8×8 de doble canal, entrenada con partidas MCTS contra sí misma usando class weighting y early stopping, y luego usada para evaluar posiciones dentro de la búsqueda.`,
      },
      {
        kind: 'bullet',
        text: `[uvlhub](${URL.uvlhub}) — un proyecto en Flask donde aprendí a dockerizarlo todo y a cubrirlo con tests de Selenium y Locust.`,
      },
    ],
  },
  {
    eyebrow: 'Experiencia 01',
    title: 'Click-IT',
    titleUrl: URL.clickIt,
    subtitle: 'Barcelona, España · 4 meses',
    blocks: [
      {
        kind: 'lead',
        text: 'Estuve cuatro meses con una empresa barcelonesa, donde trabajé por primera vez con productos más grandes y traté con clientes más relevantes.',
      },
      { kind: 'gap', size: 6 },
      {
        kind: 'bullet',
        text: 'La Farga: gestión de vehículos y aparcamiento para L’Hospitalet, con Angular y Fastify y trato directo con el cliente.',
      },
      {
        kind: 'bullet',
        text: 'GSharp: el CRM interno de la propia Click-IT; ahí profundicé en Django y usé la API de Microsoft para integrar Planner.',
      },
      {
        kind: 'bullet',
        text: 'Kam: el seguimiento de la competencia de mesoestetic, un software grande de gestión internacional de mercados y productos: campañas por país, ciudad y año, objetivos, catálogo…',
      },
      {
        kind: 'bullet',
        text: 'En Kam refactoricé bastante código y monté mi primer backend en .NET con C#, donde aprendí a lidiar con cuellos de botella y código legacy',
      },
    ],
  },
  {
    eyebrow: 'Experiencia 02',
    title: 'KnittedForYou',
    titleUrl: URL.knitted,
    subtitle: 'Startup sueca · 3 meses',
    blocks: [
      {
        kind: 'lead',
        text: 'Pasé tres meses de las vacaciones de la universidad con una startup sueca, levantando la web donde se guardaban sus patrones de punto.',
      },
      { kind: 'gap', size: 6 },
      {
        kind: 'bullet',
        text: `Diseñé todos los [mockups](${URL.figma}) y el flujo de usuario entero de la web.`,
      },
      {
        kind: 'bullet',
        text: 'Después construí algunas de esas pantallas como componentes de React para la web.',
      },
      { kind: 'gap' },
      {
        kind: 'text',
        text: 'Llevar el diseño y el frontend por separado me enseñó a pensar en el flujo y en lo intuitiva que resultaba la app.',
      },
    ],
  },
  {
    eyebrow: 'Herramientas',
    title: 'Stack',
    subtitle: 'Todo esto lo he usado en proyectos reales, no solo leído sobre ello',
    blocks: [
      { kind: 'heading', text: 'Lenguajes' },
      { kind: 'tags', items: skills.languages },
      { kind: 'gap', size: 10 },
      { kind: 'heading', text: 'Librerías y frameworks' },
      { kind: 'tags', items: skills.frameworks },
      { kind: 'gap', size: 10 },
      { kind: 'heading', text: 'Herramientas y prácticas' },
      { kind: 'tags', items: skills.tools },
    ],
  },
  {
    eyebrow: 'Formación',
    title: 'Educación',
    blocks: [
      {
        kind: 'lead',
        text: 'Estudié Ingeniería del Software en la Universidad de Sevilla, y por el camino cayó alguna cosa más.',
      },
      { kind: 'gap', size: 6 },
      { kind: 'heading', text: 'Grado en Ingeniería del Software' },
      {
        kind: 'meta',
        text: 'Escuela Técnica Superior de Ingeniería Informática, Universidad de Sevilla',
      },
      { kind: 'text', text: `Nota media ${profile.education.gpa}` },
      { kind: 'gap' },
      { kind: 'heading', text: 'Inglés C1' },
      { kind: 'meta', text: 'Instituto de Idiomas, Universidad de Sevilla' },
      { kind: 'gap' },
      { kind: 'heading', text: 'Además' },
      { kind: 'bullet', text: 'Español (nativo)' },
      { kind: 'bullet', text: 'Carnet de conducir' },
      { kind: 'gap' },
      { kind: 'meta', text: `Escríbeme a ${profile.email}` },
      { kind: 'gap', size: 14 },
      {
        kind: 'meta',
        text: 'Esta web es un portfolio personal sin fines comerciales. Los modelos y recursos 3D de terceros pertenecen a sus creadores originales y solo se usan aquí para mostrar este proyecto.',
      },
    ],
  },
]

export const notePagesByLang: Record<NoteLang, NotePage[]> = { es: esPages, en: enPages }
