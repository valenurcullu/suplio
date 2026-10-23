# Composición V3

La [documentación principal](../README.md) contiene la entrega optimizada, las rutas, los comandos para regenerar desde un clon limpio y los límites del material original. La [auditoría](../AUDIT.md) registra los tamaños y las verificaciones de limpieza.

- `index.html` + `timeline.js`: composición GSAP determinista de 12,6 s.
- `paths.mjs`: separación entre fuentes, producción local y recursos públicos.
- `render.mjs`: 378 fotogramas Playwright en `.production/`, con medidas del viewport y cursor.
- `export.mjs`: regeneración MP4 CRF 18 en `renders/`, sin sobrescribir el master aprobado.
- `optimize.mjs`: MP4 web CRF 21 y poster WebP sin pérdida.
- `verify.mjs`: hashes de recursos, responsive real, cursor, reproducción, loop y fotogramas del MP4 comprimido.
- `player.html`: reproductor local de la entrega pública única.

Todos los intermedios y reportes completos se generan en `.production/naves-del-sur/`, ignorada por Git. V3 no depende de los videos ni reportes históricos de V1/V2.
