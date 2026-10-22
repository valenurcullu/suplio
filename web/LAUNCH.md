# Preparación de lanzamiento — 21 de octubre de 2026

Cambios locales. No se hizo push, deploy, conexión del dominio ni modificación de DNS.

## Qué cambió

- `src/pages/index.astro`: Hero → Servicios → Cómo trabajamos → Proyectos → Identidad → Contacto naranja → Formulario → Footer.
- `src/sections/Process.astro` y `Projects.astro`: números 02 y 03; mismos identificadores y contenido. Servicios sigue en 01, Contacto en 04 y el formulario agrega 05. Identidad conserva su composición sin numeración, como interludio. El refinamiento posterior aprobado de Cómo trabajamos se detalla en `REFINEMENT-QA.md`.
- `src/components/SiteHeader.astro`: menú de escritorio, móvil y alternativa sin JS siguen el orden nuevo. Las anclas desde la confirmación vuelven a la home.
- `src/sections/ContactForm.astro` y `src/scripts/contact.ts`: formulario crema estático, labels, campos obligatorios, honeypot, errores accesibles, estado de envío, bloqueo de duplicados mientras hay una solicitud y conservación de datos ante fallos.
- `src/pages/consulta-recibida.astro`: confirmación con identidad de Suplio, sin intro ni menú. `BaseLayout.astro`, `SiteFooter.astro` y `astro.config.mjs` adaptan enlaces, metadatos, canonical y sitemap. La confirmación tiene `noindex, follow` y se excluye del sitemap.
- `src/scripts/main.ts`: solo se crea la animación del proyecto si esa sección está presente; evita buscarla en la confirmación.
- `src/data/contact.ts`, `WhatsAppLink.astro`, `WhatsAppIcon.astro` y `.env.example`: WhatsApp con número oficial configurable. El flotante conserva posición y tamaño; la intro y el menú lo ocultan temporalmente. En anchos menores solo se suspende ante una colisión real con un control o el teclado virtual. Las secciones y los textos ya no controlan su visibilidad.
- `scripts/verify-contact.mjs` y `package.json`: pruebas de los flujos del formulario, confirmación y WhatsApp.
- `scripts/verify-services.mjs`: espera el estado visual final del cambio de preferencia con polling, en lugar de medir antes de que Chrome termine de aplicarlo. No modifica el código ni los tiempos de las animaciones.
- `COPY-AUDIT.md`: auditoría y propuestas para revisar. Ninguna propuesta editorial fue aplicada.
- `README.md` de la raíz y de `web/`, `LAUNCH.md` y `LAUNCH-QA.md`: instrucciones locales, configuración manual, pendientes y evidencia de QA.

`Contact.astro`, los SVG de marca y los archivos de las animaciones de intro y servicios se conservan. En `global.css` solo se añadieron el fondo Niebla de Cómo trabajamos y el ajuste de contraste de sus números. El bloque naranja no cambió: tampoco sus enlaces `mailto:`, altura, flecha, espaciado ni interacciones. El formulario comienza inmediatamente después y tiene estilos propios.

## Ver en localhost

Desde la raíz del repositorio:

La versión instalada de Astro requiere Node >=22.22.0. Esta revisión usó Node 24.15.0; comprobar también la versión del entorno de build en Netlify.

```sh
cd web
npm ci
npm run dev
```

Si ya están las dependencias, alcanza con `npm run dev`. Abrir la dirección que imprime Astro, normalmente `http://127.0.0.1:4321/`. Formulario: `/#consulta`. Confirmación: `/consulta-recibida/`. Intro forzada: `/?intro=preview`.

Para revisar la compilación de producción:

```sh
npm run build
npm run preview
```

El servidor local no procesa Netlify Forms. Con JavaScript se muestra esa limitación explícitamente y se conservan los campos. Visitar directamente la confirmación tampoco demuestra una recepción de datos.

## Configuración manual en Netlify

