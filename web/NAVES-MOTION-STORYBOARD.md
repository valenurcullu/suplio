# Naves del Sur — Motion showcase: storyboard aprobado

22/10/2026. **V3 producida y optimizada; fuentes organizadas para regeneración.** Ver [entrega y reproducción](../motion/naves-del-sur/README.md) y [auditoría de limpieza](../motion/naves-del-sur/AUDIT.md). El titular autorizó subir los cambios a GitHub después de las verificaciones. La integración del video a Proyectos sigue pendiente; el diseño de Suplio se conserva. El storyboard y las notas siguientes documentan la secuencia inicial aprobada y su evolución.

## Referencia analizada

Archivo del titular: `~/Downloads/Grabación de pantalla 2026-10-22 a la(s) 19.36.07.mov`. Duración medida: 16,682 s; imagen de 690 × 694 px. Muestra el showcase de Clearbit dentro de la página de Ramotion, con parte de un segundo ciclo. El clip original de Clearbit de la [referencia pública](https://www.ramotion.com/work/web-design/) tiene una duración de 9,983 s y resolución 1600 × 1200.

Se extrajeron y revisaron visualmente 23 fotogramas a intervalos de 0,75 s y otros cinco a intervalos de 0,25 s alrededor de la transición de cámara. Los fotogramas y hojas de contacto de análisis están en `/private/tmp/suplio-motion-reference/`; no son recursos de producción.

### Lectura visual del adjunto

Los tiempos siguientes corresponden a la grabación recibida; el primer fotograma ya muestra la animación en curso.

| Tramo aproximado | Qué se observa | Aplicación a Naves |
| --- | --- | --- |
| 0–1,8 s | Una interfaz contenida en un plano cambia de encuadre vertical y muestra distintas secciones. El fondo conserva continuidad. | Tratar la interfaz como un plano dentro de una composición; seleccionar encuadres concretos. |
| 1,8–4 s | Acercamiento marcado y encuadre diagonal de un detalle; perspectiva y desenfoque dan profundidad. | Un acercamiento breve hacia un componente real, con inclinación muy leve durante la transición y lectura frontal al asentarse. Conservar nítidos logo y textos protagonistas. |
| 4–5,6 s | Una composición de módulos e iconos separados se organiza con apariciones escalonadas y sombras suaves. | Ensamblar las tarjetas e imágenes reales del catálogo. No trasladar sus iconos o inventar módulos para Naves. |
| 5,6–8,6 s | La presentación vuelve al hero y cambia a proporciones de tablet y móvil; el tamaño del plano y su posición forman parte de la transición. | Coordinar desktop y móvil reales como dos estados de la misma experiencia. |
| 8,6–10 s, aproximadamente | El plano vuelve a acercarse y se recupera el encuadre del siguiente ciclo. Después se repiten los motivos anteriores. | Preparar el cierre desde el storyboard, con continuidad de posición, escala y color hacia el inicio. |

La sensación cinematográfica proviene de alternar planos generales y detalles, coordinar movimientos de cámara con apariciones de componentes, solapar entradas y salidas y dejar breves momentos de lectura. Los elementos no entran todos con el mismo movimiento ni a intervalos idénticos.

El cursor, el desplazamiento de la página de Ramotion y los textos exteriores a la tarjeta pertenecen a la grabación recibida. No forman parte de la propuesta. Tampoco se reutilizarán su identidad, fondo tridimensional, iconos o gráficos blancos de señalamiento.

## Recursos reales disponibles

Código original localizado en `/Users/valentinurcullu/Documents/Naves/webnaves/`. La hoja local `estilos/style.css` coincide por SHA-256 con la publicada en `https://navesdelsur.com/estilos/style.css`, comprobado durante la inspección. Esto verifica esa hoja, no la igualdad de todo el repositorio con producción.

| Recurso | Archivo original | Dimensiones / uso |
| --- | --- | --- |
| Logo oficial completo | `imagenes/naves3.png` | PNG transparente, 1206 × 317; apertura, navegación y cierre. Mantener proporción, colores y forma. |
| Fotografía del hero | `imagenes/indPetrolera.webp` | 960 × 576; fondo con el overlay azul real. Evitar grandes ampliaciones de esta imagen. |
| Hero y navegación | `index.html`, `estilos/style.css`, `estilos/bootstrap.min.css` | Reutilizar estructura, textos, botones, proporciones y estilos de la web. |
| Catálogo | `productos.html` | Tarjetas originales de bombas industriales y petroleras, con sus títulos y estilos reales. |
| Imagen industrial | `imagenes/bombasImg/j2.jpeg` | 1024 × 768; dentro de la tarjeta original. |
| Imagen petrolera | `imagenes/bombasImg/NEA5.jpeg` | 1280 × 720; dentro de la tarjeta original. |
| Responsive | Media queries originales y vista real a 390 × 844 | Estado móvil de la web; no crear un diseño móvil nuevo. |
| Capturas existentes | `public/projects/naves-del-sur/` | Referencia de fidelidad y respaldo visual; recapturar desde el DOM cuando se necesiten capas y texto de mayor definición. |

Roboto es la fuente real del contenido; se conservará también la pila tipográfica original de la navegación. Los recursos tipográficos y de iconos necesarios se resolverán antes de capturar. Las imágenes de producto se mantendrán dentro de sus encuadres, sin inventar recortes transparentes ni redibujar productos. El logo se animará como una pieza completa, sin modificar sus trazos.

## Storyboard aprobado — 11,5 segundos

Primer prototipo: **1280 × 720, 16:9, 30 fps, sin audio**. La propuesta dedica aproximadamente un segundo a la marca y el resto al trabajo. Los tiempos incluyen las transiciones; no se suman pausas entre escenas.

| Tiempo | Composición | Movimiento |
| --- | --- | --- |
| **0–1,1 s — Marca** | Pantalla blanca y logo oficial completo centrado. El logo está visible desde el primer fotograma. | Pausa de lectura limpia; sin rotación del símbolo, eslogan, cursor ni efectos añadidos. |
| **1,1–3,9 s — Hero vivo** | El logo llega a su posición en la navegación original. Aparecen la foto industrial, overlay azul, cápsula de navegación, título y botones reales. | La foto se revela con máscara; la cápsula se ensambla alrededor del logo. El título entra por líneas con máscaras y desplazamientos cortos; texto secundario y CTA completan el plano con un desfase leve. Un acercamiento de aproximadamente 3–4% se asienta antes de cambiar de escena. |
| **3,9–6,9 s — Catálogo industrial** | Dos tarjetas reales: bombas industriales y petroleras. Prioridad visual a fotografías y títulos, con el aspecto original del catálogo. | La salida del hero y la entrada del catálogo comparten dirección. Primero se establecen los contenedores, después se revelan imágenes y títulos con un desfase de unos 80–120 ms. Un paneo y acercamiento breve dirige la atención hacia los productos; termina frontal para la lectura. |
| **6,9–9,7 s — Responsive** | Desktop pasa a segundo plano; una vista móvil real ocupa aproximadamente el 75–85% de la altura útil y toma el protagonismo. Ambas muestran el mismo proyecto. | Desktop se reduce y se desplaza lateralmente mientras el móvil entra mediante máscara vertical. Navegación compacta, título y botones aparecen coordinados. Se usan los dos layouts originales; no se deforma el desktop para simular un teléfono. |
| **9,7–11,5 s — Retorno a marca** | La interfaz se retira y vuelve la pantalla blanca con el mismo logo centrado de la apertura. | Un barrido blanco acompaña la salida del plano; el logo retorna desde la navegación a su posición inicial. Reservar los últimos 0,3–0,4 s para que el estado coincida con el inicio. Sin negro intermedio ni un corte visible al reiniciar. |

La apertura blanca y el cierre son una decisión propia solicitada por el titular; no se presentan como parte de la referencia de Ramotion.

## Criterios de movimiento y fidelidad

- Una acción principal por escena, con movimientos secundarios subordinados.
- Entradas de aproximadamente 0,45–0,75 s y cambios de plano de 0,65–0,9 s, solapados dentro de los tiempos del storyboard.
- Desaceleración suave en ensamblados; curvas simétricas en los cambios de cámara. Sin rebotes elásticos o golpes de zoom.
- Máscaras para títulos e imágenes. Los elementos regresan a sus posiciones originales al terminar de ensamblarse.
- Los planos cercanos priorizan imágenes, logo, título del hero y títulos de productos. No reducir un documento largo entero para intentar mostrar todos sus textos a la vez.
- Validar legibilidad al tamaño real de 1280 × 720. La composición móvil tendrá suficiente tamaño para reconocer su interfaz y leer los textos principales.
- Fondo y luz derivados de los azules y blancos de Naves. Sin introducir la identidad de Ramotion ni decoraciones ajenas al proyecto.
- Sin modelos de dispositivos, partículas, glitch, cursores o simulación de navegación. El movimiento será parte de la composición audiovisual.

## Método de producción aprobado

1. **Composición independiente.** Crear un espacio de trabajo como `motion/naves-del-sur/`, fuera de `web/src` y `web/public`. Copiar únicamente recursos necesarios y extraer los fragmentos reales de interfaz, preservando CSS y contenido. No modificar el código original del cliente. Aislar el render de analítica, formularios y dependencias de red.
2. **HTML/CSS/SVG + GSAP.** Usar contenedores de máscara y una única timeline de duración fija. GSAP controla posición, escala, opacidad y recortes. Los estados desktop y móvil conservan sus propias dimensiones y media queries. Los scripts de animación de la web original no controlarán el reloj de producción.
3. **Render determinista con Playwright.** Resolver fuentes e imágenes antes de renderizar. Para cada fotograma, avanzar la timeline pausada al tiempo exacto `i / 30`, esperar el pintado y capturar PNG. Para 11,5 s son 345 fotogramas. No usar una grabación de pantalla en tiempo real, de modo que una caída de rendimiento no produzca saltos o pérdida de cuadros.
4. **Exportar con FFmpeg.** MP4 H.264, `yuv420p`, sin pista de audio y `faststart`; WebM VP9, también sin audio. Ajustar compresión después de inspeccionar bordes del logo y tipografía. FFmpeg 8.0 fue instalado en la etapa de producción aprobada. GSAP, Playwright y Sharp se reutilizan desde las dependencias existentes; no se requiere un servicio ni una herramienta adicional de pago.
5. **QA y entrega.** Revisar los fotogramas clave, todos los cambios de plano, el archivo reproducido y varios ciclos consecutivos. Verificar con FFprobe duración, resolución, frame rate y ausencia de audio. Entregar MP4, WebM, un poster estático y un reproductor local con `autoplay muted loop playsinline`, junto a tamaños medidos. Si se aprueba el prototipo, renderizar nuevamente a 1920 × 1080; no ampliar el MP4 de 720p.

El prototipo exportado dura 11,5 s a 1280 × 720 y 30 fps, sin audio. Tamaños medidos: MP4 de 2.859.074 bytes y WebM de 2.746.546 bytes. El método y los resultados de verificación están documentados con la entrega.

## Estado de entrega

El titular aprobó la secuencia y autorizó producir el primer prototipo. La composición independiente, MP4, WebM, poster y reproductor local están en `motion/naves-del-sur/`. Revisión en http://127.0.0.1:4330/player.html. Queda pendiente su revisión de timing, composición y movimiento. La incorporación a Proyectos, cualquier commit, push o deploy de esta pieza siguen fuera de esta etapa.

## Cierre de producción — V3

La entrega web conserva únicamente MP4 H.264 y poster WebP en `public/projects/naves-del-sur/motion/`. Masters, versiones históricas, fotogramas y revisiones se archivan localmente en `../.production/naves-del-sur/`, ignorado por Git. Las fuentes activas y los recursos originales están en `../motion/naves-del-sur/`; no se importan desde el sitio. La V3 conserva la secuencia aprobada, agrega cursor y arrastre responsive real y refina la continuidad del catálogo, el agarre y el cierre.
