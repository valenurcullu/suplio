# Portfolio real — Naves del Sur

Implementado el 21/10/2026 con autorización expresa del titular para usar capturas y enlazar el sitio. Listo en **http://127.0.0.1:4322/#proyectos**. Sin push ni deploy.

## Capturas seleccionadas

Generadas con Playwright y Chrome sobre el sitio publicado, con fuentes listas, imágenes visibles cargadas y animaciones terminadas. No se usaron imágenes generadas, stock ni mockups. Los encuadres interiores incluyen bloques completos y dejan los controles flotantes fuera del área capturada, sin modificar el contenido del sitio.

| Vista | Fuente | Captura optimizada | Tamaño completo |
| --- | --- | --- | --- |
| A. Inicio desktop | https://navesdelsur.com/ | [inicio-desktop-1440.webp](public/projects/naves-del-sur/inicio-desktop-1440.webp) | 1440 × 900; 126.432 bytes |
| B. Catálogo: categorías industriales y petroleras | https://navesdelsur.com/productos | [productos-1440.webp](public/projects/naves-del-sur/productos-1440.webp) | 1440 × 1050; 79.920 bytes |
| C. Presentación institucional y planta | https://navesdelsur.com/nosotros | [institucional-1320.webp](public/projects/naves-del-sur/institucional-1320.webp) | 1320 × 610; 106.070 bytes |
| D. Inicio móvil real | https://navesdelsur.com/ | [inicio-mobile-390.webp](public/projects/naves-del-sur/inicio-mobile-390.webp) | 390 × 844; 63.258 bytes |

Las interiores se capturaron con viewport desktop de 1440 px de ancho y mayor altura para encuadrar los bloques completos. C es una captura directa del elemento institucional. La vista móvil usa viewport de 390 × 844 con interacción táctil. Se inspeccionaron visualmente las cuatro antes de incorporarlas.

WebP calidad 86 con Sharp, ya instalado. Tres anchos para cada captura desktop, sin ampliar los originales. Los diez archivos suman 670.690 bytes; el navegador elige una sola variante por imagen mediante `srcset` y `sizes`. Las cuatro fuentes de mayor resolución suman 375.680 bytes (~367 KiB). En la prueba con DPR 1 se descargan 168.448 bytes de imágenes en móvil y 304.432 bytes a 1440 px. Son mediciones de recursos de imágenes, no una puntuación Lighthouse ni un benchmark de red móvil.

Todas las imágenes tienen dimensiones intrínsecas, texto alternativo, `loading="lazy"` y decodificación asíncrona. Los detalles se pueden abrir completos con «Ampliar». Todos los enlaces externos abren otra pestaña con `noopener noreferrer`, nombre accesible y foco visible.

## Composición y alcance

- Fondo Tinta y encabezado «Del problema a lo concreto.» conservados.
- Numeración, cliente y categoría antes de la captura principal.
- Inicio protagonista sobre la grilla existente; se conserva su parallax original.
- Catálogo más grande que la vista institucional, con un desfase vertical moderado.
- Captura móvil y alcance editorial al cierre. En móvil las cuatro imágenes se apilan.
- «Visitar sitio ↗» abre el sitio público real; se verificó la apertura desde el portfolio.
- Autoría: «Desarrollo web: Valentín Urcullú.», consistente con el crédito del footer público. No se atribuye al estudio un contrato anterior ni se afirma haber diseñado la identidad corporativa.

No se verificaron de forma independiente las cifras industriales ni certificaciones que aparecen dentro del sitio del cliente. Se reproducen sus páginas como material visual, sin convertir esas cifras en resultados del trabajo de Suplio. Tampoco se confirmó la fecha del encargo original; el crédito conserva el nombre de su desarrollador sin afirmar una cronología.

## Archivos de esta implementación

