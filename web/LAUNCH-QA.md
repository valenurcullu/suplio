# Verificación de lanzamiento — 21 de octubre de 2026

Revisión local de la compilación estática, en Google Chrome mediante Playwright. No es una validación de producción ni un envío real a Netlify. No se hizo push, deploy ni modificación de DNS.

Este documento registra la preparación inicial. El refinamiento posterior aprobado de Cómo trabajamos y la corrección de estabilidad de WhatsApp están en [REFINEMENT-QA.md](REFINEMENT-QA.md); ese informe reemplaza las observaciones iniciales sobre ocultamiento de WhatsApp y fondo de metodología.

## Build y conservación

- `npm run build`: correcto, 33 archivos revisados por Astro; 0 errores, advertencias o hints. Genera home y `/consulta-recibida/`.
- `git diff --check`: correcto.
- `Contact.astro` y `global.css` no tienen modificaciones frente a la versión inicial. Se conserva el cierre naranja completo, incluidos enlaces, flecha y numeración 04. Los scripts de intro y servicios y los recursos originales de marca tampoco se modificaron.
- Metadatos de home conservados; canonical `https://suplio.ar/`, Open Graph, Twitter, favicon, `robots.txt` y sitemap disponibles. Confirmación con canonical propio, `noindex, follow`, fuera del sitemap.

## Responsive, navegación y accesibilidad

`npm run test:browser`: aprobado en **320, 390, 768, 1024 y 1440 px**.

- Sin desbordes horizontales.
- Axe WCAG 2 A/AA y 2.1 A/AA: 0 incidencias detectadas, también con el menú móvil abierto.
- Menú por teclado, Escape, devolución de foco y enfoque del destino de las anclas correctos.
- Recursos de SEO y marca accesibles; anclas resueltas.
- Contenido, navegación alternativa y contacto disponibles sin JavaScript.
- Movimiento reducido y restauración de geometría de identidad al pasar de escritorio a móvil correctos.
- Sin excepciones JavaScript ni recursos fallidos en esa prueba.

## Animaciones

- `node scripts/verify-intro.mjs`: aprobado. Entrada desde fuera de pantalla, ensamble centrado y giro de 360° en cinco tamaños. Una intro por sesión, preview forzada y acceso directo por anclas correctos. Saltar, Escape, Tab, foco, scroll, resize, preferencia de movimiento reducido y watchdog funcionan. CLS observado durante la intro: **0**; axe sin incidencias.
- `node scripts/verify-hero.mjs`: aprobado. Revisión en siete anchos de 320 a 1440 px; tipografía, interacciones, geometría y movimiento adaptativo correctos. CLS observado en las tres muestras de movimiento: **0**. No había capturas de referencia previas en este equipo: no se afirma una comparación de píxeles contra un baseline.
- `node scripts/verify-services.mjs`: aprobado. Estática y axe en siete anchos; cuatro demos con descubrimiento por scroll y una activa a la vez; replay con hover, teclado y tap; secuencia de paquetes de automatización y agente ordenada. Cancelación por movimiento reducido, salida del viewport y teardown/restauración Astro correctos. CLS de la muestra: **0**.
- La prueba de servicios originalmente leía el estado inmediatamente después de cambiar la preferencia. Se ajustó la comprobación para esperar la restauración completa. No se cambió la animación del sitio.
- `npm run test:contact` también comprueba que Cómo trabajamos y Proyectos animen al entrar después de reordenarlos, que el parallax del proyecto avance con el scroll y que el símbolo de Identidad termine ensamblado.

## Formulario

`npm run test:contact`: prueba con respuestas HTTP simuladas, en un origen ficticio interceptado y servido desde localhost. **Ningún dato de prueba se envía a Netlify ni a otro servicio.**

- Formulario presente en `dist/index.html`, nombre único, atributos Netlify, método POST, action y campos esperados.
- Validación y errores accesibles en 320, 390, 768, 1024 y 1440 px, sin desbordes ni incidencias axe.
- Campos obligatorios vacíos y nombre compuesto solo por espacios rechazados; email inválido identificado.
- Estado de envío visible y botón deshabilitado. Dos solicitudes de submit adicionales durante el POST no generan otro envío.
- Respuesta HTTP 500: error claro, datos conservados, posibilidad de reintento y sin navegación a éxito.
- Fallo de red: mensaje de resultado no confirmado, datos conservados y posibilidad de reintento.
- Respuesta HTTP satisfactoria simulada: navegación a la confirmación. Página responsive en 320, 390 y 1440 px, sin incidencias axe.
- JavaScript deshabilitado: validación nativa y POST a la ruta de confirmación, con los campos esperados. La respuesta de ese POST es simulada localmente.
- Localhost con JavaScript: muestra que no puede procesar envíos; no presenta éxito falso.
- La confirmación espera el nuevo layout al redimensionar antes de medir overflow; la comprobación final pasa.

