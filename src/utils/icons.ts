// Icon battery for project cards. Keys match the scenes in components/Doodle.astro.
export const ICON_OPTIONS = [
  { value: 'web', title: 'Sitio web' },
  { value: 'search', title: 'Buscador / directorio' },
  { value: 'presentation', title: 'Presentaciones' },
  { value: 'shop', title: 'Tienda online' },
  { value: 'blocks', title: 'Widgets / módulos' },
  { value: 'mobile', title: 'App móvil' },
  { value: 'game', title: 'Juego' },
  { value: 'dashboard', title: 'Dashboard' },
  { value: 'ai', title: 'Inteligencia artificial' },
  { value: 'database', title: 'Base de datos' },
] as const;

export type CardIcon = (typeof ICON_OPTIONS)[number]['value'];
export type IconName = CardIcon | 'notfound';
