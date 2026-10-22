// Public build-time configuration. Never put credentials here or in PUBLIC_* variables.
// Suplio's public contact number. An explicit empty environment value hides WhatsApp.
const configuredPhone = (import.meta.env.PUBLIC_WHATSAPP_NUMBER ?? '5491165439927').trim();
const phone = configuredPhone.replace(/[\s()+-]/g, '');
export const whatsappMessage = 'Hola, ¿cómo están? Me gustaría consultarles por un proyecto para mi empresa.';
export const whatsappUrl = /^[1-9]\d{7,14}$/.test(phone)
  ? `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`
  : null;
