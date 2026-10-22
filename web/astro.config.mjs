import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://suplio.ar',
  output: 'static',
  integrations: [sitemap({ filter: page => !page.includes('/consulta-recibida') })],
  vite: { plugins: [tailwindcss()] },
});
