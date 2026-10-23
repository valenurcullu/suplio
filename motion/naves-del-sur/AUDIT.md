# Auditoría de producción — Naves del Sur V3

22/10/2026. Limpieza reversible y optimización posteriores a V3. Tamaños decimales, suma del contenido de los archivos. No se eliminó el historial Git ni se modificó el diseño de Suplio.

## Resultado publicado

| Recurso | Bytes | Tamaño |
| --- | ---: | ---: |
| `web/dist/` completo | 3.396.717 | 3,40 MB |
| `web/public/` completo | 3.112.177 | 3,11 MB |
| MP4 V3 optimizado | 2.355.202 | 2,36 MB |
| Poster WebP sin pérdida | 17.772 | 17,8 KB |
| Master V3 local, sin recomprimir | 3.415.802 | 3,42 MB |

El MP4 conserva 12,6 s, 1280 × 720, 30 fps y ausencia de audio. Utiliza H.264 CRF 21, preset slow, yuv420p y faststart. Es **31,05 % menor** que el master. La comparación FFmpeg con el master da SSIM global **0,995334**; se revisaron además 32 fotogramas extraídos del MP4 optimizado, incluidos texto, cursor, transiciones y cierre.

El poster coincide sin pérdida con el PNG original de 30.819 bytes; reduce su peso un 42,33 %. Mantiene la apertura blanca con el logo oficial.

## Archivos de trabajo y Git

Antes de organizar, `motion/` ocupaba 621.939.314 bytes en 1.316 archivos. Los 1.245 fotogramas y revisiones sumaban 601.383.322 bytes y ya estaban ignorados por Git.

Se trasladaron a `.production/naves-del-sur/` los temporales, las fuentes históricas V1/V2, sus videos y los reportes de producción. Los archivos originales de V3 se conservaron también como respaldo antes de adaptar las herramientas. Cada uno de los 1.292 movimientos/copias del proceso se verificó mediante SHA-256; su manifiesto e inventario por archivo están en la carpeta local de reportes. No hubo eliminaciones definitivas de originales. Archivar no libera ese espacio local: conserva el respaldo y lo excluye de Git y del despliegue.

El master aprobado conserva SHA-256:

```text
5401c0c85e239a1521b0db0797370647bb15a1c489aca44c2e8b6737f9537db1
```

Se regeneraron los 378 fotogramas con las fuentes conservadas y se volvió a exportar CRF 18: el MP4 resultante coincide **byte por byte** con ese master. Esto comprueba que las versiones archivadas no son necesarias para reconstruir la V3.

Se versionan las fuentes activas, los recursos originales compartidos y una única entrega web MP4 + poster. `/.production/` se excluye desde el `.gitignore` raíz; las reglas del motion excluyen además `frames/`, `review/`, `output/`, logs y baselines/reportes de trabajo.

## Separación de la web

- `web/public/` contiene los 18 recursos existentes y solamente dos archivos nuevos: `projects/naves-del-sur/motion/motion-showcase-v3.mp4` y `poster.webp`.
- `web/dist/` contiene 29 archivos. No contiene Playwright, Sharp, servidor de render, timelines del showcase, fotogramas, masters ni versiones V1/V2.
- Se comparó contra un build limpio de `HEAD` anterior a esta limpieza, con los mismos paquetes: todos sus archivos publicados coinciden byte por byte. Las únicas adiciones son el MP4 y el poster. El `dist` anterior a esta tarea era más antiguo que ese build; por eso no se usa su CSS como baseline del código actual.
- La home y Proyectos no referencian el MP4 ni el poster: el diseño y la descarga inicial de la página se conservan. Los dos archivos quedan preparados para una integración posterior.
- El script de verificación del portfolio ahora omite subdirectorios al revisar sus WebP; permite la carpeta separada de entrega sin confundirla con una imagen.
- No se añadió configuración de Netlify ni se inició un deploy manual. La salida de Astro sigue siendo `web/dist/`. Un push puede activar la automatización que ya tenga configurada el repositorio.

## Verificaciones ejecutadas

- `npm run build`: correcto; 0 errores, 0 advertencias y 3 hints preexistentes en el script de QA de servicios, también presentes en el build limpio de HEAD. No se alteró ese script ajeno al motion.
- `scripts/verify.mjs`: aprobado en 320, 390, 768, 1024 y 1440 px; sin overflow, errores de navegador ni infracciones de accesibilidad detectadas. Menú por teclado, motion y funcionamiento sin JavaScript aprobados.
- `scripts/verify-portfolio.mjs`: aprobado en los mismos cinco anchos, con imágenes, enlaces, apertura de capturas, sitio del cliente, navegación por teclado y fallback sin JavaScript.
- `scripts/verify-contact.mjs`: aprobado; validación, prevención de envíos duplicados, fallos de red/HTTP, éxito simulado, confirmación, no-JS y WhatsApp configurado. Todas las pruebas de envío usan respuestas locales simuladas; no envían consultas a Netlify.
- QA del video: 19 hashes de recursos originales correctos; 74 cuadros de arrastre y 67 anchos distintos; breakpoint original de 992 px, texto y reorganización auténticos. Error máximo cursor/borde inferior a 0,0001 px en el render. También se contrastaron borde y cursor en siete fotogramas comprimidos.
- Reproducción MP4: dos loops en Chrome, sin errores ni detenciones. Decodificación completa de 378 cuadros y comparación inicio/cierre aprobadas.

Los resultados completos y las capturas están en `.production/naves-del-sur/reports/`, `.production/naves-del-sur/intermediates/v3/review/` y `web/test-results/`, todos locales e ignorados.

## Dependencias

No se agregaron ni eliminaron paquetes de la web. GSAP, Playwright y Sharp tienen usos vigentes en el sitio, las verificaciones y la producción del video. FFmpeg/FFprobe son herramientas locales, fuera del bundle.

`npm ls` informa `@img/sharp-wasm32` como extraneous en esta instalación; está en el lockfile como dependencia opcional de plataforma, está ignorado y no se publica. Se conservó para evitar cambios ajenos al motion. En este Mac Sharp usa su binario nativo.
