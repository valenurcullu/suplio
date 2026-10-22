# Branding dentro de Servicios — verificación

21 de octubre de 2026. Cambio comercial acotado; sin push ni deploy.

## Cambio aplicado

Solo se modificó la primera entrada de `src/data/content.ts`:

- **Título:** «Diseño, branding» / «y desarrollo web», con un salto editorial entre ambas líneas.
- **Frase secundaria:** «Una presencia a tu altura.», conservada.
- **Descripción:** «Creamos identidades visuales y experiencias digitales que muestran quién sos, qué hacés y por qué elegirte.»
- **Ejemplos:** «Branding y rebranding · Desarrollo web · Identidad visual».
- **Microdemostración:** se conserva `diagram: 'web'` y su animación original.

Hay cuatro filas. Las otras tres entradas y el resto de `content.ts` se compararon con la copia anterior y siguen idénticos. La etiqueta accesible de la primera demo se actualiza automáticamente con el título desde el componente existente.

No hizo falta cambiar CSS, tamaños de letra, componentes ni scripts de animación. La comparación SHA-256 de todo `src/` con la copia anterior confirma que el único archivo modificado en esta fase es `data/content.ts`. Proyectos, Cómo trabajamos y las demás secciones permanecen intactos.

## Verificaciones

- `npm run build`: 0 errores, advertencias e hints.
- Título medido en 320, 390, 600, 768, 899, 900, 1024, 1440 y 1920 px: **dos líneas en todos los casos**, texto dentro de su columna y sin desbordes horizontales.
- Tamaños tipográficos originales: 30 px en móvil, 28 px en tablet, 29 px en los anchos de escritorio intermedios, 37,44 px en 1440 y 39 px en 1920. No se redujeron para acomodar el nuevo texto.
- Verificación de las cuatro demos con el script existente: descubrimiento por scroll, una activa a la vez, replays por hover, foco, Enter, Space y touch, orden de paquetes, movimiento reducido, resize y limpieza/reinicialización.
- Responsive y axe WCAG 2/2.1 A y AA en siete anchos: sin incidencias detectadas.
- Contenido y SVG finales visibles sin JavaScript.

La suite histórica de demos acumulaba CLS también durante el desmontaje artificial de toda la página. Ese evento elimina el spacer de Cómo trabajamos y produjo un CLS de 1 en la prueba, ajeno al uso normal de los servicios. Se instrumentó una copia temporal para identificar la fase: la interacción normal con las demos midió **0** y el único cambio registrado ocurrió en `synthetic-teardown`.

En `scripts/verify-services.mjs` se movió la comprobación de CLS al final de las interacciones normales, antes de cambiar preferencias, dimensiones o desmontar la página. Las comprobaciones de comportamiento y limpieza se conservan. `interactionCLS` contiene esa medición y `motion.cls` sigue registrando el acumulado completo, incluidos los cambios intencionales del test. No se modificaron los efectos para hacer pasar la prueba.

Resultados: `test-results/branding-title-verification.json`, `services-verification.json` y el diagnóstico de fases en `branding-services-diagnostic.json`. Capturas revisadas: [escritorio](test-results/branding-service-1440.png), [tablet](test-results/branding-service-768.png) y [móvil](test-results/branding-service-320.png).

## Revisión local y portfolio

El preview existente sirve la compilación actual en **http://127.0.0.1:4322/#servicios**. Para desarrollo, desde la raíz: `cd web` y luego `npm run dev`.

La propuesta de portfolio está en [PORTFOLIO-PROPOSAL.md](PORTFOLIO-PROPOSAL.md). No se creó un componente de Pyme Protegida ni se incorporaron imágenes o datos del caso al sitio. Falta el PDF, la confirmación de materiales finales y créditos, las autorizaciones de publicación y la aprobación de la composición.
