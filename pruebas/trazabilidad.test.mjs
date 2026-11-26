import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

/**
 * Matriz de trazabilidad (docs/strategy/TRACEABILITY_MATRIX.md). Evita que se pudra: cada módulo y cada prueba deben
 * figurar en ella, cada referencia debe existir y una capacidad «implementada» no puede carecer de módulo y de prueba.
 */
const RAIZ = new URL('../', import.meta.url);
const leer = (f) => readFileSync(new URL(f, RAIZ), 'utf8');
const matriz = leer('docs/strategy/TRACEABILITY_MATRIX.md');
const filas = [...matriz.matchAll(/^\| (CAP-\d{2}) \|(.+)\|\s*$/gm)].map((m) => {
  const c = m[2].split('|').map((x) => x.trim());
  const rutas = (t) => [...t.matchAll(/`([^`]+)`/g)].map((x) => x[1]);
  return { id: m[1], capacidad: c[0], estado: c[1], modulos: rutas(c[2]), pruebas: rutas(c[3]), riesgos: c[4].match(/R\d{2}/g) || [], backlog: c[5].match(/\b[ABC]\d{2}\b/g) || [] };
});
const ESTADOS = ['IMPLEMENTADO', 'PARCIAL', 'SIMULADO', 'ESPECIFICADO', 'PENDIENTE', 'AUSENTE'];
const estadoBase = (f) => f.estado.split(/[ (]/)[0];
const registroRiesgos = new Set([...leer('docs/strategy/RISK_REGISTER.md').matchAll(/^\| (R\d{2}) \|/gm)].map((m) => m[1]));
const backlog = new Set([...leer('docs/strategy/PRIORITIZED_BACKLOG.md').matchAll(/^### ([ABC]\d{2}) ·/gm)].map((m) => m[1]));
const listar = (dir, f) => readdirSync(new URL(dir, RAIZ)).filter(f);
const todasRutas = filas.flatMap((f) => [...f.modulos, ...f.pruebas]);

test('La matriz tiene 33 capacidades con identificadores únicos y estados del vocabulario', () => {
  assert.equal(filas.length, 33);
  assert.equal(new Set(filas.map((f) => f.id)).size, 33);
  for (const f of filas) assert.ok(ESTADOS.includes(estadoBase(f)), `${f.id}: estado ${f.estado}`);
});

test('Toda referencia a un fichero, riesgo o actuación del backlog existe', () => {
  for (const f of filas) {
    for (const r of [...f.modulos, ...f.pruebas]) assert.ok(existsSync(new URL(r, RAIZ)), `${f.id}: no existe ${r}`);
    for (const r of f.riesgos) assert.ok(registroRiesgos.has(r), `${f.id}: el riesgo ${r} no está en el registro`);
    for (const b of f.backlog) assert.ok(backlog.has(b), `${f.id}: la actuación ${b} no está en el backlog`);
  }
});

test('Ningún módulo de src/ ni prueba queda fuera de la matriz', () => {
  const rutas = new Set(todasRutas);
  for (const m of listar('src/', (f) => f.endsWith('.js'))) assert.ok(rutas.has('src/' + m), `src/${m} no figura en la matriz`);
  for (const t of listar('pruebas/', (f) => f.endsWith('.mjs'))) assert.ok(rutas.has('pruebas/' + t), `pruebas/${t} no figura en la matriz`);
});

test('Una capacidad implementada o parcial tiene módulo y prueba; una pendiente no finge tenerlos; el resto cita su evidencia', () => {
  for (const f of filas) {
    const e = estadoBase(f);
    if (['IMPLEMENTADO', 'PARCIAL'].includes(e)) {
      assert.ok(f.modulos.some((r) => r.startsWith('src/') || r.startsWith('docs/') || r.startsWith('datos/') || r.startsWith('.github/')), `${f.id}: sin módulo`);
      assert.ok(f.pruebas.length > 0, `${f.id}: ${e} sin ninguna prueba`);
    }
    if (e === 'PENDIENTE' && f.id !== 'CAP-18' && f.id !== 'CAP-24') assert.deepEqual([f.modulos, f.pruebas], [[], []], `${f.id}: pendiente pero cita evidencia`);
    if (e === 'ESPECIFICADO') assert.ok(f.modulos.length && f.pruebas.length && f.backlog.length, `${f.id}`);
    assert.ok(f.backlog.length > 0, `${f.id}: sin actuación del backlog asociada`);
  }
});

test('La matriz distingue lo ESPECIFICADO de lo IMPLEMENTADO: ningún módulo de especificación figura como implementado sin su motor', () => {
  const especificados = filas.filter((f) => estadoBase(f) === 'ESPECIFICADO');
  assert.deepEqual(especificados.map((f) => f.id).sort(), ['CAP-08', 'CAP-11']);
  for (const f of filas.filter((x) => estadoBase(x) === 'IMPLEMENTADO'))
    for (const m of f.modulos) assert.ok(!/esquema-(evidencia|cuestionario)\.js$/.test(m), `${f.id} presenta como implementado un módulo solo especificado`);
});
