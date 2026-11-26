import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * Registro único de decisiones (docs/strategy/DECISIONS_REGISTER.md). Evita que una decisión abierta en una
 * especificación se pierda: cada identificador de las especificaciones debe figurar en el registro, con quién decide,
 * ola y qué desbloquea, y no puede marcarse como resuelta sin referencia a un acta.
 */
const DIR = new URL('../docs/strategy/', import.meta.url);
const leer = (f) => readFileSync(new URL(f, DIR), 'utf8');
const registro = leer('DECISIONS_REGISTER.md');
const filas = [...registro.matchAll(/^\| (D-(?:G|E|Q)?\d+) \|(.+)\|\s*$/gm)].map((m) => {
  const celdas = m[2].split('|').map((c) => c.trim());
  return { id: m[1], decision: celdas[0], quien: celdas[1], estado: celdas[2], ola: celdas[3], desbloquea: celdas[4], bruto: m[0] };
});
const idsDe = (doc) => [...new Set([...leer(doc).matchAll(/^\| (D-(?:E|Q)?\d+) \|/gm)].map((m) => m[1]))];

test('Toda decisión abierta en las especificaciones figura en el registro único', () => {
  const origen = { 'LA_TAR_CLINICAL_SPEC.md': 12, 'EVIDENCE_TRIANGULATION_SPEC.md': 13, 'QUESTIONNAIRE_SPEC.md': 11 };
  const enRegistro = new Set(filas.map((f) => f.id));
  for (const [doc, n] of Object.entries(origen)) {
    const ids = idsDe(doc);
    assert.equal(ids.length, n, `${doc}: se esperaban ${n} decisiones`);
    for (const id of ids) assert.ok(enRegistro.has(id), `${id} (${doc}) no figura en el registro`);
  }
});

test('Cada fila del registro tiene responsable, estado válido, ola entre 0 y 4 y qué desbloquea; los identificadores no se repiten', () => {
  assert.equal(filas.length, 53);
  assert.equal(new Set(filas.map((f) => f.id)).size, filas.length);
  const porBloque = (p) => filas.filter((f) => p.test(f.id)).length;
  assert.deepEqual([porBloque(/^D-G\d+$/), porBloque(/^D-\d+$/), porBloque(/^D-E\d+$/), porBloque(/^D-Q\d+$/)], [17, 12, 13, 11]);
  for (const f of filas) {
    assert.ok(f.decision.length > 15, `${f.id}: sin descripción`);
    assert.ok(f.quien.length > 2, `${f.id}: sin responsable`);
    assert.ok(['Abierta', 'Resuelta'].includes(f.estado), `${f.id}: estado ${f.estado}`);
    assert.ok(/^[0-4]$/.test(f.ola), `${f.id}: ola ${f.ola}`);
    assert.ok(f.desbloquea.length > 2, `${f.id}: no dice qué desbloquea`);
  }
});

test('Una decisión no puede darse por resuelta sin referencia a un acta', () => {
  for (const f of filas.filter((x) => x.estado === 'Resuelta')) assert.match(f.bruto, /ACTA-[A-Z0-9-]+/, `${f.id}: resuelta sin acta`);
});

test('Los identificadores D-xx que citan los demás documentos existen en el registro', () => {
  const enRegistro = new Set(filas.map((f) => f.id));
  for (const doc of readdirSync(DIR).filter((f) => f.endsWith('.md') && f !== 'DECISIONS_REGISTER.md')) {
    for (const [, id] of leer(doc).matchAll(/\b(D-(?:G|E|Q)?\d{1,2})\b/g)) {
      // D-01… de LA-TAR y D-E/D-Q/D-G son identificadores del registro; otros códigos con la misma forma no existen en estos documentos.
      assert.ok(enRegistro.has(id.replace(/^D-(\d)$/, 'D-0$1')) || enRegistro.has(id), `${doc} cita ${id}, que no está en el registro`);
    }
  }
});
