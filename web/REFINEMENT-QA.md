# Refinamiento de Cómo trabajamos y estabilidad de WhatsApp

21 de octubre de 2026. Implementación local, sin push, deploy, DNS ni dependencias nuevas. La propuesta de Cómo trabajamos se implementó después de la aprobación explícita del usuario.

La animación de Cómo trabajamos descrita aquí fue reemplazada posteriormente por una única secuencia con pin y scrub. Ver [PROCESS-SCROLL-QA.md](PROCESS-SCROLL-QA.md) para la implementación y pruebas actuales. La corrección de WhatsApp de este documento se conserva.

## WhatsApp: causa identificada y corrección

La versión anterior combinaba dos reglas:

1. Un `IntersectionObserver` ocultaba el flotante cuando Contacto, el formulario o el footer se acercaban al viewport, incluso si no había ninguna interferencia.
2. Un listener de scroll comprobaba colisiones con cajas completas de párrafos y títulos, además de controles. Un encabezado que cruzaba esa posición provocaba su desaparición.

La revisión confirmó que el enlace es hijo directo de `body`, con `position: fixed`. No está dentro de un contenedor transformado ni tiene un ScrollTrigger propio. Las media queries solo ajustaban los márgenes, y la única transformación visual de su CSS es el hover. El problema era la lógica de visibilidad.

Se eliminaron el observer de secciones y las colisiones con textos. Ahora:

- El flotante conserva 48 × 48 px y la misma posición durante el scroll, sin animaciones de entrada o salida.
- En escritorio se ajustó el margen derecho de 16 a 8 px para ubicarlo en el margen disponible, sin cambiar sus colores, icono ni hover. En móvil se mantiene el margen de 12 px y el espacio seguro inferior.
- Intro y menú lo suspenden mediante CSS; el cierre de esas superposiciones lo devuelve automáticamente.
- Solo una colisión efectiva con un campo, botón o enlace, o la interferencia del teclado virtual, puede suspenderlo en anchos reducidos. No se oculta por estar en una sección determinada.
- Un enlace enfocado por teclado no desaparece por una colisión de scroll.
- Los listeners se limpian al cambiar de página y se inicializan una sola vez al volver. Sin JavaScript el acceso sigue visible.
- Se conserva `PUBLIC_WHATSAPP_NUMBER`, el número autorizado y el mensaje precargado. No se abrió WhatsApp ni se enviaron mensajes.

## Cómo trabajamos: solución aprobada

- Fondo Niebla `#E3E0D8` a todo el ancho; un contenedor interior conserva el ancho editorial anterior.
- Textos, títulos, fuentes, tamaños, espacios, separadores, ancla y disposición responsive conservados.
- Escalonado de escritorio intacto: diferencias verticales de 46, 92 y 138 px respecto del primer paso.
- Los números usan el tono de apoyo existente `#5A564A`. El tono anterior no alcanzaba el contraste requerido sobre Niebla; se corrigió sin introducir un color nuevo.
- Cada artículo usa `data-process-step` y deja de usar `data-reveal`. El título mantiene su animación genérica original.
- Un ScrollTrigger por paso: umbral `top 88%`; en la segunda columna de tablet, `top 72%`. Los cuatro inicios ocurren en posiciones distintas del scroll, incluso cuando dos pasos comparten fila.
- Entrada con `y:44px` en escritorio/tablet y `y:28px` en móvil, opacidad de entrada 0.12 → 1, duración de 0.85 s y `power3.out`.
- Después de registrar los triggers, JavaScript prepara los pasos pendientes con opacidad 0 para evitar un destello previo. El HTML y CSS base no los ocultan.
- Sin stagger temporal, pin, sticky, rebotes, blur, desplazamiento horizontal ni intervención del scroll.
- Cada paso se registra como revelado al entrar y limpia `transform` y `opacity` al completar. El estado persiste al redimensionar o reinicializar, evitando repeticiones.
- `gsap.matchMedia` restaura estilos con movimiento reducido o al limpiar la página. Un error de ejecución o rechazo no controlado posterior a la preparación muestra todos los pasos y cancela sus animaciones pendientes.
- Si JavaScript está deshabilitado o el bundle no carga, los cuatro pasos quedan visibles desde el HTML base.