1. Conservar el proyecto Netlify existente. Verificar que el directorio base sea `web`, el comando `npm run build` y el directorio publicado `dist` relativo a esa base. Si la configuración actual usa la raíz, el comando equivalente es `npm --prefix web run build` y la salida `web/dist`. Elegir una sola convención y evitar duplicar `web` en las rutas.
2. En **Forms**, habilitar la detección de formularios **antes del próximo deploy autorizado**. El HTML de `dist/index.html` contiene `suplio-consultas`, `method="POST"`, `data-netlify="true"`, el campo oculto `form-name` y `netlify-honeypot="bot-field"`. No necesita una función ni un backend adicional. [Documentación oficial de configuración](https://docs.netlify.com/manage/forms/setup/).
3. Después del deploy autorizado, comprobar que **Forms → Active forms** muestre `suplio-consultas` y el honeypot como protección adicional. Si no aparece, revisar detección, logs de deploy y directorio publicado.
4. En **Forms → Submission notifications → Add notification**, agregar notificación por email para `suplio-consultas` a **hola@suplio.ar**. El asunto se puede configurar allí. El campo del visitante se llama `email`. No se incorporó ningún secreto ni destinatario configurable desde el navegador. [Notificaciones oficiales](https://docs.netlify.com/manage/forms/notifications/).
5. Revisar el uso y los límites de Forms del plan contratado en el panel. No se activaron servicios de almacenamiento externos, webhooks ni analítica de los campos.
6. Mantener sin cambios el dominio y DNS hasta autorizar esa etapa.

Los formularios son HTML estático. Sin JavaScript, el navegador hace POST a `/consulta-recibida/` y Netlify presenta esa página luego de procesarlo. Con JavaScript, se envía un POST URL encoded a `/` y solo se navega a la confirmación si la respuesta HTTP es satisfactoria. Los errores HTTP y de conexión no muestran éxito. No hay reintentos automáticos; una desconexión puede dejar el resultado indeterminado.

Una respuesta HTTP satisfactoria no prueba que la consulta esté en Verified submissions ni que se haya entregado un email: Netlify también filtra spam y el honeypot puede descartar envíos silenciosamente. [Filtros oficiales](https://docs.netlify.com/manage/forms/spam-filters/).

## Prueba real después del deploy autorizado

1. Abrir la URL del deploy en una sesión normal. No hace falta conectar `suplio.ar` para esta prueba.
2. Intentar enviar campos vacíos y un email inválido: deben aparecer errores y no salir una solicitud.
3. Completar una consulta identificable con un email propio real y datos no sensibles; enviar una sola vez. Comprobar el estado «Enviando…», el botón deshabilitado y la confirmación.
4. Comprobar la consulta y todos sus campos en **Forms → suplio-consultas → Verified submissions**. Revisar **Spam** si no aparece. Confirmar por separado la notificación recibida en `hola@suplio.ar`, incluido correo no deseado.
5. Repetir con JavaScript deshabilitado: debe funcionar el POST nativo y abrir la confirmación. Usar otro mensaje identificable.
6. Probar un fallo de conexión usando las herramientas del navegador: debe conservar el contenido, mostrar un mensaje claro y permitir reintentar. Si la conexión se interrumpe después de enviar, revisar el panel antes de repetir para evitar duplicar una consulta ya aceptada.
7. Repetir un envío desde un teléfono real y comprobar que el canal alternativo funciona cuando se configure.
8. Eliminar del panel los envíos de prueba cuando ya se verificó la recepción.

No considerar el formulario verificado en producción hasta completar los pasos 3–5, incluida la recepción en el panel y el email. Las pruebas automatizadas usan respuestas simuladas y no envían datos a Netlify.

## Número de WhatsApp

Número confirmado por el titular: **11 6543-9927**. Se configuró **5491165439927** como valor predeterminado público en `src/data/contact.ts`, siguiendo el [formato de WhatsApp para Argentina](https://faq.whatsapp.com/640432094208718/). WhatsApp queda activo sin necesitar una variable adicional en Netlify.

Para cambiarlo, copiar `web/.env.example` a `web/.env` y completar `PUBLIC_WHATSAPP_NUMBER` en formato internacional: código de país y número, sin `+`, espacios ni separadores. La variable tiene prioridad sobre el valor predeterminado. La implementación también normaliza separadores habituales y rechaza valores no numéricos o con longitud inválida.

Si se desea sobrescribirlo en Netlify, agregar la misma variable al entorno de **build** y volver a compilar en el próximo deploy autorizado. Es una variable pública: el número aparecerá en los enlaces del sitio. No usarla para secretos. La normalización y el mensaje precargado están en `src/data/contact.ts`.

Variable explícitamente vacía o inválida = no se muestra el botón ni el enlace junto al formulario. Cambiar la variable requiere reiniciar el servidor local o recompilar.

## Pendiente antes de publicar oficialmente

- Autorizar push y deploy; todavía no se realizaron.
- Configurar detección y notificaciones, y verificar un envío real en Netlify con y sin JavaScript.
- Comprobar que WhatsApp abra la cuenta esperada para el número confirmado; no se envió ningún mensaje.
- Aprobar o descartar las propuestas de `COPY-AUDIT.md` antes de aplicarlas.
- Revisar el caso autorizado de Naves del Sur ya integrado con capturas reales, crédito y alcance en [PORTFOLIO-QA.md](PORTFOLIO-QA.md). Pyme Protegida no está implementado. El lanzamiento sigue sujeto a aprobación; no se hizo push ni deploy.
- Hacer la comprobación final en un teléfono real y, si se busca cobertura adicional, Safari y Firefox; la automatización local usa Chrome.
- El tratamiento de datos publicado es una nota básica. Revisar internamente los criterios de acceso, conservación y borrado de consultas según la operación real de Suplio.

Los resultados medidos y sus límites se registran en `LAUNCH-QA.md`. Los puntajes de Lighthouse del documento histórico `QA.md` corresponden a una versión anterior y no se presentan como una medición nueva.
