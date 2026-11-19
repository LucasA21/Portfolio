import type { Project, SiteSettings } from './sanity';

export const DEFAULT_SITE_URL = 'https://lucasaraya.com.ar';

/**
 * Serializes JSON-LD safely for inline <script type="application/ld+json"> tags,
 * escaping HTML/script-breaking characters to prevent XSS from CMS content.
 */
export function safeJsonLdStringify(data: unknown): string {
  if (data === undefined) return '{}';
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Returns true when running in a preview or staging environment that must not be indexed.
 */
export function isStagingEnvironment(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return (
    env.VERCEL_ENV === 'preview' ||
    env.APP_ENV === 'staging' ||
    env.PUBLIC_SANITY_DATASET === 'staging'
  );
}

/**
 * Generates robots.txt directives for search engines and AI crawlers,
 * blocking all crawling on preview/staging deployments.
 */
export function generateRobotsTxt(origin: string, isStaging = false): string {
  if (isStaging) {
    return '# Staging / Preview: noindex\nUser-agent: *\nDisallow: /\n';
  }

  const base = origin.replace(/\/+$/, '');
  const rules = [
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /404',
  ].join('\n');

  return `# robots.txt - Lucas Araya
User-agent: *
${rules}

User-agent: Googlebot
${rules}

User-agent: Bingbot
${rules}

User-agent: GPTBot
${rules}

User-agent: OAI-SearchBot
${rules}

User-agent: PerplexityBot
${rules}

User-agent: ClaudeBot
${rules}

User-agent: Claude-SearchBot
${rules}

Sitemap: ${base}/sitemap-index.xml

# Machine-readable profile for LLMs
# llms.txt: ${base}/llms.txt
`;
}

/**
 * Builds the linked Schema.org @graph for the portfolio homepage.
 */
export function buildPortfolioGraph(
  settings: SiteSettings,
  projects: Project[],
  origin = DEFAULT_SITE_URL,
  pageDescription?: string,
): Record<string, unknown> {
  const base = origin.replace(/\/+$/, '');
  const title = 'Lucas Araya | Fullstack Developer';
  const description =
    pageDescription ||
    settings.seo?.description ||
    'Programador fullstack con foco en frontend y UI/UX. Interfaces claras, rápidas y productos web completos en Astro, React y TypeScript.';
  const imageUrl = `${base}/og-image.png`;

  const sameAs = (settings.socialLinks ?? [])
    .map((s) => s.url)
    .filter((u): u is string => Boolean(u && /^https?:\/\//i.test(u)));

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      '@id': `${base}/#website`,
      url: `${base}/`,
      name: title,
      description,
      inLanguage: 'es-AR',
      publisher: { '@id': `${base}/#person` },
    },
    {
      '@type': 'Person',
      '@id': `${base}/#person`,
      name: 'Lucas Araya',
      jobTitle: 'Fullstack Developer especializado en UI/UX',
      url: `${base}/`,
      image: imageUrl,
      description: settings.about?.text || description,
      homeLocation: {
        '@type': 'Place',
        name: 'Ushuaia, Tierra del Fuego, Argentina',
      },
      knowsAbout: [
        'Fullstack Development',
        'Frontend Development',
        'UI/UX Design',
        'Astro',
        'React',
        'TypeScript',
        'Tailwind CSS',
        'GSAP',
        'Node.js',
        'PostgreSQL',
        'Web Performance',
        'Web Accessibility',
      ],
      sameAs:
        sameAs.length > 0
          ? sameAs
          : [
              'https://github.com/LucasA21',
              'https://www.linkedin.com/in/lucasaraya',
              'https://www.instagram.com/_lucasaraya/',
            ],
    },
    {
      '@type': 'ProfilePage',
      '@id': `${base}/#webpage`,
      url: `${base}/`,
      name: title,
      description,
      inLanguage: 'es-AR',
      isPartOf: { '@id': `${base}/#website` },
      mainEntity: { '@id': `${base}/#person` },
      about: { '@id': `${base}/#person` },
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: imageUrl,
        width: 1200,
        height: 630,
      },
    },
  ];

  if (projects.length > 0) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${base}/#projects`,
      name: 'Proyectos seleccionados',
      numberOfItems: projects.length,
      itemListElement: projects.map((project, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'CreativeWork',
          name: project.title,
          description: project.description,
          creator: { '@id': `${base}/#person` },
          ...(project.link && /^https?:\/\//i.test(project.link)
            ? { url: project.link }
            : {}),
        },
      })),
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

/**
 * Generates plain-text llms.txt profile following llmstxt.org conventions.
 */
export function generateLlmsTxt(
  origin: string,
  settings: SiteSettings,
  projects: Project[],
): string {
  const base = origin.replace(/\/+$/, '');
  const lead =
    settings.hero?.lead ||
    'Programador fullstack con foco en frontend y UI/UX (Astro, React y TypeScript). Me importa que cada producto se entienda a primera vista y cargue rápido.';
  const aboutText =
    settings.about?.text ||
    'Desarrollo aplicaciones web fullstack, pero donde más disfruto meter mano es en el frontend y la interfaz: jerarquía clara, ritmo visual y animaciones que acompañen el uso sin estorbar.';
  const email = settings.contact?.email || 'lucasaraya19@hotmail.com';
  const cvPath = settings.about?.cvUrl || '/cv.pdf';
  const cvUrl = /^https?:\/\//i.test(cvPath)
    ? cvPath
    : `${base}${cvPath.startsWith('/') ? '' : '/'}${cvPath}`;

  const socialLines = (settings.socialLinks ?? [])
    .filter((s) => s.url && /^https?:\/\//i.test(s.url))
    .map((s) => `- ${s.platform}: ${s.url}`)
    .join('\n');

  const projectLines = projects.length
    ? projects
        .map((p) => {
          const tags = (p.tags ?? []).slice(0, 3).join(', ');
          const linkPart =
            p.link && /^https?:\/\//i.test(p.link) ? ` (${p.link})` : '';
          const tagPart = tags ? ` [${tags}]` : '';
          return `- **${p.title}**${linkPart}${tagPart}: ${p.description}`;
        })
        .join('\n')
    : '- Proyectos cargados dinámicamente desde Sanity CMS.';

  return `# Lucas Araya — Fullstack Developer (especializado en UI/UX)

> ${lead}

## Sobre mí
- Nombre: Lucas Araya
- Rol: Fullstack Developer especializado en UI/UX
- Ubicación: Ushuaia, Tierra del Fuego, Argentina
- Sitio canónico: ${base}/
- Resumen: ${aboutText}
- Stack principal: Frontend & UI/UX (Astro, React, TypeScript, Tailwind CSS, GSAP), backend y arquitectura (Node.js, PostgreSQL, APIs), accesibilidad y rendimiento web.

## Proyectos seleccionados
${projectLines}

## Contacto y enlaces
- Email: ${email}
- CV: ${cvUrl}
${socialLines ? `${socialLines}\n` : ''}- Sitemap: ${base}/sitemap-index.xml
`;
}
