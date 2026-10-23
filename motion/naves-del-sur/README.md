# Naves del Sur — Motion Showcase V3

Composición independiente con interfaz, fotografías, tipografías, textos y logo oficiales. **12,6 segundos · 1280 × 720 · 30 fps · sin audio.** El responsive usa un iframe real, de 1440 a 390 px; no hay screenshots estirados.

## Entrega web

- [MP4 optimizado](../../web/public/projects/naves-del-sur/motion/motion-showcase-v3.mp4): **2.355.202 bytes (2,36 MB)**, H.264 CRF 21, slow, yuv420p, faststart. Reducción de **31,05 %** respecto del master de 3.415.802 bytes.
- [Poster WebP](../../web/public/projects/naves-del-sur/motion/poster.webp): **17.772 bytes (17,8 KB)**, compresión sin pérdida del primer fotograma: logo oficial sobre blanco.
- [Auditoría y verificaciones](AUDIT.md).

Los dos recursos están preparados para su publicación como archivos estáticos. La sección Proyectos conserva su diseño e imágenes actuales; todavía no referencia ni descarga el video. No se incorporaron scripts de producción al bundle.

## Revisión local

Desde la raíz del repositorio:

```sh
node motion/naves-del-sur/server.mjs
```

Abrir http://127.0.0.1:4330/player.html o http://127.0.0.1:4330/v3/player.html. Ambos llevan al reproductor de la entrega optimizada, con controles, loop y descarga. http://127.0.0.1:4330/v3/index.html muestra la composición GSAP.

El servidor escucha únicamente en localhost. `/delivery/` expone solo el MP4 y el poster finales; el archivo local `.production/` no está expuesto.

## Regenerar desde un clon limpio

Requiere Node compatible con `web/package.json`, Google Chrome y FFmpeg/FFprobe en PATH. Se reutilizan los paquetes de la web; no hay dependencias pagas ni un segundo `node_modules` de producción.

```sh
npm --prefix web ci
node motion/naves-del-sur/v3/render.mjs
node motion/naves-del-sur/v3/export.mjs
node motion/naves-del-sur/v3/optimize.mjs \
  --source '.production/naves-del-sur/renders/Naves del Sur - Motion Showcase V3 - render.mp4' \
  --poster '.production/naves-del-sur/renders/poster.png'
node motion/naves-del-sur/v3/verify.mjs
npm --prefix web run build
```

`render.mjs --preview` captura solo fotogramas clave. El render completo produce 378 PNG y registra el viewport, el cursor y el loop. `export.mjs` genera un nuevo MP4 CRF 18 en `renders/`, sin sobrescribir el master aprobado. `optimize.mjs` conserva duración y formato, comprueba el hash de su fuente y produce únicamente la entrega pública MP4 + WebP.

En el equipo de producción, `optimize.mjs` sin argumentos utiliza el master original de `.production/naves-del-sur/masters/`. Se puede variar `--crf` entre 18 y 24; el archivo revisado utiliza 21.

## Organización

```text
motion/naves-del-sur/               Fuentes versionadas, fuera de la web publicada
  assets/                          Recursos originales locales y manifest de hashes
  hero.html, catalog.html           Fragmentos reales del cliente
  prepare.mjs, server.mjs
  v3/                              Composición, render, exportación, optimización y QA
.production/naves-del-sur/          LOCAL, ignorado por Git
  masters/                         MP4 y poster originales aprobados
  archive/v1/, archive/v2/, archive/v3/
  intermediates/                   PNG, capturas y revisiones
  renders/                         Regeneraciones de alta calidad
  reports/                         Inventarios, hashes y resultados completos
web/public/projects/naves-del-sur/motion/
  motion-showcase-v3.mp4
  poster.webp
```

Los archivos de V1/V2 y los originales de V3 se archivaron de forma reversible. Se verificó el SHA-256 de cada archivo al moverlo. No se modificó el historial Git ni los archivos de Descargas.

`prepare.mjs` es un paso opcional para extraer otra vez los fragmentos del código original: requiere definir `NAVES_SOURCE` y descarga las fuentes gratuitas referenciadas por el cliente. **No hace falta ejecutarlo para regenerar esta entrega:** HTML, CSS, imágenes y fuentes necesarios ya están incluidos y el render funciona sin recursos externos.

## Dirección y límites

Se conserva la dirección de V2: apertura blanca, logo hacia la navegación, ensamblado del hero, clic al catálogo, tarjeta industrial con profundidad, arrastre responsive y cierre al logo. V3 acorta los recorridos del cursor, evidencia la presión del borde, mantiene catálogo y desktop en un mismo encuadre durante el relevo y despeja la cabecera con blanco antes de devolver la marca al centro.

Los cambios de menú y de saltos de línea son los del CSS original; algunos son discretos al cruzar sus breakpoints. La imagen del hero conserva su resolución de origen, 960 × 576. No se inventaron interfaces ni se modificó la identidad del cliente.
