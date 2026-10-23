import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages staging sets PUBLIC_DEPLOY_TARGET=github-pages. Netlify builds without it.
const githubPages = process.env.PUBLIC_DEPLOY_TARGET === 'github-pages';

export default defineConfig({
  site: githubPages ? 'https://valenurcullu.github.io' : 'https://suplio.ar',
  base: githubPages ? '/suplio/' : '/',
  output: 'static',
  // Staging is noindex, so it does not publish a sitemap.
  integrations: githubPages ? [] : [sitemap({ filter: page => !page.includes('/consulta-recibida') })],
  vite: { plugins: [tailwindcss()] },
});
