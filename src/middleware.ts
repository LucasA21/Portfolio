import crypto from 'node:crypto';
import { defineMiddleware } from 'astro:middleware';
import { isStagingEnvironment } from './utils/seo';

function buildPublicCsp(nonce: string, isProd: boolean): string {
  const connectSources = isProd
    ? "'self' https://vitals.vercel-insights.com https://*.sanity.io"
    : "'self' ws: wss: https://vitals.vercel-insights.com https://*.sanity.io";

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://cdn.sanity.io https://*.sanity.io",
    `connect-src ${connectSources}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
  ];

  if (isProd) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

function buildAdminCsp(isProd: boolean): string {
  const connectSources = isProd
    ? "'self' https://*.sanity.io https://*.apicdn.sanity.io wss://*.sanity.io https://vitals.vercel-insights.com"
    : "'self' ws: wss: https://*.sanity.io https://*.apicdn.sanity.io https://vitals.vercel-insights.com";

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://cdn.sanity.io https://*.sanity.io https://*.googleusercontent.com",
    `connect-src ${connectSources}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
  ].join('; ');
}

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;
  const isAdmin = pathname.startsWith('/admin');
  const isProd = import.meta.env.PROD;
  const cspNonce = crypto.randomBytes(16).toString('base64');

  const response = await next();

  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', isAdmin ? buildAdminCsp(isProd) : buildPublicCsp(cspNonce, isProd));
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (isProd) {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  if (isAdmin || isStagingEnvironment()) {
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  const contentType = headers.get('content-type') || '';
  if (
    !isAdmin &&
    response.body &&
    response.status !== 304 &&
    response.status !== 204 &&
    contentType.includes('text/html')
  ) {
    const html = await response.text();
    // Skip JSON-LD scripts and scripts that already carry a nonce.
    const noncedHtml = html.replace(
      /<script(?![^>]*\bnonce=)(?![^>]*\btype=["']application\/ld\+json["'])([^>]*)>/gi,
      `<script nonce="${cspNonce}"$1>`,
    );
    headers.delete('content-length');
    return new Response(noncedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
