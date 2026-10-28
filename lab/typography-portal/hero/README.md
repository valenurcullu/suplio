# Hero → Servicios: prueba de integración local

Prototipo del portal dentro de la **o** de **desafíos**. El único cambio en la home es la eliminación autorizada de la franja inferior del hero y su línea. El portal continúa en una demo independiente; las demás secciones y las fuentes no se modifican. Esta versión sustituye el recorrido conceptual del primer laboratorio; no revela Proyectos ni Naves del Sur.

## Ejecutar

Desde la raíz del repositorio, con las dependencias existentes de `web/` instaladas:

```sh
node lab/typography-portal/hero/build.mjs
node lab/typography-portal/hero/server.mjs
```

- Demo: http://127.0.0.1:4341/?intro=preview
- Comparación original: http://127.0.0.1:4341/?baseline=1&intro=preview
- Grabaciones, reproductores y descargas: http://127.0.0.1:4341/review/

La compilación y los archivos de revisión se guardan en `.production/typography-portal/`, fuera de `web/public`, `web/dist` y Git. No hay paquetes nuevos, assets remotos ni cambios en la configuración publicada. El servidor escucha solamente en localhost.

## Recorrido y técnica

1. Se ejecutan la intro original y la entrada original del titular. El efecto espera a que ambas terminen y a que carguen las fuentes.
2. Un `Range` localiza la **o** dentro del nodo de texto real de **desafíos**. No se fragmenta el h1, ni se cambia su texto o maquetación. La selección de texto puede recuperar el flujo HTML original.
3. Al terminar la intro, antes del primer scroll, se proyectan los elementos medidos del hero en un SVG decorativo. Las posiciones de cada carácter, tipografías, colores y matrices de los SVG se obtienen del DOM original. Se mantiene un único h1 y una sola instancia de cada sección.
4. La cámara SVG se aproxima a la apertura interior de esa letra. La letra protagonista y su máscara emplean trazados vectoriales reales de la letra y su contraformato de Space Grotesk a peso 500 (`glyph.json`), correspondientes al peso calculado del titular; evitan la teselación de texto pequeño durante grandes acercamientos. El fondo de Servicios se ve a través del hueco, en lugar de hacer zoom sobre una forma sólida. El primer acercamiento está anclado al centro de la abertura medida en el DOM: la escala aumenta sin un paneo vertical previo. Cuando el zoom ya es perceptible, se recupera progresivamente el encuadre de la cámara existente. El `start` es cero: no se restan alturas del header ni se deja un recorrido previo de scroll. Se elimina la pausa inicial del 6 % con un inicio de zoom de velocidad positiva que enlaza con el valor y la velocidad de la curva existente al 35 % del recorrido. La cámara fija ya está visible en reposo, por lo que el navegador nunca muestra un fotograma del hero desplazándose antes de activarla. El plano de fondo termina en el borde real del hero para conservar Servicios visible debajo en el fotograma inicial. No hay pin ni `pinSpacing` sobre el hero; la distancia de producción se prepara antes de la primera interacción.
5. El mismo GSAP/ScrollTrigger de la home controla la cámara y la entrada de la sección original de Servicios. Una distancia adicional de scroll se compensa en su posición visual durante el paso; al terminar se retira la proyección y continúa el flujo normal. No hay scroll programático, navegación automática ni cambio de URL en el efecto.
6. La secuencia se recorre en sentido inverso con scroll ascendente. Servicios conserva sus componentes, textos y demos; Cómo trabajamos conserva su animación original.

`astro.config.mjs` es un adaptador exclusivo del laboratorio: expone la instancia original de GSAP al módulo experimental durante esta compilación. `server.mjs` incorpora el módulo y el CSS únicamente al HTML servido localmente. La opción `baseline` omite esa incorporación para comparar la home sin portal, con la misma franja ya eliminada.

## Navegación y accesibilidad

- Los enlaces con ancla desactivan el tramo experimental **antes** de que el navegador resuelva su destino. No se cancelan los eventos ni se cambia su comportamiento nativo. El portal vuelve a estar disponible cuando se regresa al comienzo mediante scroll.
- Los controles originales del hero mantienen sus destinos en la proyección. El header y el menú quedan por encima de la cámara y siguen siendo utilizables.
- Al enfocar por teclado un control del hero o Servicios durante el paso se recupera el flujo original.
- Con `prefers-reduced-motion`, sin JavaScript o con viewport de menos de 480 px de alto se conserva el recorrido original sin portal. Si cambia la preferencia de movimiento durante el efecto, se restaura el flujo.
- El SVG de cámara es decorativo, oculto para tecnologías asistivas. No duplica encabezados semánticos ni secciones. La selección de texto en reposo y el foco por teclado recuperan el HTML original; durante el movimiento se visualiza su proyección.

## Verificación y grabación

```sh
node lab/typography-portal/hero/verify-start.mjs
node lab/typography-portal/hero/verify.mjs
node lab/typography-portal/hero/record.mjs
```

Requieren Chrome local, Playwright ya presente en `web/` y FFmpeg para las grabaciones. La verificación compara geometría del hero con la compilación original, prueba el portal descendente/ascendente a cinco tamaños, las demos de Servicios, Cómo trabajamos, anclas del navbar y accesos directos, ausencia de overflow, reducción de movimiento, ausencia de JS y cambios de viewport. Los únicos comandos de scroll programático están en el **driver de pruebas**, para inspeccionar posiciones; no forman parte del efecto. Las grabaciones conservan la intro, emiten eventos reales de rueda en desktop y gestos táctiles de Chrome en móvil emulado. Muestran el primer scroll desde cero, el paso a Servicios y el regreso. No hay seek programático de scroll en las grabaciones. `MOTION_VIEWPORT=mobile` permite regenerar solo una versión.

La prueba específica `verify-start.mjs` comienza literalmente en scroll cero, compara el primer fotograma con el HTML sin portal, comprueba zoom desde el primer píxel, emite el primer gesto real de rueda o táctil y mide el centro visible durante los primeros 100 px. Verifica ambos sentidos en cinco tamaños. Ya no toma `state.start` como punto inicial de la prueba, lo que antes omitía el tramo de scroll natural anterior a la activación. Resultados: `hero-review/zero-start/verification.json`. Las grabaciones guardan sus posiciones de scroll y geometría visible por fotograma en `zero-start/desktop-input-frames.json` y `mobile-input-frames.json`.

Resultados y capturas: `.production/typography-portal/hero-review/verification.json`.
Grabaciones finales: `desktop.mp4` (1280×800) y `mobile.mp4` (390×844), 30 fps, sin audio. Los originales WebM permanecen junto a ellas, ignorados por Git.

## Alcance de esta revisión

Es una prueba de integración sobre la home completa; el portal todavía no se incorpora al código publicado. La simplificación autorizada del hero está en `web/src/sections/Hero.astro` y solo se eliminaron las reglas CSS de esa franja. La comprobación visual y automatizada se hace en Chrome de escritorio y con viewport móvil. Safari/iOS y Android físicos requieren una pasada adicional antes de una integración pública. Durante el zoom, el h1 se representa en SVG; puede haber diferencias mínimas de antialiasing respecto del texto HTML al inicio de la cámara.