## WhatsApp

- Compilación normal, sin número: no hay enlaces `wa.me` ni botón roto.
- Compilación separada y temporal en `/private/tmp/suplio-whatsapp-qa`, con un valor ficticio exclusivo de QA. El número ficticio no está en el código, en `.env.example` ni en la compilación final `web/dist`.
- `QA_URL=http://127.0.0.1:4322 QA_WHATSAPP_ENABLED=1 npm run test:contact`: aprobado. Se comprueban formato `wa.me`, mensaje precargado, acceso por teclado, ausencia durante la intro y ocultamiento ante contacto/formulario/footer, además del responsive.
- El nombre accesible del enlace visible incluye su texto, verificado con axe; se corrigió esa etiqueta durante QA.
- A 1440 × 1000 el flotante se oculta porque su posición coincide con un encabezado. A 1440 × 900 se muestra en el espacio libre. Es el comportamiento previsto para evitar cubrir contenido.
- No se abrió WhatsApp ni se envió ningún mensaje. Falta validar la cuenta real cuando se configure el número.

## Revisión visual y recursos

Capturas limpias del formulario revisadas visualmente:

- [Escritorio, 1440 px](test-results/contact-layout-1440.png).
- [Móvil, 390 px](test-results/contact-layout-390.png).

Se verificaron jerarquía, espacios, composición asimétrica, inputs transparentes, botón oscuro con flecha naranja y ausencia de tarjetas o nuevos efectos. El bloque crema comienza inmediatamente después del naranja y conserva el footer debajo.

Tamaños de la compilación final, medidos en disco:

| Recurso | Sin comprimir | Gzip calculado localmente |
|---|---:|---:|
| JavaScript compartido (incluye GSAP y mejoras de contacto) | 123.243 bytes | 47.432 bytes |
| CSS compartido | 30.864 bytes | 7.499 bytes |
| CSS de home/formulario | 4.161 bytes | 1.073 bytes |

Las fuentes siguen siendo locales, aproximadamente 69 KB combinados. La imagen OG pesa aproximadamente 30 KB. No se agregaron imágenes pesadas, fuentes nuevas ni scripts de servicios externos. El gzip calculado no equivale a medir los bytes transferidos por Netlify.

No se ejecutó una nueva auditoría Lighthouse en esta entrega. Los puntajes anteriores de `QA.md` son históricos y no se trasladan a esta versión. Las muestras de CLS locales no garantizan idéntico comportamiento en todos los dispositivos.

## Límites y pendientes

- Detección, recepción en Verified submissions y notificación a `hola@suplio.ar` deben verificarse tras un deploy autorizado, con y sin JavaScript. Las respuestas HTTP simuladas prueban el manejo de estados del cliente, no la entrega real.
- La prueba de conexión usa una interrupción local; el límite de espera de 20 segundos está implementado, pero no se midió contra un servidor real lento.
- Sin número real de WhatsApp no se valida la cuenta de destino.
- Falta revisión en teléfono físico y en Safari/Firefox si se requiere esa cobertura.
- Naves del Sur sigue pendiente de material autorizado; el copy propuesto requiere tu aprobación.

Resultados detallados en `test-results/verification.json`, `intro-verification.json`, `hero-verification.json`, `services-verification.json`, `contact-verification.json` y `contact-verification-whatsapp.json`. Esa carpeta se mantiene ignorada por Git.

## Actualización del número oficial

Después de la revisión anterior, el titular confirmó **11 6543-9927**. Se configuró `5491165439927` como valor público predeterminado, manteniendo `PUBLIC_WHATSAPP_NUMBER` como sobrescritura. El build se ejecutó nuevamente y se verificó que ambos enlaces del HTML generado usen ese número y el mensaje autorizado. No se abrió la cuenta ni se envió un mensaje. Las referencias anteriores al estado sin número corresponden a la primera compilación revisada.
