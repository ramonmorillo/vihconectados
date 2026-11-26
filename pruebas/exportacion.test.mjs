import test from 'node:test';
import assert from 'node:assert/strict';
import { canonico, sha256, empaquetar, verificar, informeMinimo, ESQUEMA_EXPORTACION } from '../src/exportacion.js';
import { informe, informePaciente } from '../src/informes.js';
import { demo as crearDemo } from '../src/demo.js';

/**
 * A09 · Manifiesto y minimización de exportaciones. Valores esperados derivados a mano / vectores públicos de SHA-256
 * (FIPS 180-4): SHA-256("") y SHA-256("abc").
 */
const VACIO = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

test('SHA-256 reproduce los vectores de prueba estándar', async () => {
  assert.equal(await sha256(''), VACIO);
  assert.equal(await sha256('abc'), ABC);
});

test('La serialización canónica ordena las claves, conserva el orden de las listas y es independiente del orden de inserción', () => {
  assert.equal(canonico({ b: 1, a: [2, { d: 1, c: 2 }] }), '{"a":[2,{"c":2,"d":1}],"b":1}');
  assert.equal(canonico({ x: 1, y: 2 }), canonico({ y: 2, x: 1 }));
  assert.equal(canonico({ a: undefined, b: 1 }), '{"b":1}', 'una clave undefined equivale a ausente (como al guardar)');
  assert.equal(canonico([3, 1, 2]), '[3,1,2]');
  assert.throws(() => canonico({ a: NaN }), /no finito/i);
});

test('El paquete lleva esquema, versión, fecha, modo, aviso y el hash SHA-256 de su contenido', async () => {
  const p = await empaquetar({ tipo: 'informe', contenido: { a: 1 }, exportado: '2026-01-02', version: '0.3.0', modo: 'completo' });
  assert.equal(p.esquema, ESQUEMA_EXPORTACION);
  assert.deepEqual([p.tipo, p.version, p.exportado, p.modo], ['informe', '0.3.0', '2026-01-02', 'completo']);
  assert.equal(p.contenido_hash, 'sha256:' + await sha256('{"a":1}'));
  assert.deepEqual(p.contenido, { a: 1 });
  assert.ok(p.aviso.length > 20);
});

test('El empaquetado rechaza modos y tipos no previstos y fechas inválidas', async () => {
  const ok = { tipo: 'informe', contenido: {}, exportado: '2026-01-02', version: '1', modo: 'completo' };
  await assert.rejects(() => empaquetar({ ...ok, modo: 'otro' }), /modo/i);
  await assert.rejects(() => empaquetar({ ...ok, tipo: 'otro' }), /tipo/i);
  await assert.rejects(() => empaquetar({ ...ok, exportado: '2026-13-40' }), /fecha/i);
});

test('verificar acepta un paquete íntegro y detecta cualquier alteración del contenido', async () => {
  const p = await empaquetar({ tipo: 'base', contenido: { pacientes: [{ id: 'P1', n: 1 }] }, exportado: '2026-01-02', version: '1', modo: 'completo' });
  assert.deepEqual(await verificar(JSON.parse(JSON.stringify(p))), { ok: true });
  const alterado = JSON.parse(JSON.stringify(p));
  alterado.contenido.pacientes[0].n = 2;
  const r = await verificar(alterado);
  assert.equal(r.ok, false);
  assert.match(r.motivo, /hash/i);
});

test('verificar rechaza esquemas ajenos, hashes malformados y entradas que no son paquetes, sin lanzar', async () => {
  const p = await empaquetar({ tipo: 'base', contenido: {}, exportado: '2026-01-02', version: '1', modo: 'completo' });
  for (const malo of [null, 3, [], {}, { ...p, esquema: 'otro@1' }, { ...p, contenido_hash: 'md5:abc' }, { ...p, contenido_hash: undefined }, { ...p, contenido: undefined }]) {
    const r = await verificar(malo);
    assert.equal(r.ok, false);
    assert.ok(r.motivo);
  }
});

