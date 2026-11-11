/**
 * Script de Seed: Precarga los textos actuales del portfolio en Sanity.
 * Ejecutar con: npx tsx src/sanity/seed.ts
 */
import 'dotenv/config';
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.PUBLIC_SANITY_DATASET!,
  apiVersion: '2025-04-25',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

async function seed() {
  console.log('🌱 Iniciando seed de contenido...\n');

  // ─── 1. Site Settings (Singleton) ───
  console.log('📝 Creando configuración del sitio...');
  await client.createOrReplace({
    _id: 'siteSettings',
    _type: 'siteSettings',
    seo: {
      title: 'Home',
      description: 'Portfolio de Lucas Araya — Frontend Developer especializado en UI/UX desde Ushuaia, Argentina.',
    },
    hero: {
      greeting: '¡Hola! Soy Lucas,',
      title: 'Frontend Developer',
      subtitle: 'especializado en UI/UX.',
      ctaLabel: 'Proyectos',
    },
    contact: {
      tagline: 'Mandame un avión.',
      description: '¿Tenés un proyecto o una búsqueda? Escribime y te respondo.',
      email: 'lucasaraya19@hotmail.com',
      ctaLabel: 'HABLEMOS',
    },
    footer: {
      copyright: 'Lucas Araya. All rights reserved.',
      navLinks: [
        { _key: 'about', label: 'Sobre mí', href: '#about' },
        { _key: 'projects', label: 'Proyectos', href: '#projects' },
        { _key: 'contact', label: 'Contacto', href: '#contact' },
      ],
    },
    socialLinks: [
      { _key: 'linkedin', platform: 'linkedin', url: 'https://www.linkedin.com/in/lucasaraya' },
      { _key: 'gmail', platform: 'gmail', url: 'mailto:lucasaraya19@hotmail.com' },
      { _key: 'instagram', platform: 'instagram', url: 'https://www.instagram.com/_lucasaraya/' },
      { _key: 'github', platform: 'github', url: 'https://github.com/LucasA21' },
    ],
  });
  console.log('  ✅ Configuración del sitio creada\n');

  // ─── 2. Proyectos ───
  const projects = [
    {
      _id: 'project-eco-flow',
      title: 'Eco Flow',
      description: 'Una guía minimalista para una vida consciente. Desarrollada con Astro y Tailwind puro, optimizada cien por ciento para rendimiento brutal y accesibilidad total.',
      tags: ['Astro', 'Tailwind', 'UX Design'],
      order: 1,
      featured: true,
    },
    {
      _id: 'project-serene-space',
      title: 'Serene Space',
      description: 'Dashboard para una app de mindfulness. Arquitectura de estados globales complejos manteniendo la fluidez en cada micro-interacción de la interfaz.',
      tags: ['React', 'Framer Motion'],
      order: 2,
      featured: false,
    },
    {
      _id: 'project-quiet-commerce',
      title: 'Quiet Commerce',
      description: 'E-commerce planteado para reducir la fricción visual y la carga cognitiva. Escalamos la conversión en ventas en un ambiente libre de ruidos innecesarios.',
      tags: ['Next.js', 'Stripe'],
      order: 3,
      featured: false,
    },
  ];

  console.log('📦 Creando proyectos...');
  for (const project of projects) {
    await client.createOrReplace({
      ...project,
      _type: 'project',
    });
    console.log(`  ✅ ${project.title}`);
  }

  console.log('\n🎉 ¡Seed completado! Todos los textos están cargados en Sanity.');
  console.log('   Abrí /admin para verificar el contenido.');
}

seed().catch((err) => {
  console.error('❌ Error durante el seed:', err.message);
  process.exit(1);
});
