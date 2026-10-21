# Suplio — Revisión del hero

Fase de hero, verificada el 21 de octubre de 2026. Servicios, identidad y las demás secciones conservan su implementación.

## Cambio

Se conserva la entrada existente por máscaras y se ajustan su easing y coordinación. Las dos líneas de la frase final ahora tienen máscaras independientes; se preservan sus saltos naturales en móvil. La secuencia dura aproximadamente 1,26 s y mantiene el recorrido original de las dos piezas del isotipo, sin deformación ni rebote.

La descripción precede al cierre del CTA. Ambos mantienen contraste durante la entrada. El hover de la flecha también funciona con foco visible. En escritorio, una vez terminada la introducción, el contenedor del símbolo acompaña el scroll con un recorrido máximo de 8 px. Los paths pertenecen solo a la introducción y el contenedor solo al parallax.

El foco dentro del hero, un resize o avanzar al menos 80 px resuelven inmediatamente la introducción. Las anclas a secciones y la restauración de scroll fuera del inicio omiten la entrada; las anclas y los cambios de breakpoint o de movimiento reducido no la repiten. No hay estados ocultos en el HTML o CSS base. Movimiento reducido muestra directamente la composición final.

## Verificación

- `npm run build`: 20 archivos comprobados; 0 errores, 0 advertencias, 0 hints. Compilación estática completada.
- Se compiló una copia temporal en disco local para evitar la demora de resolución de tipos en la carpeta de red. SHA-256 confirmó que sus 31 archivos de código, recursos, scripts y configuración, incluido el lockfile, eran idénticos al proyecto. Se usaron dependencias de la caché con `npm ci --offline --no-audit --no-fund`. El resultado `dist/` se copió al proyecto.
- `node scripts/verify-hero.mjs`, sobre producción: pasó. Comparación contra referencias previas a 320, 390, 768, 899, 900, 1024 y 1440 px: mismas posiciones, tamaños, textos y píxeles finales.
- Motion activo a 320, 390 y 1440 px: CLS 0, sin desbordes durante la entrada, geometría final restaurada y parallax solo en escritorio.
- Pasaron foco temprano, hover del CTA, resize durante la entrada, cambios repetidos de breakpoint, cambio de movimiento reducido, ancla directa y contenido sin JavaScript.
- `npm run test:browser`, sobre producción: pasó. Axe sin incidencias detectadas en cinco anchos y menú abierto; navegación por teclado, Escape, devolución de foco, anclas, recursos SEO y contenido sin JavaScript correctos. Sin errores de JavaScript ni respuestas HTTP fallidas.
- `git diff --check`: correcto. No se añadieron dependencias ni se modificaron los SVG originales.

Los reportes y capturas están en `test-results/hero-verification.json`, `test-results/verification.json`, `test-results/hero-motion-*.png` y `test-results/hero-after-*.png`. Son artefactos locales ignorados por Git. La comparación visual contra el estado anterior es opcional en ejecuciones futuras: requiere las referencias locales `hero-baseline.json` y `hero-before-*.png`.

## Revisar localmente

Abrir http://localhost:4321/ sin hash y recargar desde el inicio para ver la entrada. La compilación verificada está disponible en http://localhost:4322/ mientras su servidor de preview continúe activo.

Probar un scroll corto después de la entrada, hover y Tab sobre el CTA. Navegar a Servicios y volver arriba: la introducción no vuelve a reproducirse. Repetir en 390 y 320 px y con la preferencia del sistema de reducir movimiento; en ese modo se muestra directamente el estado final.

Para reiniciar desarrollo desde PowerShell sobre esta carpeta de red:

```powershell
cmd /c "pushd \\navesserver\administracion\VALEN\IT\suplio\suplio\web && npm run dev"
```

Con el servidor activo, ejecutar desde una unidad local o mapeada:

```sh
node scripts/verify-hero.mjs
npm run test:browser
```

`QA_URL` permite apuntar ambos scripts a otra dirección, incluida una preview de producción. Estas pruebas requieren Google Chrome instalado.
