# Verificación local de Suplio

Compilación estática real de producción, medida en Chrome. No corresponde a una publicación en suplio.ar.

## Compilación y dependencias

- `npm run build`: 0 errores, 0 advertencias y 0 hints en 19 archivos Astro.
- Auditoría de npm posterior a actualizar Astro y sharp: 0 vulnerabilidades detectadas.
- Las copias de los seis SVG de marca coinciden byte por byte con sus originales.

## Navegador

`npm run test:browser` completado correctamente.

- Anchos de 320, 390, 768, 1024 y 1440 px: sin desbordes horizontales.
- Axe WCAG 2 A/AA y 2.1 A/AA: 0 incidencias detectadas en cada ancho y en el menú abierto.
- Menú con teclado, Escape y devolución de foco: correcto.
- Anclas internas y recursos de SEO: correctos.
- Movimiento reducido y restauración de la geometría al pasar de escritorio a móvil: correctos.
- Contenido y contacto sin JavaScript; navegación alternativa en móvil y tablet: correctos.
- Sin errores de JavaScript ni recursos HTTP fallidos durante las pruebas.

Capturas revisadas: [escritorio](test-results/home-1440.png) y [móvil](test-results/home-390.png).

## Lighthouse móvil

| Categoría | Resultado |
|---|---|
| performance | 100/100 |
| accessibility | 100/100 |
| best-practices | 100/100 |
| seo | 100/100 |

- first-contentful-paint: 1.2 s
- largest-contentful-paint: 1.7 s
- cumulative-layout-shift: 0
- total-blocking-time: 10 ms

[Informe HTML completo](test-results/lighthouse-final.report.html) · [Datos de Lighthouse](test-results/lighthouse-final.report.json) · [Verificación de navegador](test-results/verification.json)

Los puntajes corresponden a una ejecución local con emulación móvil. Pueden cambiar con el hosting, el dispositivo y futuros contenidos. Axe y Lighthouse no sustituyen una evaluación humana completa de accesibilidad. Las pruebas automatizadas de navegador se ejecutaron en Chrome.

## Antes de publicar

El caso Naves del Sur usa un placeholder explícito. Incorporar capturas y alcance autorizados, o retirar temporalmente el caso y su enlace de navegación. No se configuraron GitHub, Netlify ni DNS.
