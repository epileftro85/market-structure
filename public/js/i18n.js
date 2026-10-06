// Traducciones de la interfaz (español / inglés). Diccionario propio, sin librerías.
//
// Idioma: cookie `ms_lang` (botón ES/EN de la barra) o, si no hay, el que define el servidor
// (`lang` en server/config.js, APP_LANG=en npm start). Español si nada responde.
// Cambiar de idioma recarga la página: el estado vive en la URL, así que no se pierde nada.
import es from './locales/es.js';
import en from './locales/en.js';

export const LANGS = ['es', 'en'];
export const DICTS = { es, en };
const COOKIE = 'ms_lang';

function readCookie() {
  try {
    const row = document.cookie.split('; ').find((r) => r.startsWith(COOKIE + '='));
    const v = row ? decodeURIComponent(row.slice(COOKIE.length + 1)) : '';
    return LANGS.includes(v) ? v : null;
  } catch { return null; }
}

async function serverDefault() {
  try {
    const res = await fetch('/api/status');
    const { lang } = await res.json();
    return LANGS.includes(lang) ? lang : 'es';
  } catch { return 'es'; }
}

export const LANG = readCookie() ?? (await serverDefault());
document.documentElement.lang = LANG;

/** Texto traducido. `{x}` en el texto se reemplaza por vars.x. Si falta la clave, cae a español y luego a la clave. */
export function t(key, vars) {
  const s = DICTS[LANG][key] ?? es[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

export function setLang(lang) {
  if (!LANGS.includes(lang) || lang === LANG) return;
  document.cookie = `${COOKIE}=${lang}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
  location.reload();
}

/** Traduce el HTML estático: data-i18n (texto), data-i18n-title, data-i18n-placeholder, data-i18n-aria-label. */
export function translateDom(root = document) {
  for (const [attr, prop] of [['i18n', null], ['i18nTitle', 'title'], ['i18nPlaceholder', 'placeholder'], ['i18nAriaLabel', 'aria-label']]) {
    const sel = `[data-${attr.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}]`;
    root.querySelectorAll(sel).forEach((n) => {
      const v = t(n.dataset[attr]);
      if (!prop) n.textContent = v;
      else n.setAttribute(prop, v);
    });
  }
}
