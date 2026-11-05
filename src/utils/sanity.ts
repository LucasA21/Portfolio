import { sanityClient } from 'sanity:client';

// ─── Queries GROQ ───

const SETTINGS_QUERY = /* groq */ `*[_id == "siteSettings"][0]{
  seo { title, description },
  hero { greeting, title, subtitle, ctaLabel },
  about { title, text, cvUrl, cvLabel },
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
  order,
  featured
}`;

// ─── Tipos ───

export interface SiteSettings {
  seo?: { title?: string; description?: string };
  hero?: { greeting?: string; title?: string; subtitle?: string; ctaLabel?: string };
  about?: { title?: string; text?: string; cvUrl?: string; cvLabel?: string };
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
  order?: number;
  featured?: boolean;
}

export interface SiteData {
  settings: SiteSettings;
  projects: Project[];
}

// ─── Funciones de Fetching ───

export async function getSettings(): Promise<SiteSettings | null> {
  return await sanityClient.fetch(SETTINGS_QUERY);
}

export async function getProjects(): Promise<Project[]> {
  return await sanityClient.fetch(PROJECTS_QUERY);
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
      title: rawSettings?.hero?.title ?? 'Frontend Developer',
      subtitle: rawSettings?.hero?.subtitle ?? 'especializado en UI/UX.',
      ctaLabel: rawSettings?.hero?.ctaLabel ?? 'Proyectos',
    },
    seo: {
      title: rawSettings?.seo?.title ?? 'Home',
      description: rawSettings?.seo?.description ?? 'Frontend Developer especializado en crear interfaces modernas, minimalistas y altamente performantes. Explora mis proyectos y descubre cómo trabajo.',
    },
    about: {
      title: rawSettings?.about?.title ?? 'Sobre mí',
      text: rawSettings?.about?.text ?? 'Soy Lucas, frontend developer. Me importa que una interfaz se entienda a primera vista y se sienta rápida: cuido la jerarquía, el ritmo y los detalles de movimiento. Trabajo con Astro, React y TypeScript, y me animo a tocar el backend cuando el proyecto lo pide.',
      cvUrl: rawSettings?.about?.cvUrl ?? '/cv.pdf',
      cvLabel: rawSettings?.about?.cvLabel ?? 'Descargar CV',
    },
    contact: {
      tagline: rawSettings?.contact?.tagline ?? 'Hagamos equipo',
      description: rawSettings?.contact?.description ?? 'Estoy con disponibilidad para sumarme a nuevos proyectos. Ya sea que tengas una idea en mente o simplemente quieras charlar sobre código o diseño, ¡escribime!',
      email: rawSettings?.contact?.email ?? 'lucasaraya19@hotmail.com',
      ctaLabel: rawSettings?.contact?.ctaLabel ?? 'HABLEMOS',
    },
    footer: {
      copyright: rawSettings?.footer?.copyright ?? 'Lucas Araya. All rights reserved.',
      navLinks: rawSettings?.footer?.navLinks ?? [
        { _key: 'about', label: 'Sobre mí', href: '#about' },
        { _key: 'projects', label: 'Proyectos', href: '#projects' },
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
