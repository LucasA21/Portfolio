// Sync helper for Sanity datasets: create/clone staging, preview diff, apply approved copy + projects + screenshots to staging, and promote staging -> production.
// Usage:
//   node scripts/sanity-sync.mjs setup-staging
//   node scripts/sanity-sync.mjs diff
//   node scripts/sanity-sync.mjs apply-staging
//   node scripts/sanity-sync.mjs promote [--apply]
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
if (!projectId) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID in .env');
  process.exit(1);
}

const API_VERSION = '2025-04-25';
const token = process.env.SANITY_WRITE_TOKEN;

const makeClient = (dataset, useToken = false) =>
  createClient({
    projectId,
    dataset,
    apiVersion: API_VERSION,
    useCdn: false,
    ...(useToken && token ? { token } : {}),
  });

const APPROVED_STAGING_SETTINGS = {
  seo: {
    title: 'Home',
    description:
      'Programador fullstack con foco en frontend y UI/UX. Interfaces claras, rápidas y productos web completos en Astro, React y TypeScript.',
  },
  hero: {
    greeting: '¡Hola! Soy Lucas,',
    title: 'Fullstack Developer',
    subtitle: 'especializado en UI/UX.',
    lead: 'Programador fullstack con foco en frontend y UI/UX (Astro, React y TypeScript). Me importa que cada producto se entienda a primera vista y cargue rápido.',
    ctaLabel: 'Ver proyectos',
    secondaryLabel: 'Mandame un mensaje',
  },
  about: {
    title: 'Sobre mí',
    text: 'Desarrollo aplicaciones web fullstack, pero donde más disfruto meter mano es en el frontend y la interfaz: jerarquía clara, ritmo visual y animaciones que acompañen el uso sin estorbar.',
    now: [
      '5to año de Licenciatura en Sistemas, UNTDF',
      'Trabajando en proyectos personales',
    ],
    cvUrl: '/cv.pdf',
    cvLabel: 'Descargar CV',
  },
  contact: {
    tagline: 'Mandame un avión.',
    description: 'Si tenés un proyecto en mente o estás buscando sumar gente a tu equipo, escribime y lo charlamos.',
    ctaLabel: 'Copiar mail',
  },
  footerCopyright: 'Lucas Araya. Dibujado y programado a mano.',
};

const ptBlock = (text, style = 'normal', key = 'b1') => ({
  _type: 'block',
  _key: key,
  style,
  markDefs: [],
  children: [{ _type: 'span', _key: `${key}s`, text, marks: [] }],
});

const STAGING_PROJECT_MEDIA = {
  thejudex: {
    screenshot: { path: 'public/screenshots/thejudex.webp', alt: 'Portada de TheJudex en modo claro' },
    mainImage: { path: 'public/screenshots/thejudex.webp', alt: 'Directorio de software B2B TheJudex en modo claro' },
    gallery: [],
  },
  lumen: {
    screenshot: { path: 'public/screenshots/lumen.webp', alt: 'Portada de Lumen Slides en modo claro' },
    mainImage: { path: 'public/screenshots/lumen.webp', alt: 'Editor y vista previa 16:9 de Lumen Slides en modo claro' },
    gallery: [
      { path: '.agents/staging-assets/lumen-gallery.webp', alt: 'Catálogo de plantillas visuales de Lumen Slides en modo claro' },
    ],
  },
  synclife: {
    screenshot: { path: 'public/screenshots/synclife.webp', alt: 'Portada de SyncLife en modo claro' },
    mainImage: { path: 'public/screenshots/synclife.webp', alt: 'Landing de SyncLife en modo claro' },
    gallery: [
      { path: '.agents/staging-assets/synclife-blocks.webp', alt: 'Editor atómico modular de SyncLife en modo claro' },
    ],
  },
  'antartida-3d': {
    screenshot: { path: 'public/screenshots/antartida-3d.webp', alt: 'Mapa 3D interactivo de Antártida por descubrir' },
    mainImage: { path: 'public/screenshots/antartida-3d.webp', alt: 'Mapa cartográfico 3D de la Antártida con relieve real' },
    gallery: [
      { path: '.agents/staging-assets/antartida-notebook.webp', alt: 'Cuaderno de campo Desde Ushuaia con fuentes científicas en Antártida por descubrir' },
      { path: '.agents/staging-assets/antartida-activities.webp', alt: 'Índice del atlas y recorridos guiados de Antártida por descubrir' },
      { path: '.agents/staging-assets/antartida-expedition.webp', alt: 'Recorrido interactivo paso a paso sobre el mapa 3D antártico' },
    ],
  },
  'medias-del-beagle': {
    screenshot: { path: 'public/screenshots/medias-del-beagle.webp', alt: 'Portada de Medias del Beagle en modo claro' },
    mainImage: { path: 'public/screenshots/medias-del-beagle.webp', alt: 'Inicio de Medias del Beagle con acceso por enlace o código' },
    gallery: [
      { path: '.agents/staging-assets/medias-sala.webp', alt: 'Sala familiar de Medias del Beagle con cuenta regresiva y estado de edición' },
      { path: '.agents/staging-assets/medias-arbol.webp', alt: 'Árbol interactivo de medias con toda la familia en Medias del Beagle' },
      { path: '.agents/staging-assets/medias-votacion.webp', alt: 'Votación anónima por mediana de presupuesto y temáticas en Medias del Beagle' },
    ],
  },
  levelme: {
    screenshot: { path: 'public/screenshots/levelme.webp', alt: 'Vistas principales de la app Android LevelMe' },
    mainImage: { path: 'public/screenshots/levelme.webp', alt: 'Diario de misiones, perfil de héroe y radar de atributos en LevelMe' },
    gallery: [
      { path: '.agents/staging-assets/levelme-settings.webp', alt: 'Opciones del reino, sonido y recordatorios diarios en LevelMe' },
    ],
  },
};

