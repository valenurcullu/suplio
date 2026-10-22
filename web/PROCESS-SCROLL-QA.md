# Cómo trabajamos — secuencia controlada por scroll

21 de octubre de 2026. Reemplaza los reveals individuales de la revisión anterior. Cambios locales, sin push ni deploy.

## Implementación actual

- Una única timeline GSAP y un único ScrollTrigger para los cuatro pasos, con `scrub: true` y `ease: none`. No hay stagger, reproducción autónoma, cuatro triggers ni marcas de «revelado una vez».
- Cada paso ocupa una unidad de timeline: 01 → 02 → 03 → 04. Después se mantiene la composición completa durante 0,2 unidades antes de liberar el pin. La duración de la timeline distribuye el scroll, no representa segundos de reproducción independiente.
- En el modo fijado se inmoviliza la sección completa. El titular y la introducción permanecen quietos. Se retiró el `data-reveal` del título para evitar que su antigua animación se ejecutara durante el pin.
- El pin se encuadra calculando la altura real de la navbar, un margen de 16 px y el padding original de la sección. No se modifican tipografías, espacios ni dimensiones para hacerla caber.
- La grilla recorta las entradas solamente mientras la experiencia está configurada con pin. El desplazamiento inicial se calcula desde el borde inferior real de esa grilla hasta la posición original de cada artículo, más 32 px. Así, los cuatro bloques parten fuera del área visible.
- A 1440 × 900, los desplazamientos iniciales medidos fueron aproximadamente 452, 406, 360 y 314 px. Todos terminan en `y:0`, opacidad 1 y las diferencias originales de altura de 46, 92 y 138 px.
- El tramo de scroll fijado se calcula según la altura disponible, limitado a 1200–2400 px. A 1440 × 900 se midieron 1855 px. El primer movimiento comienza al iniciar la secuencia, sin una espera temporal.
- Un fondo Niebla en el spacer de esta sección mantiene la continuidad del fondo; `pinSpacing` conserva el flujo hacia Proyectos.

Referencia técnica utilizada: [documentación oficial de ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/).

## Responsive y accesibilidad

Se activa el pin a partir de 600 px de ancho **solo si toda la composición cabe** entre la navbar y el borde inferior, con sus espacios originales. En móvil y ventanas demasiado bajas se usa una única timeline con scrub, sin pin, con recorridos verticales menores calculados según el viewport y la altura de cada artículo.

Esto también contempla ventanas de escritorio muy bajas: por ejemplo, a 1440 × 600 no caben el titular, la introducción y los cuatro pasos completos conservando el diseño, por lo que se usa la variante sin pin. A 1440 × 900 y 1024 × 900 se verifica la experiencia completa. Tablet 768 × 1200 usa pin; 768 × 900 usa la variante en flujo.

- Con movimiento reducido no se registra la secuencia: no hay pin y todos los pasos quedan visibles en su posición final.
- El HTML/CSS base no oculta contenido. Sin JavaScript o con el bundle bloqueado, los cuatro pasos permanecen legibles.
- Ante un error de ejecución se revierte la secuencia y se restaura el contenido.
- Los cambios de tamaño recalculan distancias y pueden cambiar de estrategia. Se preserva la posición al cambiar de modo mientras el usuario está en la secuencia o después de ella.
- La inicialización corrige el destino de un hash situado debajo de la sección, si el pin se creó después de la resolución inicial del ancla. La corrección no se aplica si el usuario ya interactuó.
- El contexto y sus listeners se limpian al cambiar de página. No quedan spacers ni timelines duplicadas.

## Alcance comprobado

Al comparar los archivos de `src/` con la copia tomada antes de esta modificación, solo cambiaron:

1. `src/scripts/process.ts`: reemplazo completo de la lógica de animación.
2. `src/sections/Process.astro`: marcador del contenedor y retiro del reveal del título.
3. `src/styles/global.css`: fondo del spacer y recorte de la grilla durante el pin.

El resto de los archivos de `src/` conserva exactamente sus bytes: intro, hero, servicios y microdemostraciones, Proyectos, Identidad, Contacto, formulario, WhatsApp, footer, copy y el script principal.

Se actualizó `scripts/verify-process.mjs` para probar el comportamiento nuevo, y la expectativa del título estático en `scripts/verify-contact.mjs`. No se instalaron dependencias.

## Pruebas realizadas

- `npm run build`: sin errores, advertencias ni hints.
- `QA_URL=http://127.0.0.1:4322 node scripts/verify-process.mjs`: aprobado en 1440×900, 1440×1200, 1024×900, 768×1200, 768×900, 1440×600, 390×844 y 320×844.
- En cada tamaño se comprobó el punto medio de los cuatro pasos: anteriores completos, actual a media entrada y posteriores todavía ocultos.
- Se detuvo el scroll durante 220 ms a mitad de cada paso: sus valores no continuaron cambiando. Al retroceder el scroll, el bloque bajó y perdió opacidad; al regresar al mismo punto recuperó los mismos valores.
- Encabezado e introducción estables durante el pin; composición completa dentro del espacio disponible y sin quedar cubierta por la navbar.
- Tramo final con los cuatro pasos completos; liberación del pin y continuidad con Proyectos, sin hueco entre bloques.
- Refresh en el tramo final sin cambios de posición; cambios entre desktop, tablet y móvil; cambio de movimiento reducido; tres ciclos de limpieza/reinicialización sin duplicar el pin.
- Acceso directo a `#proyectos`, `#contacto` y `#consulta` sin quedar atrapado en el pin.
- Sin JavaScript, bundle bloqueado y fallo de ejecución posterior: contenido visible y sin pin residual.
- Axe WCAG 2/2.1 A y AA: sin incidencias detectadas en los ocho tamaños. Sin desbordamientos ni errores de consola.
- `npm run test:browser`: aprobado en cinco anchos, incluidos menú, teclado, anclas, movimiento reducido y contenido sin JavaScript.
- `npm run test:contact`: aprobado. El reveal y parallax de Proyectos y el ensamble de Identidad siguen funcionando; los estados de formulario se prueban con respuestas simuladas locales, sin enviar datos a Netlify.

Detalle: `test-results/process-verification.json`. Capturas: `test-results/process-pin-step-1.png` hasta `process-pin-step-4.png` y [composición final fijada](test-results/process-pin-final.png).

Pruebas en Chrome local, sin una nueva medición Lighthouse ni validación en un dispositivo físico. No se modificó la configuración de Netlify ni DNS.

## Revisión visual en localhost

Se dejó activo el preview de producción en **http://127.0.0.1:4322/#como-trabajamos**, sin reemplazar el servidor existente en 4321. Para ver el pin completo, usar una ventana con espacio vertical suficiente; en 1440 px de ancho requiere aproximadamente 842 px de altura útil.

El navegador integrado de la sesión no estaba disponible para abrir la pestaña automáticamente. El servidor y la URL se verificaron con las pruebas de Chrome locales. El preview sirve `dist/`; después de futuros cambios de código hace falta volver a ejecutar `npm run build`, o usar el servidor de desarrollo.
