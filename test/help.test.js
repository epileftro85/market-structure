import test from 'node:test';
import assert from 'node:assert/strict';
import { HELP as HELP_ES, GROUPS, GROUP_TITLES, DIAGRAMS, helpKeyFor } from '../public/js/help.js';
import { HELP as HELP_EN } from '../public/js/help.en.js';
import { EXAMPLES as EXAMPLES_ES } from '../public/js/examples.js';
import { EXAMPLES as EXAMPLES_EN } from '../public/js/examples.en.js';
import es from '../public/js/locales/es.js';
import en from '../public/js/locales/en.js';

const CONTENT = { es: { HELP: HELP_ES, EXAMPLES: EXAMPLES_ES }, en: { HELP: HELP_EN, EXAMPLES: EXAMPLES_EN } };

// Menu indicator keys (must match IND_KEYS in app.js)
const IND_KEYS = ['fvg', 'ob', 'eq', 'sweep', 'ext', 'htf', 'ema50', 'ema200', 'vwap', 'vol'];

test('diagrams are valid SVG without scripts', () => {
  for (const [k, draw] of Object.entries(DIAGRAMS)) {
    for (const lang of ['es', 'en']) {
      const out = draw(lang);
      assert.ok(out.startsWith('<svg') && out.endsWith('</svg>'), k);
      assert.ok(!/<script|onerror|onload/i.test(out), k);
      assert.ok(!out.includes('NaN') && !out.includes('undefined'), `${k}: invalid coordinates`);
    }
  }
});

for (const [lang, { HELP, EXAMPLES }] of Object.entries(CONTENT)) {
  test(`[${lang}] every menu indicator has its guide entry`, () => {
    const keys = new Set(HELP.map((h) => h.key));
    for (const k of IND_KEYS) assert.ok(keys.has(helpKeyFor(k)), `missing guide for ${k}`);
    for (const k of ['swings', 'bos', 'choch']) assert.ok(keys.has(k), `missing guide for ${k}`);
  });

  test(`[${lang}] entries are complete and well formed`, () => {
    const seen = new Set();
    for (const h of HELP) {
      assert.ok(!seen.has(h.key), `duplicate key ${h.key}`);
      seen.add(h.key);
      assert.ok(GROUPS.includes(h.group), `${h.key}: unknown group ${h.group}`);
      assert.match(h.color, /^#[0-9a-f]{6}$/i);
      assert.ok(typeof h.title === 'string' && h.title.length >= 3, `${h.key}.title`);
      for (const f of ['what', 'practice', 'caveat']) assert.ok(typeof h[f] === 'string' && h[f].length > 20, `${h.key}.${f}`);
      for (const f of ['read', 'rules']) assert.ok(Array.isArray(h[f]) && h[f].length > 0, `${h.key}.${f}`);
      if (h.diagram) assert.ok(typeof DIAGRAMS[h.diagram] === 'function', `${h.key}: missing diagram`);
    }
  });

  test(`[${lang}] guide toggles point to valid keys`, () => {
    for (const h of HELP) {
      for (const t of h.toggles ?? []) assert.ok([...IND_KEYS, '@sw', '@st'].includes(t.k), `${h.key}: toggle ${t.k}`);
    }
  });

  test(`[${lang}] every guide entry has a complete example`, () => {
    for (const h of HELP) {
      const ex = EXAMPLES[h.key];
      assert.ok(ex, `${h.key}: missing example`);
      assert.ok(ex.title && ex.scenario.length > 40, `${h.key}: title/scenario`);
      assert.ok(ex.outcomes?.length >= 2, `${h.key}: needs at least 2 scenarios`);
      for (const o of ex.outcomes) for (const f of ['title', 'when', 'means', 'check']) assert.ok(o[f]?.length > 5, `${h.key}.outcomes.${f}`);
      assert.ok(ex.measure?.length >= 2, `${h.key}: what to measure`);
      assert.ok(ex.mistakes?.length >= 2, `${h.key}: common mistakes`);
      for (const d of ex.diagrams ?? []) {
        assert.ok(typeof DIAGRAMS[d.key] === 'function', `${h.key}: diagram ${d.key} does not exist`);
        assert.ok(d.caption?.length > 10, `${h.key}: caption for ${d.key}`);
      }
    }
    for (const k of Object.keys(EXAMPLES)) assert.ok(HELP.some((h) => h.key === k), `orphan example ${k}`);
  });

  test(`[${lang}] EQH: in-depth example with the 4 diagrams and the key scenarios`, () => {
    const eq = EXAMPLES.eq;
    assert.deepEqual(eq.diagrams.map((d) => d.key), ['eq_form', 'eq_sweep', 'eq_break', 'eq_measure']);
    assert.ok(eq.outcomes.length >= 4 && eq.measure.length >= 6 && eq.steps.length >= 4);
  });
}

test('i18n: UI dictionaries have the same keys', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
  for (const [k, v] of Object.entries(en)) {
    assert.ok(typeof v === 'string' && v.length > 0, `en.${k} empty`);
    const vars = (x) => (x.match(/\{\w+\}/g) ?? []).sort().join();
    assert.equal(vars(v), vars(es[k]), `${k}: variables differ between languages`);
  }
});

test('i18n: the English guide has the same shape as the Spanish one', () => {
  assert.deepEqual(HELP_EN.map((h) => h.key), HELP_ES.map((h) => h.key));
  HELP_ES.forEach((h, i) => {
    const e = HELP_EN[i];
    for (const f of ['group', 'color', 'diagram']) assert.equal(e[f], h[f], `${h.key}.${f}`);
    assert.deepEqual((e.toggles ?? []).map((x) => x.k), (h.toggles ?? []).map((x) => x.k), `${h.key}.toggles`);
    for (const f of ['read', 'rules']) assert.equal(e[f].length, h[f].length, `${h.key}.${f}`);
  });
  assert.deepEqual(Object.keys(EXAMPLES_EN), Object.keys(EXAMPLES_ES));
  for (const [k, ex] of Object.entries(EXAMPLES_ES)) {
    const e = EXAMPLES_EN[k];
    assert.deepEqual((e.diagrams ?? []).map((d) => d.key), (ex.diagrams ?? []).map((d) => d.key), `${k}.diagrams`);
    for (const f of ['steps', 'outcomes', 'measure', 'mistakes']) assert.equal(e[f]?.length, ex[f]?.length, `${k}.${f}`);
  }
  for (const lang of ['es', 'en']) for (const g of GROUPS) assert.ok(GROUP_TITLES[lang][g], `${lang}: group title ${g}`);
});