test('Un hash con prefijo correcto pero longitud o caracteres inválidos se rechaza como malformado, no como discrepancia', async () => {
  const p = await empaquetar({ tipo: 'base', contenido: {}, exportado: '2026-01-02', version: '1', modo: 'completo' });
  for (const h of ['sha256:abc', 'sha256:' + 'G'.repeat(64), 'sha256:' + p.contenido_hash.slice(7).toUpperCase()])
    assert.match((await verificar({ ...p, contenido_hash: h })).motivo, /malformado/i, h);
});

test('El hash no depende del orden de las claves al volver a leer el fichero', async () => {
  const p = await empaquetar({ tipo: 'base', contenido: { z: 1, a: { y: 2, b: 3 } }, exportado: '2026-01-02', version: '1', modo: 'completo' });
  const invertido = { ...p, contenido: { a: { b: 3, y: 2 }, z: 1 } };
  assert.equal((await verificar(invertido)).ok, true);
});

const caso = () => {
  const db = crearDemo();
  const p = db.pacientes.find((x) => x.eventos.length > 3);
  return { p, fin: '2025-12-31' };
};

test('Modo mínimo: el informe pierde exactamente la lista de eventos y declara cuántos omite', () => {
  const { p, fin } = caso();
  const i = informe(p, fin);
  assert.ok(i.eventos.length > 0, 'el informe completo embebe los eventos');
  const m = informeMinimo(i);
  assert.equal('eventos' in m, false);
  assert.equal(m.eventos_omitidos, i.eventos.length);
  const sin = (o) => Object.keys(o).filter((k) => k !== 'eventos' && k !== 'eventos_omitidos').sort();
  assert.deepEqual(sin(m), sin(i), 'no se pierde ningún otro campo');
  for (const k of sin(i)) assert.deepEqual(m[k], i[k], `el campo ${k} no debe alterarse`);
  assert.ok(JSON.stringify(m).length < JSON.stringify(i).length);
});

test('Modo mínimo: no contiene ningún identificador de evento ni las filas de dispensación del historial', () => {
  const { p, fin } = caso();
  const i = informe(p, fin);
  const m = JSON.stringify(informeMinimo(i));
  const ids = i.eventos.map((e) => e.id).filter(Boolean);
  assert.ok(ids.length > 0);
  const filtrados = ids.filter((id) => m.includes(`"${id}"`));
  // Las señales pueden citar una referencia a un evento concreto (p. ej. una dispensación): se informa de ellas, no se ocultan.
  for (const id of filtrados) assert.ok(i.alertas.some((a) => JSON.stringify(a).includes(id)), `${id} aparece fuera de las señales`);
  assert.doesNotMatch(m, /"filas"/);
});

test('Modo mínimo no modifica el informe original (copia, no mutación)', () => {
  const { p, fin } = caso();
  const i = informe(p, fin);
  const antes = JSON.stringify(i);
  informeMinimo(i);
  assert.equal(JSON.stringify(i), antes);
});

test('Modo mínimo conserva el plan de la hoja del paciente (es su contenido) y no embebe el historial', () => {
  const { p, fin } = caso();
  const h = informePaciente(p, fin, { instrucciones: 'Texto sintético revisado.', revisado: true });
  const m = informeMinimo(h);
  assert.equal(m.plan.instrucciones, 'Texto sintético revisado.');
  assert.equal('eventos' in m, false);
});

test('Los avisos de cada modo son distintos y el mínimo advierte de que no permite reproducir el cálculo', async () => {
  const base = { tipo: 'informe', contenido: {}, exportado: '2026-01-02', version: '1' };
  const c = await empaquetar({ ...base, modo: 'completo' }), m = await empaquetar({ ...base, modo: 'minimo' });
  assert.notEqual(c.aviso, m.aviso);
  assert.match(m.aviso, /no permite reproducir/i);
  assert.match(c.aviso, /historial completo/i);
});

test('El módulo de exportación no promete autenticidad: el aviso aclara que el hash no es una firma', async () => {
  const p = await empaquetar({ tipo: 'base', contenido: {}, exportado: '2026-01-02', version: '1', modo: 'completo' });
  assert.match(p.aviso, /no es una firma|no acredita autor/i);
});
