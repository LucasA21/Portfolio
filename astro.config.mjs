// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sanity from '@sanity/astro';
import react from '@astrojs/react';
import icon from "astro-icon";
import { loadEnv } from 'vite';

import vercel from '@astrojs/vercel';

import sitemap from '@astrojs/sitemap';

const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET } = loadEnv(
  process.env.NODE_ENV || "development",
  process.cwd(),
  ""
);


export default defineConfig({
  site: 'https://lucasaraya.com.ar',
  output: 'server',
  vite: {
    plugins: [tailwindcss()],
    build: {
      chunkSizeWarningLimit: 2000
    }
  },
  // The site CSS is small (about 8 KB compressed): inlining it removes a render-blocking request on first paint.
  build: { inlineStylesheets: 'always' },

  integrations: [react(), icon(), sanity({
    projectId: PUBLIC_SANITY_PROJECT_ID,
    dataset: PUBLIC_SANITY_DATASET,
    useCdn: false,
    studioBasePath: '/admin',
  }), sitemap({
    filter: (page) => !page.includes('/admin')
  })],

  adapter: vercel()
});