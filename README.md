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
- `suplio-horizontal-claro.*` y `suplio-horizontal-oscuro.*`: logos horizontales originales para cada fondo.
- `Suplio-Identidad-Visual/`: identidad visual vigente, isotipos y guía.
- `Suplio-Identidad-Visual/referencias/`: respaldo histórico; no usar como identidad vigente.

Ver [la documentación de la web](web/README.md) para compilar, revisar producción y ejecutar las verificaciones. [QA.md](web/QA.md) registra las pruebas locales realizadas; las capturas y los informes dentro de `test-results/` son artefactos locales ignorados por Git.

El caso Naves del Sur conserva un placeholder explícito hasta incorporar material autorizado. La publicación y la configuración de hosting y dominio quedan pendientes.
