import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { baseCompleta } from './fixtures-base-completa.js';

/**
 * A10 · Auditoría dinámica de `innerHTML` (docs/strategy/THREAT_MODEL.md §5bis).
 * Para cada GRUPO de campos de texto de la base (p. ej. `actuacion.texto`) se envenenan solo sus valores con una carga
 * que, si se interpretara como HTML, crearía un elemento <i data-canary="GRUPO">; se recorren las vistas y ventanas que
 * pueden mostrarlo y se registra el resultado. Cada grupo va aislado porque un campo envenenado que el cálculo usa
 * (fecha, TAR, estado…) hace fallar el cálculo antes de pintar y ocultaría los demás.
 *
 * Resultado por grupo: INYECTADO (se interpretó como HTML: fallo) · ESCAPADO (se mostró como texto) · BLOQUEADO (el
 * cálculo rechazó el valor antes de pintarlo) · NO ALCANZADO (ningún recorrido lo mostró).
 * No demuestra ausencia de XSS: solo para los datos de esta base y los recorridos de este guion. No usa onerror
 * (la CSP lo bloquearía): mide el escape, no la CSP.
 */
const URL_BASE = process.env.URL_BASE || 'http://127.0.0.1:5173/';
const KEY = 'vihconectados.demo.v1';
const SIMULTANEOS = Number(process.env.XSS_SIMULTANEOS || 6);
const carga = (g) => `'"><i data-canary="${g}"></i>`;
const nombreGrupo = (ruta) => ruta.join('.');

/** Recorre las cadenas de la base; `fn(grupo, valor, escribir, paciente)`. El tipo de evento no se toca. */
function hojas(base, fn) {
  const visitar = (v, ruta, escribir, p) => {
    if (typeof v === 'string') fn(nombreGrupo(ruta), v, escribir, p);
    else if (Array.isArray(v)) v.forEach((x, i) => visitar(x, [...ruta.slice(0, -1), ruta.at(-1) + '[]'], (n) => { v[i] = n; }, p));
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) if (k !== 'tipo') visitar(v[k], [...ruta, k], (n) => { v[k] = n; }, p);
  };
  for (const p of base.pacientes) {
    visitar(p.id, ['paciente', 'id'], (n) => { p.id = n; }, p);
    for (const k of Object.keys(p)) if (k !== 'id' && k !== 'eventos') visitar(p[k], ['paciente', k], (n) => { p[k] = n; }, p);
    for (const e of p.eventos) for (const k of Object.keys(e)) if (k !== 'tipo') visitar(e[k], [e.tipo, k], (n) => { e[k] = n; }, p);
  }
}
const base = baseCompleta();
const duenos = new Map(); // grupo -> ids de paciente (limpios) que lo contienen
hojas(structuredClone(base), (g, v, _e, p) => { if (!duenos.has(g)) duenos.set(g, new Set()); duenos.get(g).add(p.id); });
const grupos = [...duenos.keys()];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const ACCIONES = ['corregir-dispensacion', 'gestionar-senal', 'seguimiento-consulta', 'dispensacion-manual', 'csv', 'visita', 'tar', 'nivel', 'ver-informe', 'reglas', 'consulta'];
const LISTAS = ['#pacientes', '#panel/cohorte', '#panel/poblacional', '#seguimiento', '#comunicaciones', '#modelo'];

async function probar(grupo) {
  const db = structuredClone(base);
  hojas(db, (g, v, escribir) => { if (g === grupo) escribir(v + carga(g)); });
  const ctx = await browser.newContext({ locale: 'es-ES', viewport: { width: 1440, height: 1000 } }), page = await ctx.newPage();
  const r = { inyectado: false, escapado: false, errores: [] };
  page.on('pageerror', (e) => r.errores.push(e.message));
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [KEY, JSON.stringify(db)]);
  const recoger = async () => {
    const x = await page.evaluate((g) => ({
      el: document.querySelectorAll(`[data-canary="${g}"]`).length,
      tx: (document.body.textContent + ' ' + [...document.querySelectorAll('input,textarea')].map((i) => i.value).join(' ')).includes(`data-canary="${g}"`),
    }), grupo);
    if (x.el) r.inyectado = true; if (x.tx) r.escapado = true;
  };
  const ir = async (hash) => { await page.goto(URL_BASE + hash); await page.waitForTimeout(200); await recoger(); };
  const modales = async () => {
    for (const a of ACCIONES) {
      const n = Math.min(await page.locator(`[data-action="${a}"]`).count(), 2);
      for (let i = 0; i < n; i++) {
        try { await page.locator(`[data-action="${a}"]`).nth(i).click({ timeout: 1200 }); await page.waitForTimeout(100); await recoger(); await page.keyboard.press('Escape'); } catch { /* no aplicable en esta vista */ }
      }
    }
  };
  try {
    for (const h of LISTAS) await ir(h);
    if (grupo !== 'paciente.id') for (const id of [...duenos.get(grupo)].slice(0, 1)) {
      await ir(`#panel/paciente/${id}`); await ir(`#panel/cmo/${id}`); await ir(`#caso/${id}`);
      for (const t of ['resumen', 'consulta', 'historia', 'adherencia', 'experiencia', 'intervenciones', 'informes']) {
        try { await page.locator(`button[data-tab="${t}"]`).click({ timeout: 1200 }); await page.waitForTimeout(100); await recoger(); if (['resumen', 'consulta', 'historia', 'informes'].includes(t)) await modales(); } catch { /* pestaña ausente */ }
      }
    }
  } finally { await ctx.close(); }
  return r;
}

try {
  const resultado = {}, cola = [...grupos];
  await Promise.all(Array.from({ length: SIMULTANEOS }, async () => {
    for (let g = cola.shift(); g !== undefined; g = cola.shift()) {
      const r = await probar(g);
      resultado[g] = r.inyectado ? 'INYECTADO' : r.escapado ? 'ESCAPADO' : r.errores.length ? 'BLOQUEADO' : 'NO ALCANZADO';
    }
  }));
  const por = (e) => Object.keys(resultado).filter((g) => resultado[g] === e).sort();
  console.log(JSON.stringify({ grupos: grupos.length, inyectados: por('INYECTADO'), escapados: por('ESCAPADO').length, bloqueados: por('BLOQUEADO').length, noAlcanzados: por('NO ALCANZADO').length }));
  if (process.env.XSS_DETALLE) for (const e of ['BLOQUEADO', 'NO ALCANZADO', 'ESCAPADO']) console.log(`${e}:\n  ` + por(e).join('\n  '));
  assert.deepEqual(por('INYECTADO'), [], `Campos que se interpretan como HTML: ${por('INYECTADO').join(', ')}`);
  console.log('XSS canario: ningún campo envenenado se interpreta como HTML en los recorridos del guion.');
} finally { await browser.close(); }
