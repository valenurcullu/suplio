# Suplio — Revisión de Servicios

Fase verificada el 21 de octubre de 2026. Se agregó «IA y agentes» como cuarta fila editorial con la descripción y los ejemplos aprobados. La mención de IA se trasladó desde Automatización hacia esta fila.

## Composición e interacción

Se mantienen la cabecera de Servicios, el texto de cierre, los tamaños de letra, columnas, padding, separadores y ritmo de las filas. El sistema de tres filas se extiende a cuatro. Las miniaturas son SVG nativos dentro de controles con nombre y descripción accesibles.

- Web: marco y navegación trazados; bloques de contenido, composición gráfica y acción naranja se construyen progresivamente. Aproximadamente 1,3 s.
- Aplicación: módulos encajan sobre guías y se integra una extensión naranja. Aproximadamente 1,6 s.
- Automatización: un paquete recorre dos conexiones curvas y activa sucesivamente un proceso y su resultado. Aproximadamente 1,8 s.
- IA y agentes: solicitud, interpretación, consulta a herramienta, retorno de información y preparación de un documento. Aproximadamente 2,4 s.

Una sola escena se reproduce por vez. La primera reproducción ocurre cuando la miniatura entra en el área visible, con espacio para la cabecera fija. Hover de la fila, foco, Enter, Espacio y toque permiten repetirla. Las interacciones manuales tienen prioridad sobre la cola automática. No hay loops. Se reutilizan cuatro timelines; salir de pantalla o esconder la pestaña resuelve la escena y detiene el trabajo.

En tablet la miniatura queda debajo de la columna descriptiva; en móvil ocupa 155 × 112 px bajo el texto. El SVG escala conservando su proporción y los trazos. La adaptación agrega espacio vertical sin superponer las escenas con la lectura.

Sin JavaScript o con movimiento reducido se muestra el SVG final estático y el control queda inactivo. Cambiar la preferencia durante una escena restaura los estilos y las transformaciones originales del SVG. La limpieza desconecta el observer, elimina listeners y revierte las timelines.

## Resultados

- `npm run build`: 23 archivos comprobados, 0 errores, 0 advertencias, 0 hints; compilación estática completada.
- Se compiló en la copia temporal local usada para QA, evitando la demora del acceso a dependencias sobre la carpeta de red. SHA-256 confirmó 34 archivos de código, recursos, scripts y configuración idénticos al proyecto. El build se copió a `dist/` del proyecto.
- `node scripts/verify-services.mjs`: aprobado sobre producción. Siete anchos: 320, 390, 768, 899, 900, 1024 y 1440 px. Cuatro miniaturas visibles en todos ellos; sin desbordes y sin incidencias axe WCAG 2 A/AA y 2.1 A/AA detectadas.
- Se verificaron reproducción automática de las cuatro escenas, máximo de una activa, orden del recorrido de datos y orden de solicitud/consulta/retorno/resultado del agente.
- Hover, foco, Enter, Espacio y toque: correctos. Cada toque produce una sola reproducción. El texto permanece estable durante las escenas. CLS medido durante las pruebas: 0.
- Resize, interrupción con movimiento reducido, salida de viewport, limpieza y reinicialización de Astro: correctos. Contenido y gráficos finales visibles sin JavaScript.
- `npm run test:browser`: aprobado. Menú, teclado, anclas, SEO, contenido sin JavaScript y geometría responsive de Identidad correctos. Sin errores de JavaScript ni respuestas HTTP fallidas.
- `node scripts/verify-hero.mjs`: aprobado. Composición final del hero idéntica a sus referencias previas en siete anchos; mismas capturas, sin píxeles diferentes. Motion y accesibilidad del hero conservados.
- Comparación del código contra la referencia previa a esta fase: 12 archivos existentes fuera del alcance sin cambios. Lógica existente del hero, navegación e Identidad sin cambios; CSS ajeno a Servicios, contenido de otras secciones, cabecera y cierre de Servicios conservados. La única integración en `main.ts` es el import y la inicialización del nuevo módulo.
- `git diff --check`: correcto. Sin dependencias nuevas ni cambios en los archivos de marca.

Capturas y reportes: `test-results/services-1440.png`, `services-390.png`, `services-320.png`, `services-768.png`, `services-*-early.png`, `services-*-middle.png`, `services-*-final.png` y `services-verification.json`. Son artefactos locales ignorados por Git.

## Revisar

Desarrollo: http://localhost:4321/#servicios

Producción: http://localhost:4322/#servicios

Recargar para redescubrir las cuatro escenas. Recorrer la sección con una pequeña pausa por fila y luego repetir con hover sobre cada fila, Tab hacia la miniatura seguido de Enter/Espacio, o toque en móvil. Con movimiento reducido se muestra la composición final.

Desde la carpeta web en una unidad local o mapeada, con el servidor activo:

```sh
node scripts/verify-services.mjs
node scripts/verify-hero.mjs
npm run test:browser
```

`QA_URL` permite apuntar los scripts a otra dirección. Se requiere Google Chrome instalado. No se ejecutó una nueva medición Lighthouse.
