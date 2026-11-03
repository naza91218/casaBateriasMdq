import type { MetadataRoute } from 'next';
import { PRIVADAS } from '@/lib/seo';
import { SITIO } from '@/lib/sitio';

/**
 * Todos los rastreadores, incluidos los de buscadores con IA, pueden leer la tienda (FR-074);
 * el panel, el checkout y el seguimiento quedan afuera.
 */
const IA = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVADAS },
      { userAgent: IA, allow: '/', disallow: PRIVADAS },
    ],
    sitemap: `${SITIO}/sitemap.xml`,
  };
}
