import type { APIRoute } from 'astro';
import { getSiteData } from '../utils/sanity';
import { DEFAULT_SITE_URL, generateLlmsTxt } from '../utils/seo';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const origin =
    url.hostname === 'localhost' || url.hostname === '127.0.0.1'
      ? DEFAULT_SITE_URL
      : url.origin;
  const { settings, projects } = await getSiteData();
  const body = generateLlmsTxt(origin, settings, projects);

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
