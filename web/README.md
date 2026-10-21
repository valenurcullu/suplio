# Suplio

Home institucional estática en Astro, TypeScript, Tailwind CSS y GSAP.

## Desarrollo

Requiere Node compatible con la versión de Astro instalada (ver `package-lock.json`).

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
- `public/brand/`: copias exactas de los SVG originales. Los archivos de la raíz y `Suplio-Identidad-Visual/` permanecen intactos.
- `BrandMark.astro` usa los trazados originales para animar cada pieza. Solo se omiten los metadatos en el HTML emitido.
- Las fuentes se sirven localmente desde los paquetes Fontsource.
- `public/og.png`: pieza social derivada del logo original. Regenerar con `node scripts/generate-og.mjs`.

Contacto autorizado: `hola@suplio.ar`. Dominio previsto: `https://suplio.ar/`.

## Proyecto pendiente

Naves del Sur está identificado como caso en preparación. El espacio visual es un placeholder explícito; no representa una captura del proyecto. Antes de publicar, incorporar material y alcance autorizados, o retirar temporalmente el caso y su enlace de navegación. No hay resultados, testimonios ni métricas inventados.

## Verificación

Ver los resultados y límites de la revisión realizada en [QA.md](QA.md).

Con el servidor de producción activo, `npm run test:browser` ejecuta verificaciones con Playwright y axe en 320, 390, 768, 1024 y 1440 px, menú por teclado, anclas, contenido sin JavaScript, movimiento reducido y limpieza al redimensionar. Requiere Google Chrome instalado. `QA_URL` permite usar otra dirección local. Capturas y resultados se guardan en `test-results/` (ignorado).

Los puntajes Lighthouse solo deben reportarse después de medir la compilación real. Ninguna configuración de GitHub, Netlify ni DNS está aplicada. El build estático se genera en `dist/`.
