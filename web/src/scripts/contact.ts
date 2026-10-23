const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
if (form) {
  const submit = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
  const label = form.querySelector<HTMLElement>('[data-submit-label]')!;
  const status = form.querySelector<HTMLElement>('[data-submit-status]')!;
  const feedback = form.querySelector<HTMLElement>('[data-submit-error]')!;
  const required = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[required]')];
  const staging = form.hasAttribute('data-staging');
  // Staging renders the button disabled for visitors without JavaScript; validation stays testable.
  if (staging) submit.disabled = false;
  let sending = false;
  const validate = (field: HTMLInputElement | HTMLTextAreaElement) => {
    const error = document.getElementById(`${field.id}-error`)!;
    const message = !field.value.trim()
      ? (field.name === 'email' ? 'Ingresá tu email.' : field.name === 'message' ? 'Contanos qué tenés en mente.' : 'Ingresá tu nombre y apellido.')
      : field.validity.typeMismatch ? 'Ingresá un email válido, por ejemplo nombre@empresa.com.' : '';
    field.setAttribute('aria-invalid', String(Boolean(message)));
    error.textContent = message;
    error.hidden = !message;
    return !message;
  };
  // Keep native HTML validation when the enhancement is unavailable.
  form.noValidate = true;
  required.forEach(field => {
    field.addEventListener('blur', () => { if (field.value || field.hasAttribute('aria-invalid')) validate(field); });
    field.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') validate(field); });
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    feedback.hidden = true;
    const invalid = required.filter(field => !validate(field));
    if (invalid.length) { invalid[0].focus(); return; }
    sending = true;
    submit.disabled = true;
    label.textContent = 'Enviando…';
    status.textContent = 'Estamos enviando tu consulta.';
    form.setAttribute('aria-busy', 'true');
    const reset = () => {
      sending = false; submit.disabled = false; label.textContent = 'Enviar consulta';
      status.textContent = ''; form.removeAttribute('aria-busy');
    };
    try {
      if (staging) throw new Error('staging-preview');
      if (import.meta.env.DEV || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
        throw new Error('local-preview');
      }
      const body = new URLSearchParams();
      new FormData(form).forEach((value, key) => { if (typeof value === 'string') body.append(key, value); });
      const response = await fetch('/', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error('server-rejected');
      // A successful HTTP response is not proof of verified delivery: Netlify also filters spam.
      window.location.assign(form.action);
    } catch (error) {
      reset();
      feedback.textContent = error instanceof Error && error.message === 'staging-preview'
        ? 'Entorno de prueba: el formulario no envía consultas. Para escribirnos, usá hola@suplio.ar.'
        : error instanceof Error && error.message === 'local-preview'
        ? 'Esta vista local no procesa envíos. Probá el formulario después de publicar en Netlify o escribinos a hola@suplio.ar.'
        : error instanceof Error && (error.name === 'TimeoutError' || error.name === 'TypeError')
          ? 'No pudimos confirmar el envío. Tus datos siguen acá. Para evitar repetir la consulta, podés escribirnos a hola@suplio.ar antes de reintentar.'
          : 'No se pudo enviar tu consulta. Tus datos siguen acá; podés reintentar o escribirnos a hola@suplio.ar.';
      feedback.hidden = false; feedback.focus();
    }
  });
  // Browsers can restore a disabled submit button through the back/forward cache.
  window.addEventListener('pageshow', event => {
    if (event.persisted) { sending = false; submit.disabled = false; label.textContent = 'Enviar consulta'; status.textContent = ''; form.removeAttribute('aria-busy'); }
  });
}
