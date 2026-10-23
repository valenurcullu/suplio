# Suplio

Home institucional estática en Astro, TypeScript, Tailwind CSS y GSAP.

Preparación de lanzamiento: [LAUNCH.md](LAUNCH.md). Verificación actual: [LAUNCH-QA.md](LAUNCH-QA.md). Auditoría editorial pendiente de aprobación: [COPY-AUDIT.md](COPY-AUDIT.md).

## Desarrollo

Requiere Node >=22.22.0 según la versión de Astro instalada. La revisión local de lanzamiento se ejecutó con Node 24.15.0.

```sh
npm ci
npm run dev
```

La dirección local se muestra al iniciar Astro. Para compilar y revisar producción:

```sh
npm run build
npm run preview
```

## Contenido y marca

- `src/data/content.ts`: servicios, proceso y estado del proyecto destacado.
- `src/sections/`: composición de cada sección.
- `src/styles/global.css`: paleta, tipografías, responsive y estados.
- `src/scripts/main.ts`: navegación accesible y motion adaptativo.
- `public/brand/`: SVG que usa la web, copias exactas de los originales en `../Suplio-Identidad-Visual/logos/`. Las rutas públicas `/brand/` se mantienen.
- `BrandMark.astro` usa los trazados originales para animar cada pieza. Solo se omiten los metadatos en el HTML emitido.
- Las fuentes se sirven localmente desde los paquetes Fontsource.
- `public/images/og.png`: pieza social derivada del logo original. Regenerar con `node scripts/generate-og.mjs`.

Contacto autorizado: `hola@suplio.ar`. Dominio previsto: `https://suplio.ar/`.

## Proyecto pendiente

Naves del Sur es el primer caso autorizado del portfolio, con cuatro capturas reales generadas con Playwright y optimizadas para web. Contenido en `src/data/projects.ts` y presentación en `ProjectCase.astro`. Ver [PORTFOLIO-QA.md](PORTFOLIO-QA.md) para capturas, créditos y pruebas. Pyme Protegida tiene autorización del propietario y del diseñador para presentarse bajo Suplio; su incorporación queda para una próxima etapa, con selección de piezas del PDF y revisión previa de los elementos de Walrus. Ver [definición vigente](PORTFOLIO-PROPOSAL.md). No tiene placeholder visible. No hay resultados, testimonios ni métricas inventados.

## Verificación

Ver los resultados y límites de la revisión realizada en [QA.md](QA.md).

Con el servidor de producción activo, `npm run test:browser` ejecuta verificaciones con Playwright y axe en 320, 390, 768, 1024 y 1440 px, menú por teclado, anclas, contenido sin JavaScript, movimiento reducido y limpieza al redimensionar. Requiere Google Chrome instalado. `QA_URL` permite usar otra dirección local. Capturas y resultados se guardan en `test-results/` (ignorado).

Los puntajes Lighthouse solo deben reportarse después de medir la compilación real. El build estático se genera en `dist/`.

## Entornos

- **Producción (Netlify):** `npm run build`, con base `/`. Netlify compila sin `PUBLIC_DEPLOY_TARGET`; el formulario usa Netlify Forms. Los deploys se controlan manualmente desde Netlify.
- **Staging (GitHub Pages):** `.github/workflows/deploy-pages.yml` publica en https://valenurcullu.github.io/suplio/ con cada push a `main` (o manualmente desde Actions). Compila con `PUBLIC_DEPLOY_TARGET=github-pages`, que fija la base `/suplio/`, agrega `noindex`, omite el sitemap y deshabilita el envío del formulario.

Para probar el build de staging en local: `PUBLIC_DEPLOY_TARGET=github-pages npm run build`. Las rutas a archivos de `public/` y páginas internas deben armarse con `withBase()` de `src/data/deploy.ts`.