## Archivos de implementación

- `src/components/WhatsAppLink.astro`: corrección de visibilidad, margen lateral y ciclo de vida del flotante.
- `src/sections/Process.astro`: contenedor interior y marcadores específicos de pasos.
- `src/styles/global.css`: fondo de metodología y contraste de sus números; no se cambian reglas de las otras secciones.
- `src/scripts/process.ts`: reveals individuales, movimiento reducido y restauración del contenido.
- `src/scripts/main.ts`: importa e inicializa ese módulo dentro de la arquitectura existente.
- `scripts/verify-whatsapp.mjs` y `scripts/verify-process.mjs`: pruebas de recorrido y comportamiento.
- `scripts/verify-contact.mjs`: retira la expectativa anterior de ocultar WhatsApp en Contacto, formulario y footer.
- `LAUNCH.md`, `LAUNCH-QA.md` y este informe: documentación actualizada.

No se cambiaron los componentes de intro, hero, Servicios, Proyectos, Identidad, cierre naranja ni formulario, ni sus textos. Los ajustes previos del proyecto permanecen.

## Verificación

Servidor de producción local usado para QA en `http://127.0.0.1:4322`, porque el puerto 4321 ya estaba ocupado. No se detuvo ni reemplazó el servidor del usuario.

```sh
npm run build
QA_URL=http://127.0.0.1:4322 npm run test:browser
QA_URL=http://127.0.0.1:4322 npm run test:contact
QA_URL=http://127.0.0.1:4322 node scripts/verify-whatsapp.mjs
QA_URL=http://127.0.0.1:4322 node scripts/verify-process.mjs
```

- Build de Astro sin errores, advertencias ni hints.
- Responsive en 320, 390, 768, 1024 y 1440 px, sin desbordamientos horizontales.
- Axe WCAG 2/2.1 A y AA: sin incidencias detectadas después del ajuste de contraste.
- Menú, navegación por teclado, anclas, movimiento reducido, geometría responsive de Identidad y contenido sin JavaScript correctos.
- Revelación 01 → 02 → 03 → 04 según cuatro posiciones de scroll distintas. Al detener el scroll, ningún paso posterior comienza por un temporizador. Cada uno termina con opacidad 1 y traslación 0.
- Regreso hacia arriba, resize, cambio de movimiento reducido durante un reveal y limpieza/reinicialización Astro: sin repetir los pasos ni dejarlos invisibles.
- Se bloqueó el bundle de JavaScript en una prueba y se verificó que los cuatro pasos siguieran visibles. También se probó la restauración ante un evento de error de ejecución posterior a la preparación.
- WhatsApp se muestreó cada 120 px durante toda la página. A 1440 px permaneció visible en las 49 muestras, con geometría fija. En los anchos menores solo se ocultó en muestras con una interferencia real con controles; nunca por títulos, párrafos o límites de sección.
- Se verificaron intro, menú, foco por teclado y tres ciclos de limpieza/reinicialización del flotante, sin duplicarlo.
- Las pruebas de formulario siguen usando respuestas simuladas locales y no envían datos a Netlify.
- Sin errores de JavaScript ni de consola en las pruebas de recorrido. La prueba de fallo de ejecución usa un evento simulado independiente.

Capturas revisadas visualmente: [escritorio](test-results/process-1440.png) y [móvil](test-results/process-390.png). Detalle en `test-results/process-verification.json`, `whatsapp-stability.json`, `verification.json` y `contact-verification-whatsapp.json`.

Los resultados corresponden a Chrome local. No se afirma una validación en dispositivos físicos o una nueva medición Lighthouse.
