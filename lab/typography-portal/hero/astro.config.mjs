import original from '../../../web/astro.config.mjs';
// Lab-only build. Original modules/sections remain byte-for-byte untouched.
export default {
  ...original,
  base: '/',
  vite: {
    ...original.vite,
    plugins: [...original.vite.plugins, {
      name: 'suplio-hero-portal-runtime', enforce: 'pre',
      transform(code, id) {
        if (id.replaceAll('\\', '/').endsWith('/src/scripts/main.ts')) return `${code}\nwindow.__suplioPortalRuntime = { gsap, ScrollTrigger };\n`;
      },
    }],
  },
};