const STAGING_UPSERT_PROJECTS = [
  {
    _id: '11ed6ccf-3832-4ad4-9347-7add16f58b17',
    title: 'TheJudex',
    description:
      'Directorio de software B2B armado para SEO programático. Genera miles de comparativas y fichas indexables con Astro SSR y PostgreSQL, sin JavaScript de cliente en el catálogo.',
    link: 'https://thejudex.com/',
    order: 1,
    featured: true,
    mediaKey: 'thejudex',
    highlights: [
      { _key: 'h1', value: '0 KB', label: 'JS en catálogo' },
      { _key: 'h2', value: '5 idiomas', label: 'en, es, pt, de y fr' },
      { _key: 'h3', value: 'WCAG 2.2 AA', label: '770+ tests y a11y' },
    ],
    content: [
      ptBlock('Los directorios de software suelen ser lentos, repetitivos y rankean mal. Armé TheJudex para que escale de 1.000 a más de 50.000 URLs indexables con contenido propio y un costo de infraestructura mínimo.', 'normal', 'tj1'),
      ptBlock('El pipeline extrae datos con Python y Playwright Stealth sobre PostgreSQL 16 (Drizzle ORM), los enriquece con Gemini Flash Lite y renderiza en Astro 5 SSR en cinco idiomas con 0 KB de JS de cliente.', 'normal', 'tj2'),
      ptBlock('Incluye controles estáticos anti-JS en el catálogo, chequeo de similitud léxica con Jaccard (<65%), validación con Zod, suite en Vitest + Playwright con Axe-Core (WCAG 2.2 AA) y deploy con Docker + Traefik v3.', 'normal', 'tj3'),
    ],
  },
  {
    _id: 'project-antartida-3d',
    title: 'Antártida por descubrir',
    description:
      'Mapa interactivo en 3D para recorrer la Antártida con relieve real, seis expediciones guiadas y datos científicos con fuente verificable.',
    tags: ['React', 'Three.js', 'TypeScript', 'Vite'],
    link: 'https://antartida3d.vercel.app/',
    order: 2,
    featured: false,
    mediaKey: 'antartida-3d',
    content: [
      ptBlock('Armé esta plataforma de divulgación sobre la Antártida para el hackatón SoberaníaTech desde Ushuaia.', 'normal', 'a1'),
      ptBlock('Combina un mapa tridimensional en Three.js con seis recorridos temáticos, estética de cuaderno de campo, modo accesible sin WebGL y fuentes primarias citadas para cada dato.', 'normal', 'a2'),
    ],
  },
  {
    _id: 'project-medias-del-beagle',
    title: 'Medias del Beagle',
    description:
      'PWA familiar para organizar el amigo invisible sin usuarios ni contraseñas: entrás con tu link de WhatsApp y cargás qué te gustaría recibir.',
    tags: ['Astro', 'React', 'TypeScript', 'Tailwind', 'Drizzle ORM', 'PostgreSQL'],
    link: 'https://medias.lucasaraya.com.ar',
    order: 3,
    featured: false,
    mediaKey: 'medias-del-beagle',
    content: [
      ptBlock('La pensé para organizar el amigo invisible de fin de año en familia sin tener que crear cuentas ni repartir planillas.', 'normal', 'm1'),
      ptBlock('Funciona como PWA con acceso por enlace privado o código familiar, lista de deseos, votación y un panel ciego para que incluso quien organiza pueda jugar sin ver los emparejamientos.', 'normal', 'm2'),
    ],
  },
  {
    _id: '6e6fa622-58c1-4968-b852-1244be751824',
    title: 'Lumen',
    description:
      'Editor de presentaciones web en 16:9 fijo (1920×1080) con asistencia de Gemini para armar o ajustar bloques y exportación a PDF, HTML y PowerPoint.',
    order: 4,
    featured: false,
  },
  {
    _id: '52f5e8e7-cd1b-4540-93bf-9c3fe392fa6b',
    title: 'SyncLife',
    description:
      'Workspace modular donde cada persona arma su tablero con widgets sueltos (tareas, tablas, cronogramas y pizarras) sobre Next.js, Kotlin/Quarkus y gRPC.',
    order: 5,
    featured: false,
  },
  {
    _id: 'project-eco-flow',
    title: 'Tamara Vasak',
    description:
      'Tienda online y panel de gestión interno unificados en una misma plataforma: catálogo y reservas por un lado, stock, pedidos y reportes en PDF por el otro.',
    link: 'https://tamaravasak.com/',
    order: 6,
    featured: false,
  },
  {
    _id: 'project-levelme',
    title: 'LevelMe',
    description:
      'App Android en Flutter, 100% offline, que convierte hábitos diarios en misiones estilo RPG con subida de nivel, atributos y gráficos de progreso.',
    tags: ['Flutter', 'Dart', 'Riverpod', 'Isar DB', 'Lottie'],
    order: 7,
    featured: false,
    mediaKey: 'levelme',
    content: [
      ptBlock('La desarrollé en Flutter con arquitectura por features y base local en Isar para que responda al instante sin conexión.', 'normal', 'l1'),
      ptBlock('Cada hábito completado suma experiencia y sube atributos del personaje (STR, AGI, VIT, INT, WIL, CHA), con gráfico radar, rachas, animaciones Lottie y efectos de sonido.', 'normal', 'l2'),
    ],
  },
];

