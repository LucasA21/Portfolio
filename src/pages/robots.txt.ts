import type { APIRoute } from 'astro';
import { DEFAULT_SITE_URL, generateRobotsTxt, isStagingEnvironment } from '../utils/seo';

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  const origin =
    url.hostname === 'localhost' || url.hostname === '127.0.0.1'
      ? DEFAULT_SITE_URL
      : url.origin;
  const body = generateRobotsTxt(origin, isStagingEnvironment());

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
};