- `src/sections/Projects.astro`: reemplaza el placeholder por la colección de casos autorizados.
- `src/data/projects.ts`: contenido, categoría, crédito, alcance y metadatos de imágenes.
- `src/components/ProjectCase.astro`: composición editorial del caso con CSS acotado al componente.
- `src/components/ProjectImage.astro`: imágenes adaptables, dimensiones y enlaces para ampliar.
- `src/data/content.ts`: sólo se retiró el objeto obsoleto `featuredProject`; servicios y pasos se conservaron exactamente respecto del inicio de esta tarea.
- `public/projects/naves-del-sur/`: diez variantes WebP de las cuatro capturas.
- `scripts/verify-portfolio.mjs`: verificaciones del caso y artefactos de revisión.
- Este informe y actualización del estado del portfolio en README, guía de lanzamiento y propuesta anterior.

Se compararon hashes con el estado inicial de esta tarea: los únicos archivos de código existentes modificados fueron `Projects.astro` y `content.ts`. Intro, hero, servicios, proceso, identidad, contacto, formulario, WhatsApp, footer, estilos globales y scripts de animación permanecen idénticos.

## Verificación

Ejecutado sobre el build estático servido en el puerto 4322:

```sh
npm run build
node scripts/verify-portfolio.mjs
QA_URL=http://127.0.0.1:4322 npm run test:browser
QA_URL=http://127.0.0.1:4322 npm run test:contact
QA_URL=http://127.0.0.1:4322 node scripts/verify-process.mjs
```

- Build correcto: cero errores y cero warnings. Persisten tres hints previos sobre el objeto de resultados de `verify-services.mjs`; no afectan el sitio ni corresponden al portfolio.
- Portfolio: 320, 390, 768, 1024 y 1440 px; cuatro imágenes cargadas y sin recorte o estiramiento; proporciones reservadas correctas y altura estable tras decodificar; cero desbordes y cero infracciones detectadas por axe.
- Navegación por teclado, apertura real de la captura ampliada y del sitio de Naves, atributos de seguridad y alternativa sin JavaScript correctos.
- Revisión general: menús, SEO, anclas, movimiento reducido, identidad y alternativa sin JavaScript correctos; sin errores de recursos o consola.
- Contacto: validación, errores de red/HTTP, prevención de envíos repetidos y confirmación simulada correctos. No se enviaron consultas reales. WhatsApp, reveal de Proyectos, parallax existente y ensamblado de Identidad verificados.
- Proceso: ocho combinaciones de viewport, pin/flow, secuencia, reversa, pausa, salida hacia Proyectos, resize, refresh, anclas directas, movimiento reducido, fallo de JS y ciclo de vida correctos.

Resultados completos en `test-results/portfolio.json`, `test-results/process-verification.json` y los informes de las otras suites. Capturas limpias de la sección: `test-results/portfolio-320.png`, `portfolio-390.png`, `portfolio-768.png`, `portfolio-1024.png`, `portfolio-1440.png`.

## Revisión local y próximo caso

Abrir http://127.0.0.1:4322/#proyectos. Revisar desktop y luego 390 px; ampliar las cuatro vistas, recorrer sus enlaces con Tab y abrir «Visitar sitio». El preview queda ejecutándose. Para reconstruir cambios: `npm run build`. Si se necesita iniciarlo nuevamente: `npm run preview -- --port 4322`.

Pyme Protegida no figura en el HTML ni como placeholder. El titular confirmó las autorizaciones del propietario y del diseñador para presentarlo como proyecto del portfolio de Suplio. Su incorporación queda para una etapa posterior: seleccionar piezas reales del PDF y verificar previamente el alcance de la cesión sobre los elementos de Walrus y cualquier crédito o derecho de terceros pendiente. La definición pública y el alcance vigente están en [PORTFOLIO-PROPOSAL.md](PORTFOLIO-PROPOSAL.md).

Después se agregará un segundo objeto a `projects`, con su categoría, textos y recursos bajo `public/projects/<id>/`. Los casos se renderizan a todo el ancho, uno debajo del otro. La estructura admite portada, cantidad variable de vistas interiores y una imagen vertical opcional; sus dimensiones y textos son datos de cada proyecto, sin limitarlo a capturas de webs. La composición específica de identidad se ajustará sobre su material definitivo, sin reconstruir la sección ni añadir categorías vacías.