async function fetchDatasetState(dataset) {
  const client = makeClient(dataset, Boolean(token));
  try {
    const [settings, projects] = await Promise.all([
      client.fetch('*[_id == "siteSettings"][0]'),
      client.fetch('*[_type == "project"] | order(order asc)'),
    ]);
    return { exists: true, settings, projects };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/Dataset not found/i.test(msg) || /404/.test(msg)) {
      return { exists: false, settings: null, projects: [] };
    }
    throw err;
  }
}

function summarizeDiff(staging, prod) {
  const changes = [];
  const clean = (doc) => {
    if (!doc) return null;
    const { _rev, _updatedAt, _createdAt, _system, ...rest } = doc;
    return rest;
  };

  if (JSON.stringify(clean(staging.settings)) !== JSON.stringify(clean(prod.settings))) {
    changes.push('siteSettings');
  }

  const prodById = new Map(prod.projects.map((p) => [p._id, clean(p)]));
  const stagingIds = new Set(staging.projects.map((p) => p._id));
  for (const p of staging.projects) {
    const prev = prodById.get(p._id);
    if (!prev) changes.push(`project:${p.title} (new)`);
    else if (JSON.stringify(clean(p)) !== JSON.stringify(prev)) {
      changes.push(`project:${p.title}`);
    }
  }
  for (const p of prod.projects) {
    if (!stagingIds.has(p._id)) {
      changes.push(`project:${p.title} (delete)`);
    }
  }
  return changes;
}

async function uploadLocalImage(client, filePath, alt) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) throw new Error(`Image file not found: ${abs}`);
  const buf = fs.readFileSync(abs);
  const asset = await client.assets.upload('image', buf, { filename: path.basename(abs) });
  return {
    _type: 'image',
    asset: { _type: 'reference', _ref: asset._id },
    ...(alt ? { alt } : {}),
  };
}

/**
 * Ensures any image asset referenced in a document from `staging` also exists in `production`,
 * uploading missing assets so promoted documents never point to broken references.
 */
