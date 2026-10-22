export type ProjectCategory =
  | 'Diseño y desarrollo web'
  | 'Branding e identidad visual'
  | 'Software a medida'
  | 'Automatización'
  | 'IA y agentes';

export interface ProjectImage {
  file: string;
  width: number;
  height: number;
  widths: readonly number[];
  label: string;
  alt: string;
}

export interface PortfolioProject {
  id: string;
  number: string;
  client: string;
  title: string;
  category: ProjectCategory;
  industry: string;
  scopeTitle: string;
  description: string;
  credit: string;
  url?: string;
  cover: ProjectImage;
  details: readonly ProjectImage[];
  portrait?: ProjectImage;
}

// Sólo casos autorizados. Cada caso ocupa el ancho de la sección y tiene su
// propio conjunto de imágenes; no hay categorías ni proyectos de relleno.
export const projects: readonly PortfolioProject[] = [{
  id: 'naves-del-sur',
  number: '01',
  client: 'Naves del Sur S.A.',
  title: 'Sitio web institucional.',
  category: 'Diseño y desarrollo web',
  industry: 'Industrial / metalmecánica',
  scopeTitle: 'Una presencia digital para la industria.',
  description: 'Diseño y desarrollo de una experiencia web institucional para Naves del Sur, una empresa industrial especializada en soluciones de bombeo. Una nueva presencia digital para presentar sus productos, capacidades y trayectoria.',
  credit: 'Desarrollo web: Valentín Urcullú.',
  url: 'https://navesdelsur.com/',
  cover: {
    file: 'inicio-desktop', width: 1440, height: 900, widths: [640, 960, 1440],
    label: 'A / Inicio',
    alt: 'Inicio de Naves del Sur: navegación y presentación de sus bombas a tornillo sobre una imagen industrial.',
  },
  details: [
    {
      file: 'productos', width: 1440, height: 1050, widths: [640, 960, 1440],
      label: 'B / Productos',
      alt: 'Catálogo de Naves del Sur con bombas industriales y petroleras, fotografías y acceso a sus fichas técnicas.',
    },
    {
      file: 'institucional', width: 1320, height: 610, widths: [640, 960, 1320],
      label: 'C / Institucional',
      alt: 'Página institucional de Naves del Sur: presentación de la fábrica y fotografía aérea de su planta.',
    },
  ],
  portrait: {
    file: 'inicio-mobile', width: 390, height: 844, widths: [390],
    label: 'D / Versión móvil',
    alt: 'Inicio de Naves del Sur adaptado al celular, con navegación compacta, presentación y botones de consulta.',
  },
}];
