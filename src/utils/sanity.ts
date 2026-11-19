import { sanityClient } from 'sanity:client';
import shots from '../../public/screenshots/index.json';

// ─── Queries GROQ ───

const SETTINGS_QUERY = /* groq */ `*[_id == "siteSettings"][0]{
  seo { title, description },
  hero { greeting, title, subtitle, lead, ctaLabel, secondaryLabel },
  about { title, text, now, cvUrl, cvLabel },
  contact { tagline, description, email, ctaLabel },
  footer { copyright, navLinks[] { _key, label, href } },
  socialLinks[] { _key, platform, url }
}`;

const PROJECTS_QUERY = /* groq */ `*[_type == "project"] | order(order asc) {
  _id,
  title,
  description,
  content,
  tags,
  icon,
  link,
  "mainImage": mainImage.asset->url,
  "gallery": gallery[].asset->url,
  "screenshot": screenshot.asset->url,
  "screenshotAlt": screenshot.alt,
  highlights[] { value, label },
  order,
  featured
}`;

// ─── Tipos ───

export interface SiteSettings {
  seo?: { title?: string; description?: string };
  hero?: { greeting?: string; title?: string; subtitle?: string; lead?: string; ctaLabel?: string; secondaryLabel?: string };
  about?: { title?: string; text?: string; now?: string[]; cvUrl?: string; cvLabel?: string };
  contact?: { tagline?: string; description?: string; email?: string; ctaLabel?: string };
  footer?: { copyright?: string; navLinks?: { _key: string; label: string; href: string }[] };
  socialLinks?: { _key: string; platform: string; url: string }[];
}

export interface Project {
  _id: string;
  title: string;
  description: string;
  content?: any[];
  tags?: string[];
  icon?: string;
  link?: string;
  mainImage?: string;
  gallery?: string[];
  screenshot?: string;
  screenshotAlt?: string;
  highlights?: { value?: string; label?: string }[];
  order?: number;
  featured?: boolean;
}

export interface SiteData {
  settings: SiteSettings;
  projects: Project[];
}

// ─── Funciones de Fetching ───

function ensureSanityConfig() {
  if (!import.meta.env.PUBLIC_SANITY_PROJECT_ID) {
    throw new Error('Missing PUBLIC_SANITY_PROJECT_ID environment variable');
  }
}

export async function getSettings(): Promise<SiteSettings | null> {
  ensureSanityConfig();
  return await sanityClient.fetch(SETTINGS_QUERY);
}

const slug = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Responsive sources for a card screenshot: the local captures ship at 600 and 1200 px wide next to the 2000 px
 * original (scripts/screenshots.mjs), and Sanity images are resized by its CDN.
 */
export function shotSrcset(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/screenshots/')) { const base = url.replace(/\.webp$/, ''); return `${base}-600.webp 600w, ${base}-1200.webp 1200w`; }
  if (url.includes('cdn.sanity.io')) return [600, 1200].map((w) => `${url}?w=${w}&auto=format ${w}w`).join(', ');
  return undefined;
}

/** A screenshot uploaded in Sanity wins; otherwise the capture made by scripts/screenshots.mjs, if there is one. */
export async function getProjects(): Promise<Project[]> {
  ensureSanityConfig();
  const projects: Project[] = await sanityClient.fetch(PROJECTS_QUERY);
  return projects.map((p) => {
    const local = (shots as Record<string, string>)[slug(p.title)];
    return p.screenshot || !local ? p : { ...p, screenshot: local, screenshotAlt: `Captura del sitio ${p.title}` };
  });
}

/**
 * Obtiene todos los datos iniciales necesarios para el sitio,
 * aplicando valores por defecto donde sea necesario.
 */
export async function getSiteData(): Promise<SiteData> {
  const [rawSettings, projects] = await Promise.all([
    getSettings(),
    getProjects()
  ]);

  const settings: SiteSettings = {
    hero: {
      greeting: rawSettings?.hero?.greeting ?? '¡Hola! Soy Lucas,',
      title: rawSettings?.hero?.title ?? 'Fullstack Developer',
      subtitle: rawSettings?.hero?.subtitle ?? 'especializado en UI/UX.',
      lead: rawSettings?.hero?.lead ?? 'Programador fullstack con foco en frontend y UI/UX (Astro, React y TypeScript). Me importa que cada producto se entienda a primera vista y cargue rápido.',
      ctaLabel: rawSettings?.hero?.ctaLabel ?? 'Ver proyectos',
      secondaryLabel: rawSettings?.hero?.secondaryLabel ?? 'Mandame un mensaje',
    },
    seo: {
      title: rawSettings?.seo?.title ?? 'Home',
      description: rawSettings?.seo?.description ?? 'Programador fullstack con foco en frontend y UI/UX. Interfaces claras, rápidas y productos web completos en Astro, React y TypeScript.',
    },
    about: {
      title: rawSettings?.about?.title ?? 'Sobre mí',
      text: rawSettings?.about?.text ?? 'Desarrollo aplicaciones web fullstack, pero donde más disfruto meter mano es en el frontend y la interfaz: jerarquía clara, ritmo visual y animaciones que acompañen el uso sin estorbar.',
      now: rawSettings?.about?.now?.length ? rawSettings.about.now : ['5to año de Licenciatura en Sistemas, UNTDF', 'Trabajando en proyectos personales'],
      cvUrl: rawSettings?.about?.cvUrl ?? '/cv.pdf',
      cvLabel: rawSettings?.about?.cvLabel ?? 'Descargar CV',
    },
    contact: {
      tagline: rawSettings?.contact?.tagline ?? 'Mandame un avión.',
      description: rawSettings?.contact?.description ?? 'Si tenés un proyecto en mente o estás buscando sumar gente a tu equipo, escribime y lo charlamos.',
      email: rawSettings?.contact?.email ?? 'lucasaraya19@hotmail.com',
      ctaLabel: rawSettings?.contact?.ctaLabel ?? 'Copiar mail',
    },
    footer: {
      copyright: rawSettings?.footer?.copyright && !/all rights reserved/i.test(rawSettings.footer.copyright) ? rawSettings.footer.copyright : 'Lucas Araya. Dibujado y programado a mano.',
      navLinks: rawSettings?.footer?.navLinks ?? [
        { _key: 'projects', label: 'Proyectos', href: '#projects' },
        { _key: 'about', label: 'Sobre mí', href: '#about' },
        { _key: 'contact', label: 'Contacto', href: '#contact' },
      ],
    },
    socialLinks: rawSettings?.socialLinks ?? [
      { _key: 'linkedin', platform: 'linkedin', url: 'https://www.linkedin.com/in/lucasaraya' },
      { _key: 'gmail', platform: 'gmail', url: 'mailto:lucasaraya19@hotmail.com' },
      { _key: 'instagram', platform: 'instagram', url: 'https://www.instagram.com/_lucasaraya/' },
      { _key: 'github', platform: 'github', url: 'https://github.com/LucasA21' },
    ],
  };

  return {
    settings,
    projects,
  };
}
