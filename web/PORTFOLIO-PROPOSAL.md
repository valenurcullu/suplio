# Portfolio — definición vigente de Pyme Protegida

Actualizado según la indicación del titular del 21/10/2026. Esta definición reemplaza la propuesta anterior sobre atribución y presentación pública de Pyme Protegida.

## Estado actual

Naves del Sur está implementado con cuatro capturas reales y listo para revisión local en http://127.0.0.1:4322/#proyectos. Ver [PORTFOLIO-QA.md](PORTFOLIO-QA.md).

Pyme Protegida se incorporará en una etapa posterior. Por ahora no se modifica la presentación pública ni se agrega un placeholder. No hacer push ni deploy sin aprobación del titular.

## Autorizaciones confirmadas por el titular

- El propietario de Pyme Protegida autorizó utilizar y presentar el trabajo en el portfolio comercial de Suplio.
- El diseñador de la identidad visual actualmente trabaja con Suplio y cedió los derechos correspondientes para su utilización comercial.
- Ambas partes autorizaron presentar el proyecto bajo la marca Suplio.

La presentación será como proyecto del portfolio de Suplio. El relato público se centrará en el trabajo y las capacidades del estudio, sin etiquetas de trabajo externo ni referencias a una cronología de colaboración. No inventar fechas, resultados ni detalles históricos de contratación.

## Contenido público definido

**Proyecto 02 — Pyme Protegida**

**Categoría:** Branding e identidad visual.

**Descripción:** «Desarrollo de identidad visual, sistema gráfico y aplicaciones de marca para Pyme Protegida.»

## Revisión específica de Walrus

El PDF original contiene referencias a Walrus. Antes de adaptar la presentación, verificar que la cesión de derechos también cubra esos elementos y que no queden créditos o derechos pendientes de terceros.

Esta revisión específica permanece pendiente y no cambia las autorizaciones ya informadas del propietario y del diseñador. No asumir que las referencias a Walrus pueden eliminarse o sustituirse sin verificar su alcance. Registrar qué elementos están cubiertos y cualquier crédito que corresponda conservar.

El PDF original todavía no está disponible en el repositorio ni entre los archivos recibidos para esta etapa. No se han inspeccionado sus piezas ni verificado los elementos de Walrus.

## Dirección editorial para la próxima etapa

- Dos casos de ancho completo, uno debajo del otro, con protagonismo equivalente: 01 Naves del Sur y 02 Pyme Protegida.
- Conservar el fondo Tinta, los márgenes editoriales, la tipografía de interfaz y el encabezado «Del problema a lo concreto.».
- Elegir las mejores piezas reales del PDF: identidad final, sistema gráfico y aplicaciones que aporten usos distintos. La selección definitiva dependerá de la revisión del material.
- Dar jerarquía al logotipo y a una pieza principal, con vistas complementarias de tamaños distintos y espacio negativo generoso. Evitar una grilla de tarjetas iguales.
- Mantener los colores de Pyme Protegida dentro de sus piezas; la interfaz conservará la identidad de Suplio.
- En móvil, apilar las imágenes, conservar información relevante y permitir revisar los detalles a tamaño completo.
- Optimizar recursos, reservar dimensiones y definir textos alternativos. Mantener el movimiento secundario y no agregar una secuencia compleja de scroll.

## Incorporación futura al código

La sección ya utiliza una colección en `src/data/projects.ts` y los componentes `ProjectCase.astro` y `ProjectImage.astro`. Admite categoría, portada, vistas interiores, imagen vertical opcional, descripción y crédito por caso.

Cuando se trabaje en Pyme Protegida:

1. Revisar el PDF, resolver el alcance específico de Walrus y seleccionar piezas definitivas.
2. Preparar exportaciones reales optimizadas bajo `public/projects/pyme-protegida/`.
3. Agregar el segundo caso a la colección con los textos definidos arriba y ajustar su composición al material de identidad, con la misma jerarquía de Naves.
4. Mostrar únicamente los créditos que correspondan tras la revisión; no inventar roles ni usar el campo de crédito para introducir una historia de contratación.
5. Verificar responsive, accesibilidad, carga de imágenes y convivencia con las animaciones existentes antes de la revisión del titular.

No es necesario reconstruir la sección ni introducir filtros, categorías vacías, nuevas dependencias o casos de relleno.
