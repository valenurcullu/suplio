# Suplio

Web institucional y archivos originales de identidad de Suplio.

## Correr la web localmente

```sh
cd web
npm ci
npm run dev
```

Abrir la dirección que muestra Astro en la terminal.

## Estructura

- `web/`: proyecto Astro con TypeScript, Tailwind CSS y GSAP.
- `Suplio-Identidad-Visual/logos/`: originales SVG/PNG del isotipo y de los logos horizontales para cada fondo.
- `Suplio-Identidad-Visual/`: identidad visual vigente y guía; `vistas-previas/` contiene la imagen de presentación original.
- `Suplio-Identidad-Visual/referencias/`: respaldo histórico; no usar como identidad vigente.

Ver [la documentación de la web](web/README.md) para compilar, revisar producción y ejecutar las verificaciones. [LAUNCH.md](web/LAUNCH.md) detalla la preparación comercial y la configuración de Netlify; [LAUNCH-QA.md](web/LAUNCH-QA.md) registra la verificación actual y [COPY-AUDIT.md](web/COPY-AUDIT.md) contiene las propuestas de textos pendientes de aprobación. [QA.md](web/QA.md) conserva el historial anterior. Las capturas y los informes dentro de `test-results/` son artefactos locales ignorados por Git.

El caso Naves del Sur está implementado con capturas reales autorizadas; ver [PORTFOLIO-QA.md](web/PORTFOLIO-QA.md). La publicación y la configuración de hosting y dominio quedan pendientes.
