# Isotipo 3D de Identidad

Integración local del modelo de `Suplio Logo 3D.html` aportado por el usuario. No se usa iframe, CDN, Google Fonts, controles externos ni imágenes nuevas.

## Archivos de esta integración

- `src/sections/Identity.astro`: misma composición y copy, variante oficial crudo/naranja, fondo tinta y contenedor absoluto del canvas; ancla `#identity`.
- `src/scripts/identity.ts`: ensamblado GSAP original, único ScrollTrigger de Identidad, carga diferida y ciclo de vida.
- `src/scripts/identity-scene.ts`: geometría original, volumen, materiales, luces, rotación, cursor y recursos WebGL.
- `src/scripts/main.ts`: solamente importa/inicializa/limpia Identidad y retira el bloque antiguo de ese ensamblado para evitar duplicarlo. Las otras animaciones se conservan.
- `package.json`, `package-lock.json`: Three.js 0.128.0, versión exacta del HTML; tipos de la misma versión como dependencia de desarrollo.
- `public/licenses/three.txt`: licencia MIT de la dependencia.
- `scripts/verify-identity.mjs`: pruebas de la integración.
- `IDENTITY-3D.md`: este documento.

Los cambios de Hero y su franja que ya existían al comenzar esta tarea se mantienen tal como estaban. No se modifica el portal, estilos globales, navegación, Servicios, Proyectos, Proceso, Contacto, formulario, footer o configuraciones de despliegue.

## Reutilización fiel

Se copian las dos formas de Three.Shape con sus arcos de radio 17.5 y transformación de coordenadas del SVG 96×96. Se conserva la extrusión de profundidad 14, curveSegments 64, bevelThickness 2.2, bevelSize 1.8, bevelOffset -1.4, bevelSegments 8 y la posición Z de las piezas +5/-5. Comparación automatizada contra el HTML original: arrays `position`, `normal` y `uv` idénticos para ambas piezas. Total: 18.746 triángulos.

Se conserva la cámara de perspectiva de 30°, la orientación HOME (-0.18, 0.55), luces hemisférica, principal y de contorno, y el entorno generado con canvas de 1024×512 del original. El encuadre se ajusta al tamaño real del SVG existente en cada breakpoint. Se selecciona el acabado mate ya incluido en el HTML; no se usa su variante metálica ni sus controles. La rotación conserva su eje y retorno al pitch inicial, a 0.3 rad/s para un ritmo más lento. El drag que bloqueaba touch-scroll se sustituye por hover sutil con amortiguación, sin capturar punteros ni gestos táctiles.

Colores de material frontal: `#F5F4F0` / `#FF5A1F`. Laterales: `#B8B2A7` / `#C63E12`. Fondo local: `#16140F`. La iluminación física afecta el color percibido del material, como en el HTML original.

## Ensamblado → volumen → interacción

Se mantiene la trayectoria original de las piezas (-37,-12 / +37,+12), duración, `start: top 85%`, `end: center 43%` y `scrub: .7`. Es un único trigger, sin pins ni espacios extra. El mismo ensamblado está disponible también en móvil.

Solo al completar el ensamblado empieza el crecimiento del volumen (1.15 s). La geometría original posee un morph de topología idéntica que empieza plana, sin biseles, en el contorno exacto del SVG. La proyección coincide con su posición y escala. El shader empieza con el color sRGB exacto y añade gradualmente la iluminación; no hay dos logos cruzándose por opacidad.

La rotación empieza después del volumen completo. Al subir se aplana en 0.55 s, vuelve al frente por interpolación de cuaterniones y sigue los offsets actuales de las piezas del SVG. Al terminar vuelve al SVG. La sección recorta su propio contenido, por lo que el canvas no se superpone a Contacto.

## Carga y recursos

- La librería se importa al acercarse a 300 px de Identidad. No se solicita en el hero.
- El render solo continúa con volumen y con el arte visible; se pausa fuera de pantalla y con la pestaña oculta.
- DPR máximo 2 en desktop y 1.5 bajo 900 px.
- Sin texturas descargadas; el entorno se genera localmente una vez.
- Listeners, observers, tween, RAF, materiales, geometrías, textura de entorno, renderer y contexto se liberan al salir del ciclo de vida.
- Movimiento reducido: SVG oficial estático, sin importar Three. Sin JS o sin WebGL: SVG estático. Pérdida del contexto: se recupera el SVG.

Medición del build Netlify: módulo diferido 523.354 bytes, 128.790 bytes gzip; controlador inicial aumenta aproximadamente 1.036 bytes gzip frente al bundle anterior. No se duplica GSAP. Vite avisa que el chunk sin comprimir supera 500 kB: se mantiene diferido y no se oculta ese aviso. No se modifica la configuración de bundling ni hosting para silenciarlo.

## Revisión local y validación

Demo con el portal existente: http://127.0.0.1:4341/#identity . Desplazarse un poco más para completar el ensamblado y entrar al volumen.

```sh
node lab/typography-portal/hero/build.mjs
node lab/typography-portal/hero/server.mjs
node web/scripts/verify-identity.mjs
node lab/typography-portal/hero/verify-start.mjs
```

Verificado en Chrome: 1440, 1280, 768 y 390 px; móvil de DPR 3 limitado a 1.5. Ensamblado, volumen, reversa, movimiento real de pitch al cursor, un único canvas/trigger, ausencia de scroll horizontal, pausa fuera de pantalla, movimiento reducido, liberación al cambiar la preferencia, pérdida de contexto y ausencia de JavaScript. También se comprobó el fallo inicial de WebGL y el recorrido visual hero → portal → Servicios → Cómo trabajamos → Proyectos → Identidad → Contacto → formulario → footer.

Builds de Astro para Netlify y GitHub Pages completados. El segundo se guarda en `.production/identity-3d/github-pages` y conserva el prefijo `/suplio/`. Capturas y resultados: `.production/identity-3d/` (ignorado por Git). No se generan videos.

Los tests WebGL usan SwiftShader para ser reproducibles; no constituyen un benchmark de GPU física. Safari/iOS y Android físicos quedan fuera de esta validación. Se mantiene el fallback para esos casos y no se afirma una medición de FPS en hardware real.

No se hizo commit, push ni deploy.