async function syncImageRefs(node, stagingClient, prodClient, cache) {
  if (Array.isArray(node)) {
    return Promise.all(node.map((item) => syncImageRefs(item, stagingClient, prodClient, cache)));
  }
  if (!node || typeof node !== 'object') return node;

  if (node._type === 'image' && node.asset?._ref) {
    const ref = node.asset._ref;
    if (!cache.has(ref)) {
      const existing = await prodClient.fetch('*[_id == $id][0]{ _id }', { id: ref });
      if (existing?._id) {
        cache.set(ref, ref);
      } else {
        const assetDoc = await stagingClient.fetch('*[_id == $id][0]{ url, originalFilename }', {
          id: ref,
        });
        if (!assetDoc?.url) {
          throw new Error(`Missing staging asset URL for ${ref}`);
        }
        const res = await fetch(assetDoc.url);
        if (!res.ok) throw new Error(`Failed to fetch asset ${ref}: HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const uploaded = await prodClient.assets.upload('image', buf, {
          filename: assetDoc.originalFilename || `${ref}.webp`,
        });
        cache.set(ref, uploaded._id);
      }
    }
    return {
      ...node,
      asset: { ...node.asset, _ref: cache.get(ref) },
    };
  }

  const out = {};
  for (const [k, v] of Object.entries(node)) {
    out[k] = await syncImageRefs(v, stagingClient, prodClient, cache);
  }
  return out;
}

const cmd = process.argv[2] || 'diff';
const apply = process.argv.includes('--apply');

if (cmd === '--help' || cmd === '-h') {
  console.log('Usage: node scripts/sanity-sync.mjs <setup-staging | diff | apply-staging | promote [--apply]>');
  process.exit(0);
}

if (cmd === 'diff') {
  const [staging, prod] = await Promise.all([
    fetchDatasetState('staging'),
    fetchDatasetState('production'),
  ]);
  if (!staging.exists) {
    console.log('Dataset "staging" does not exist yet. Create it with: pnpm sanity:setup-staging');
    process.exit(0);
  }
  const changes = summarizeDiff(staging, prod);
  console.log(changes.length ? `Differences (staging vs production):\n- ${changes.join('\n- ')}` : 'staging and production are in sync.');
  process.exit(0);
}

if (!token) {
  console.error('Missing SANITY_WRITE_TOKEN in .env (create a token at sanity.io/manage -> API -> Tokens).');
  process.exit(1);
}

if (cmd === 'setup-staging') {
  const prodClient = makeClient('production', true);
  let staging = await fetchDatasetState('staging');
  if (!staging.exists) {
    try {
      await prodClient.datasets.create('staging', { aclMode: 'public' });
      console.log('Created public dataset "staging".');
      staging = await fetchDatasetState('staging');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `Could not create dataset "staging" via API (${msg}).\nCreate it once in the Sanity panel (left sidebar -> Datasets -> Add dataset -> name: "staging", Visibility: Public) and re-run: pnpm sanity:setup-staging`,
      );
      process.exit(1);
    }
  }

  const prod = await fetchDatasetState('production');
  const stagingClient = makeClient('staging', true);
  const assetCache = new Map();
  const docs = [prod.settings, ...prod.projects].filter(Boolean);
  for (const doc of docs) {
    const { _rev, _updatedAt, _createdAt, _system, ...cleanDoc } = doc;
    const syncedDoc = await syncImageRefs(cleanDoc, prodClient, stagingClient, assetCache);
    await stagingClient.createOrReplace(syncedDoc);
    console.log(`Copied ${doc._type}:${doc._id} -> staging`);
  }
  console.log('Staging initialized from production.');
  process.exit(0);
}

if (cmd === 'apply-staging') {
  const staging = await fetchDatasetState('staging');
  if (!staging.exists) {
    console.error('Dataset "staging" does not exist yet. Run: pnpm sanity:setup-staging');
    process.exit(1);
  }
  const client = makeClient('staging', true);

  // 1. Update siteSettings copy
  const current = staging.settings || { _id: 'siteSettings', _type: 'siteSettings' };
  const nextSettings = {
    ...current,
    _id: 'siteSettings',
    _type: 'siteSettings',
    seo: { ...(current.seo || {}), ...APPROVED_STAGING_SETTINGS.seo },
    hero: { ...(current.hero || {}), ...APPROVED_STAGING_SETTINGS.hero },
    about: {
      ...(current.about || {}),
      ...APPROVED_STAGING_SETTINGS.about,
    },
    contact: { ...(current.contact || {}), ...APPROVED_STAGING_SETTINGS.contact },
    footer: { ...(current.footer || {}), copyright: APPROVED_STAGING_SETTINGS.footerCopyright },
  };
  await client.createOrReplace(nextSettings);
  console.log('Updated staging/siteSettings.');

  // 2. Remove PixDex completely from staging
  const pixdexDocs = staging.projects.filter(
    (p) => p._id === 'project-serene-space' || /^pixdex$/i.test(p.title || ''),
  );
  for (const doc of pixdexDocs) {
    await client.delete(doc._id);
    console.log(`Deleted ${doc.title} (${doc._id}) from staging.`);
  }

  // 3. Upsert projects (copy, highlights, links, order, featured, and new screenshots)
  for (const spec of STAGING_UPSERT_PROJECTS) {
    const { mediaKey, ...fields } = spec;
    const prev = staging.projects.find((p) => p._id === spec._id);
    const mediaPatch = {};
    if (mediaKey && STAGING_PROJECT_MEDIA[mediaKey]) {
      const m = STAGING_PROJECT_MEDIA[mediaKey];
      mediaPatch.screenshot = await uploadLocalImage(client, m.screenshot.path, m.screenshot.alt);
      mediaPatch.mainImage = await uploadLocalImage(client, m.mainImage.path, m.mainImage.alt);
      mediaPatch.gallery = [];
      for (let i = 0; i < m.gallery.length; i++) {
        const img = await uploadLocalImage(client, m.gallery[i].path, m.gallery[i].alt);
        mediaPatch.gallery.push({ ...img, _key: `${mediaKey}-g-${i + 1}` });
      }
    }
    await client.createOrReplace({
      ...(prev || {}),
      ...fields,
      ...mediaPatch,
      _type: 'project',
    });
    console.log(`Upserted ${spec.title} (${spec._id}) in staging.`);
  }

  // 4. Refresh Lumen & SyncLife light-mode screenshots
  for (const p of staging.projects) {
    const key = /^lumen$/i.test(p.title || '')
      ? 'lumen'
      : /^synclife$/i.test(p.title || '')
        ? 'synclife'
        : null;
    if (!key) continue;
    const mediaSpec = STAGING_PROJECT_MEDIA[key];
    const screenshot = await uploadLocalImage(client, mediaSpec.screenshot.path, mediaSpec.screenshot.alt);
    const mainImage = await uploadLocalImage(client, mediaSpec.mainImage.path, mediaSpec.mainImage.alt);
    const gallery = [];
    for (let i = 0; i < mediaSpec.gallery.length; i++) {
      const img = await uploadLocalImage(client, mediaSpec.gallery[i].path, mediaSpec.gallery[i].alt);
      gallery.push({ ...img, _key: `${key}-g-${i + 1}` });
    }
    await client.patch(p._id).set({ screenshot, mainImage, gallery, featured: false }).commit();
    console.log(`Updated light-mode media for ${p.title} (${p._id}).`);
  }

  console.log('Staging sync complete.');
  process.exit(0);
}

if (cmd === 'promote') {
  const [staging, prod] = await Promise.all([
    fetchDatasetState('staging'),
    fetchDatasetState('production'),
  ]);
  if (!staging.exists) {
    console.error('Dataset "staging" does not exist.');
    process.exit(1);
  }
  const changes = summarizeDiff(staging, prod);
  if (!changes.length) {
    console.log('Nothing to promote: staging and production already match.');
    process.exit(0);
  }
  console.log(`Pending changes to promote (staging -> production):\n- ${changes.join('\n- ')}`);
  if (!apply) {
    console.log('\nDry run only. Run `pnpm sanity:promote -- --apply` to write to production.');
    process.exit(0);
  }

  const stagingClient = makeClient('staging', true);
  const prodClient = makeClient('production', true);
  const assetCache = new Map();

  const docs = [staging.settings, ...staging.projects].filter(Boolean);
  for (const doc of docs) {
    const { _rev, _updatedAt, _createdAt, _system, ...cleanDoc } = doc;
    const syncedDoc = await syncImageRefs(cleanDoc, stagingClient, prodClient, assetCache);
    await prodClient.createOrReplace(syncedDoc);
    console.log(`Promoted ${doc._type}:${doc._id}`);
  }

  // Delete projects from production that were removed in staging (e.g. PixDex).
  const stagingProjectIds = new Set(staging.projects.map((p) => p._id));
  for (const prodProject of prod.projects) {
    if (!stagingProjectIds.has(prodProject._id)) {
      await prodClient.delete(prodProject._id);
      console.log(`Deleted removed project ${prodProject.title} (${prodProject._id}) from production.`);
    }
  }

  console.log('Promotion complete.');
  process.exit(0);
}

console.error(`Unknown command: ${cmd}`);
process.exit(1);
