# Suplio — Signature Intro

Implementación lista para revisión visual, verificada el 21 de octubre de 2026. La aprobación final del ritmo y la revelación queda a cargo del usuario.

## Ver y repetir

- Desarrollo: http://localhost:4321/?intro=preview
- Producción: http://localhost:4322/?intro=preview

Recargar cualquiera de esos enlaces repite la intro aunque ya esté marcada como vista. Usar la URL sin ancla. El modo preview respeta movimiento reducido y la navegación por anclas.

En la URL normal, la intro se muestra una vez por sesión de pestaña mediante `sessionStorage`, clave `suplio:intro:v1`. Preview ignora la marca de vista. Si no hay almacenamiento disponible, se muestra directamente la web.

## Coreografía

| Momento | Duración |
|---|---|
| Entrada simultánea desde fuera de ambos bordes | 0,62 s |
| Reconocimiento del isotipo ensamblado | 0,16 s |
| Giro único de 360°, con aceleración y desaceleración | 0,98 s |
| Orientación original, pausa mínima | 0,10 s |
| Expansión uniforme y abertura central | 0,74 s |

Total: aproximadamente 2,60 s desde el inicio de la timeline. No depende de terminar de cargar imágenes o fuentes. Las piezas usan exactamente los paths oficiales y el grupo gira alrededor de `(48, 48)` en el viewBox 96 × 96. La escala base responde al viewport, entre 136 y 208 px; la expansión final es uniforme hasta 3,6×.

La abertura nace del espacio negativo del símbolo. Se extiende a lo ancho antes de completar el recorrido vertical, mediante un recorte CSS `polygon(evenodd, …)` aplicado tanto al fondo crema como al SVG de la intro. El logo no se desvanece: conserva opacidad 1 mientras la abertura lo recorta. El fondo de la apertura es siempre crema.

El hero recibe solo su entrega tipográfica durante la revelación. Sus piezas ya están ensambladas y no repiten la entrada anterior. El parallax se habilita al liberar la intro. Con la intro omitida, el hero se presenta directamente en su estado final.

## Acceso y recuperación

El componente está oculto por defecto. Un bootstrap inline decide si activarlo antes del primer pintado y arma un watchdog independiente del bundle principal.

- Omitir intro, Escape, Tab, foco fuera de la capa, rueda/scroll, gesto de desplazamiento, cambio real de tamaño/orientación y movimiento reducido resuelven la entrada inmediatamente.
- Los eventos iniciales de resize sin cambios de dimensiones no cancelan la entrada móvil.
- No se bloquea el scroll del documento ni se atrapa el foco.
- Las áreas ya reveladas reciben los clics; al terminar, la capa queda completamente fuera del hit testing.
- Sin JavaScript, con movimiento reducido, con ancla directa o sin soporte del recorte, se accede directamente a la web.
- Si falla la carga del módulo de animación, el bootstrap libera la capa en un máximo de 4,5 s desde su activación.
- Finalización y navegación limpian timeline, listeners y temporizador.

## Verificación

- `npm run build`: 0 errores, 0 advertencias y 0 hints; compilación estática completada.
- Se compiló en la copia temporal local de QA para evitar demoras de resolución de dependencias sobre la carpeta de red. SHA-256 confirmó 37 archivos de código, recursos, scripts y configuración idénticos al proyecto. El resultado se copió a `dist/` del proyecto.
- `node scripts/verify-intro.mjs`: aprobado en producción. Tamaños 320 × 844, 390 × 844, 768 × 1024, 1024 × 768 y 1440 × 900.
- Entrada completamente fuera del viewport, centrado geométrico y unión precisa: correctos. Giro medido de 360° una sola vez, sin escalado ni separación durante el giro; orientación original antes de expandir.
- Paths y colores idénticos al SVG oficial. Se comprobó que el isotipo del hero no se mueve durante la intro y que el símbolo principal conserva opacidad 1.
- Sesión, recarga, preview y anclas: correctos. Botón, Escape, Tab, foco, scroll, resize, movimiento reducido y limpieza al navegar: correctos.
- Fallo simulado del bundle principal: watchdog correcto; contenido visible y hero resuelto. Sin JavaScript, sin almacenamiento y sin soporte de clip-path: acceso directo correcto.
- Prueba en tiempo real en Chrome móvil emulado: secuencia completa, CLS 0, sin ensamble duplicado en el hero. Axe WCAG 2 A/AA y 2.1 A/AA sin incidencias detectadas.
- `node scripts/verify-hero.mjs`: aprobado. Composición final idéntica a las referencias previas en siete anchos, con cero píxeles diferentes. Hover, foco, parallax, reduced motion y anclas correctos.
- `npm run test:browser`: aprobado. Responsive, teclado, menú, anclas, recursos SEO, contenido sin JavaScript y restauración de Identidad correctos.
- `node scripts/verify-services.mjs`: aprobado. Cuatro demostraciones, autoplay, hover, teclado, toque, reduced motion y limpieza correctos.
- Comparación contra el código previo: 16 archivos de fuente existentes sin cambios, incluidos Servicios, Proyectos, Proceso, Identidad, Contacto, Hero.astro y global.css. Inicialización existente ajena al hero conservada. Los seis SVG públicos coinciden byte por byte con los originales de marca.
- `git diff --check`: correcto. Sin nuevas dependencias.

Capturas: `test-results/intro-1440-*.png` y `intro-390-*.png`. Detalle por cuadro: `intro-frames-*.json`. Resultado: `intro-verification.json`. Son artefactos locales ignorados por Git.

La validación de navegador se realizó con Google Chrome en Windows y viewport/táctil móvil emulado; no sustituye una revisión visual en dispositivos físicos o Safari. No se volvió a medir Lighthouse.

## Repetir las pruebas

Desde `web/` en una unidad local o mapeada, con el servidor activo:

```sh
node scripts/verify-intro.mjs
node scripts/verify-hero.mjs
node scripts/verify-services.mjs
npm run test:browser
```

Los scripts admiten `QA_URL` y requieren Google Chrome instalado.
