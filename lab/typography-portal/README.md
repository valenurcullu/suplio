> **Iteración actual: hero → Servicios.** La nueva prueba nace en la «o» de «desafíos» y utiliza la home completa original. Ver [instrucciones](hero/README.md), [demo local](http://127.0.0.1:4341/?intro=preview) y [grabaciones](http://127.0.0.1:4341/review/). El experimento anterior que se documenta debajo se conserva como referencia técnica.

# Suplio — Typography Portal / Laboratorio 01

Prototipo independiente de transición entre «Cómo trabajamos» y «Proyectos». No está integrado en la home ni en el build de Astro. No se modifican la intro, Servicios, la secuencia aprobada de Cómo trabajamos ni Contacto.

## Abrir

Desde la raíz del repositorio, con las dependencias existentes de `web/` instaladas:

```sh
node lab/typography-portal/server.mjs
```

**http://127.0.0.1:4340/**

Usar la rueda o el gesto táctil para avanzar y retroceder. «Ir al proyecto» salta la secuencia sin bloquear el enlace; «Volver a atravesar» regresa al inicio del portal. El video dispone de pausa/reproducción y enlace al MP4. El acceso directo `/#proyecto` también está previsto.

`PORT=4341 node lab/typography-portal/server.mjs` permite elegir otro puerto. El servidor escucha únicamente en localhost y expone una lista explícita de archivos.

## Recorrido propuesto

1. **Contexto del proceso.** Un cierre editorial sobre Niebla, usando la frase existente «Primero entendemos. Después construimos.». Es una pieza de contexto de la demo, sin reutilizar ni alterar la animación de la web.
2. **Composición protagonista.** «De la idea / a lo / concreto.» en Space Grotesk 700, Crudo, Tinta y Señal. La «o» naranja es el punto de entrada.
3. **Anticipación.** Su abertura comienza a mostrar el video real que está detrás, antes del acercamiento. La composición se fija temporalmente al llegar al viewport.
4. **Atravesar la tipografía.** La cámara converge hacia el interior de la «o» y aumenta progresivamente la escala. La forma permanece vectorial y su abertura termina cubriendo la pantalla.
5. **Revelación del caso.** El showcase de Naves del Sur entra como un plano separado, con perspectiva moderada en tres ejes, desplazamiento y profundidad. El encuadre termina frontal y legible.
6. **Continuidad.** Una breve pausa de scroll sostiene el video completo; después el pin se libera y siguen los datos del caso en flujo normal.

No se agrega una intro 3D al video ni se modifica su contenido. Se reutiliza exactamente el MP4 V3 optimizado de `web/public/projects/naves-del-sur/motion/`, sin copiarlo.

## Implementación

- **GSAP + ScrollTrigger:** un único pin y una timeline ligada al scroll, con scrub de 0,5 s. Duración: tres alturas de viewport en desktop y 2,6 en móvil. La cámara y la perspectiva se calculan desde el mismo progreso; al subir se deshacen.
- **Máscara SVG:** la abertura usa el contorno interior real de la «o» del wordmark oficial convertido a trazados. `glyph.json` conserva esos contornos y el hash del SVG fuente. Es un carácter usado como tipografía; el logo completo del encabezado conserva sus archivos oficiales.
- **Cámara vectorial:** se anima el `viewBox`, conservando la relación de aspecto. Esto permite atravesar la letra sin estirar su geometría ni crear una capa CSS escalada decenas de veces. La máscara deja de pintarse cuando el portal ya ocupa toda la pantalla y reaparece al retroceder.
- **Perspectiva CSS:** se aplica solo al plano del video, con valores moderados que convergen a cero. El eco del marco es una referencia de profundidad y desaparece al enderezarse.
- **Rendimiento:** un SVG pequeño y un solo video. No hay WebGL, canvas, librerías nuevas, imágenes generadas ni dependencias externas de red. GSAP, ScrollTrigger y las dos fuentes se sirven desde los paquetes ya instalados.
- **Video:** silenciado, inline y en loop. Se activa cerca de la escena y se pausa al alejarse, al ocultar la pestaña o si lo pausa el usuario. Si el navegador impide autoplay, quedan el poster y el botón de reproducción.
- **Navegación:** encabezado siempre disponible, salto al proyecto y al comienzo, foco por teclado y enlaces del caso. Los controles del proyecto quedan inertes solo mientras están cubiertos por la tipografía.

## Movimiento reducido y fallback

Con `prefers-reduced-motion: reduce` no hay pin, zoom, perspectiva ni autoplay. La tipografía y el proyecto se leen en flujo normal y el video usa controles nativos. Un cambio de preferencia durante la visita restaura ese flujo.

Sin JavaScript también se ven el texto y el proyecto, con video nativo. En viewports de menos de 540 px de alto se prefiere el flujo normal para evitar una escena fijada demasiado comprimida, por ejemplo en móvil horizontal.

El prototipo se verifica con Google Chrome en tamaños desktop, tablet y móvil; todavía requiere una revisión en un iPhone/Safari físico antes de considerar una integración en producción.

## Archivos y revisión

- `index.html`, `style.css`, `portal.js`: demo.
- `server.mjs`: servidor local; no instala herramientas ni modifica la web.
- `glyph.json`: geometría de la «o» oficial.
- `verify.mjs`: comprobaciones mediante scroll real en Playwright, incluyendo el regreso, teclado, reproducción, accesibilidad, resize, movimiento reducido y ausencia de JavaScript.

```sh
node lab/typography-portal/verify.mjs
```

Capturas e informe: `.production/typography-portal/review/` (ignorado por Git). El laboratorio está fuera de `web/src` y `web/public`; no se añade a `web/dist`, al sitemap ni al bundle de la home. No se ha hecho commit, push o deploy de este experimento.

## Primera revisión — 23/10/2026

Verificación aprobada en Chrome: 1440 × 1000, 1280 × 720, 768 × 1024, 390 × 844 y 320 × 568. En todos los tamaños se probó el recorrido hacia adelante y hacia atrás, sin overflow horizontal ni triggers duplicados, controles reales de reproducción y salto al proyecto por teclado. Axe no detectó infracciones WCAG A/AA en las escenas revisadas.

También se comprobaron el acceso por `#proyecto`, movimiento reducido, fallback sin JavaScript, cambio de preferencia durante la visita, resize desktop → mobile y flujo sin pin en orientación horizontal baja. No se registraron errores de navegador ni dependencias de red externas. Capturas e informe quedan en la carpeta local ignorada indicada arriba.
