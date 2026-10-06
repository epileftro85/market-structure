// UI translations (Spanish / English). Our own dictionary, no libraries.
//
// Language: cookie `ms_lang` (ES/EN button in the bar) or, if absent, the one set by the server
// (`lang` in server/config.js, APP_LANG=en npm start). Spanish if nothing answers.
// Switching language reloads the page: state lives in the URL, so nothing is lost.
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

/** Translated text. `{x}` in the text is replaced by vars.x. If the key is missing, falls back to Spanish and then to the key. */
export function t(key, vars) {
  const s = DICTS[LANG][key] ?? es[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

export function setLang(lang) {
  if (!LANGS.includes(lang) || lang === LANG) return;
  document.cookie = `${COOKIE}=${lang}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
  location.reload();
}

/** Translates the static HTML: data-i18n (text), data-i18n-title, data-i18n-placeholder, data-i18n-aria-label. */
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
