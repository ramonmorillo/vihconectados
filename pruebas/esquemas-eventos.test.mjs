import test from 'node:test';
import assert from 'node:assert/strict';
import { ESQUEMAS, TIPOS_EVENTO, validarEvento, camposRequeridos } from '../src/esquemas-eventos.js';
import { FORMATO_ACTUAL, FORMATO_ANTERIOR, migrarBase, diagnosticarBase } from '../src/migraciones.js';
import { RepositorioDemo, anexar, crearPaciente, vacio } from '../src/almacen.js';
import { cobertura, alertas, importarCSV, prepararDispensacionManual, REGLAS } from '../src/motor.js';
import { planificarDispensaciones } from '../src/dispensaciones.js';
import { evaluarSenales } from '../src/senales.js';
import { informe, informePaciente } from '../src/informes.js';
import { registrarConsulta, registrarSeguimiento } from '../src/comandos-consulta.js';
import { PROBLEMAS, RESPONSABLES } from '../src/consulta.js';
import { normalizarFicha, modalidadTar } from '../src/cima.js';
import { demo } from '../src/demo.js';
import { fichaPrueba } from './fixtures-cima.js';
import { baseCompleta, EXP } from './fixtures-base-completa.js';

/** A08 · Esquemas cerrados por evento, lista blanca y migraciones (docs/ESQUEMAS_EVENTOS.md). */
const MUESTRAS = {
  nivel: { tipo: 'nivel', fecha: '2026-01-01', nivel: '2' },
  tratamiento: { tipo: 'tratamiento', fecha: '2026-01-01', tar: 'TAR_A' },
  visita: { tipo: 'visita', fecha: '2026-01-01', experiencia: EXP },
  consulta: { tipo: 'consulta', fecha: '2026-01-01', problema: 'p', objetivo: 'o', responsable: 'Farmacia Hospitalaria', revision: '2026-02-01', revisado: true, visita: null, evaluacion: null, actuacion: 'a', reglas: {} },
  seguimiento_consulta: { tipo: 'seguimiento_consulta', consulta: 'c', fecha: '2026-01-01', estado: 'en_curso', resultado: 'Pendiente de evaluar', observaciones: 'o', responsable: 'Farmacia Hospitalaria', revision: '2026-03-01' },
  gestion_senal: { tipo: 'gestion_senal', fecha: '2026-01-01', regla: 'cobertura_demo', evidencia: '{}', estado: 'revisada', motivo: 'm', actuacion: '', reglas: {} },
  correccion_dispensacion: { tipo: 'correccion_dispensacion', referencia: 'a:0', motivo: 'm', sustitucion: null, coincidencia_confirmada: false },
  importacion: { tipo: 'importacion', fuente: 'CSV', filas: [], duplicadas: [] },
  evaluacion_adherencia: { tipo: 'evaluacion_adherencia', fecha: '2026-01-31', periodo_inicio: '2026-01-01', periodo_fin: '2026-01-31', metodo: 'Autoinforme', resultado: 'No concluyente', porcentaje: null },
  actuacion: { tipo: 'actuacion', fecha: '2026-01-01', texto: 't', estado: 'pendiente', nivel: '1', fuente: 'f' },
  estado_actuacion: { tipo: 'estado_actuacion', fecha: '2026-01-01', actuacion: 'a', estado: 'realizada' },
  estado_comunicacion: { tipo: 'estado_comunicacion', fecha: '2026-01-01', informe: 'i', estado: 'comunicado' },
  informe: { tipo: 'informe', fecha: '2026-01-01', formato: 'vihconectados/informe@1', paciente: 'DEMO-001', cobertura: {}, alertas: [] },
  informe_paciente: { tipo: 'informe_paciente', fecha: '2026-01-01', formato: 'vihconectados/informe-paciente@1', paciente: 'DEMO-001', cobertura: {}, alertas: [], plan: {}, recurso: null },
  revision_alertas: { tipo: 'revision_alertas', fecha: '2026-01-01', resultado: 'Requiere exploración' },
  configuracion: { tipo: 'configuracion', reglas: {} },
};

test('Esquemas: hay uno por cada tipo de evento que acepta anexar y cada uno tiene su muestra válida', () => {
  assert.deepEqual([...TIPOS_EVENTO].sort(), Object.keys(MUESTRAS).sort());
  assert.deepEqual(Object.keys(ESQUEMAS).sort(), Object.keys(MUESTRAS).sort());
  for (const [tipo, m] of Object.entries(MUESTRAS)) assert.doesNotThrow(() => validarEvento(m), tipo);
});

test('Esquemas cerrados: cualquier campo no previsto se rechaza en cada tipo', () => {
  for (const [tipo, m] of Object.entries(MUESTRAS))
    assert.throws(() => validarEvento({ ...m, extra: 1 }), /no permitido/, tipo);
});

test('Esquemas: cada campo obligatorio ausente se rechaza', () => {
  for (const [tipo, m] of Object.entries(MUESTRAS))
    for (const k of camposRequeridos(m)) {
      const e = { ...m }; delete e[k];
      assert.throws(() => validarEvento(e), /Falta/, `${tipo}.${k}`);
    }
});

test('Esquemas: tipos de dato incorrectos se rechazan; los valores y las fechas los siguen validando las reglas de negocio', () => {
  assert.throws(() => validarEvento({ ...MUESTRAS.nivel, nivel: 2 }), /no válido/);
  assert.throws(() => validarEvento({ ...MUESTRAS.consulta, revisado: 'sí' }), /no válido/);
  assert.throws(() => validarEvento({ ...MUESTRAS.evaluacion_adherencia, porcentaje: '50' }), /no válido/);
  assert.throws(() => validarEvento({ ...MUESTRAS.importacion, filas: 'x' }), /no válido/);
  assert.throws(() => validarEvento({ ...MUESTRAS.visita, experiencia: { ...EXP, nota: 'libre' } }), /no permitido/);
  assert.throws(() => validarEvento({ ...MUESTRAS.importacion, filas: [{ fecha: '2026-01-01', episodio: 'e', componente: 'A', dias: '30' }] }), /no válido/);
  assert.throws(() => validarEvento({ ...MUESTRAS.importacion, filas: [{ fecha: '2026-01-01', episodio: 'e', componente: 'A', dias: 30, dni: '1' }] }), /no permitido/);
  assert.doesNotThrow(() => validarEvento({ ...MUESTRAS.nivel, nivel: '9', fecha: '2026-02-30' }), 'valores y fechas: responsabilidad de la regla de negocio');
  assert.throws(() => validarEvento(null), /no válido/);
  assert.throws(() => validarEvento([]), /no válido/);
});

test('Tipos sin esquema se rechazan, con el mismo mensaje que antes', () => {
  assert.throws(() => validarEvento({ tipo: 'inventado' }), /Tipo de evento desconocido/);
  assert.throws(() => validarEvento({}), /Tipo de evento desconocido/);
  assert.throws(() => anexar(vacio(), 'DEMO-001', { tipo: 'inventado' }), /Caso inexistente|Tipo de evento desconocido/);
  const d = crearPaciente(vacio());
  assert.throws(() => anexar(d, 'DEMO-001', { tipo: 'inventado' }), /Tipo de evento desconocido/);
});

test('id y registrado son campos reservados: el cliente no puede fijar la identidad ni la fecha de registro', () => {
  const d = crearPaciente(vacio());
  assert.throws(() => anexar(d, 'DEMO-001', { tipo: 'nivel', nivel: '1', id: 'forjado' }), /reservado/);
  assert.throws(() => anexar(d, 'DEMO-001', { tipo: 'nivel', nivel: '1', registrado: '2000-01-01T00:00:00Z' }), /reservado/);
});

test('Regresión de la auditoría (F-12): una importación sin filas se rechaza y no inutiliza el cálculo', () => {
  const d = demo(), id = d.pacientes[0].id;
  assert.throws(() => anexar(d, id, { tipo: 'importacion', fuente: 'X' }), /Falta.*filas/);
  assert.doesNotThrow(() => cobertura(d.pacientes[0], '2026-11-08'));
});

test('Importación genérica: las filas se validan contra los episodios, igual que la importación conciliada', () => {
  const d = crearPaciente(vacio());
  const fila = { fecha: '2026-01-01', episodio: 'inexistente', componente: 'A', dias: 30 };
  const d2 = anexar(d, 'DEMO-001', { tipo: 'tratamiento', fecha: '2026-01-01', tar: 'TAR_A' });
  assert.throws(() => anexar(d2, 'DEMO-001', { tipo: 'importacion', fuente: 'X', filas: [fila], duplicadas: [] }), /incompatibles/);
});

test('Configuración: tiene un esquema mínimo y no acepta campos ajenos', () => {
  const d = anexar(crearPaciente(vacio()), 'DEMO-001', { tipo: 'configuracion', reglas: { ...REGLAS } });
  assert.equal(d.pacientes[0].eventos.at(-1).tipo, 'configuracion');
  assert.throws(() => anexar(d, 'DEMO-001', { tipo: 'configuracion', nombre: 'x' }), /no permitido/);
});



test('Todo lo que producen los flujos reales de la aplicación cumple los esquemas (los 16 tipos)', () => {
  const d = baseCompleta();
  const tipos = new Set(d.pacientes.flatMap((p) => p.eventos.map((e) => e.tipo)));
  for (const t of TIPOS_EVENTO) assert.ok(tipos.has(t), 'La base de la prueba no contiene ' + t);
  const dx = diagnosticarBase(d);
  assert.deepEqual(dx.no_conformes, [], JSON.stringify(dx.no_conformes.slice(0, 3)));
  assert.ok(dx.eventos > 40);
});

test('La cohorte de demostración y los casos recién creados son conformes', () => {
  assert.deepEqual(diagnosticarBase(demo()).no_conformes, []);
  assert.deepEqual(diagnosticarBase(crearPaciente(vacio(), '2')).no_conformes, []);
});

/* ---------- formato, migración y lectura ---------- */
const almacen = (inicial = {}) => {
  const m = new Map(Object.entries(inicial));
  return { m, storage: { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) } };
};
const comoV1 = (db) => { const x = structuredClone(db); x.formato = FORMATO_ANTERIOR; delete x.esquema_eventos; delete x.migracion; return x; };

test('Formato: una base nueva es del formato actual y se guarda y lee sin cambios', () => {
  assert.equal(vacio().formato, FORMATO_ACTUAL);
  const { storage } = almacen(), r = new RepositorioDemo(storage), d = demo();
  r.guardar(d);
  assert.deepEqual(r.leer(), d);
});

test('Migración v1 → v2: no se pierde ni cambia ningún evento ni informe (ida y vuelta con la cohorte demo y una base completa)', () => {
  for (const origen of [demo(), baseCompleta()]) {
    const v1 = comoV1(origen), raw = JSON.stringify(v1);
    const { m, storage } = almacen({ 'vihconectados.demo.v1': raw }), r = new RepositorioDemo(storage);
    const leida = r.leer();
    assert.equal(leida.formato, FORMATO_ACTUAL);
    assert.equal(JSON.stringify(leida.pacientes), JSON.stringify(v1.pacientes), 'eventos byte a byte');
    assert.equal(m.get('vihconectados.demo.v1'), raw, 'leer no escribe: el almacenamiento anterior no se toca hasta guardar');
    assert.equal(r.diagnostico.migrada_desde, FORMATO_ANTERIOR);
    assert.deepEqual(r.diagnostico.no_conformes, []);
    assert.equal(JSON.stringify(migrarBase(migrarBase(v1)).pacientes), JSON.stringify(v1.pacientes), 'idempotente');
    assert.deepEqual(migrarBase(leida), leida);
  }
});

test('Migración: la primera escritura conserva una copia de la base anterior y la lectura posterior ya es del formato actual', () => {
  const v1 = comoV1(demo()), raw = JSON.stringify(v1);
  const { m, storage } = almacen({ 'vihconectados.demo.v1': raw }), r = new RepositorioDemo(storage);
  const leida = r.leer();
  r.guardar(leida);
  assert.equal(JSON.parse(m.get('vihconectados.demo.v1')).formato, FORMATO_ACTUAL);
  assert.equal(m.get('vihconectados.demo.v1.copia-previa'), raw, 'copia íntegra de la base anterior para poder volver atrás');
  const otra = new RepositorioDemo(storage);
  assert.deepEqual(otra.leer(), leida);
  assert.equal(otra.diagnostico.migrada_desde, null);
  otra.guardar(otra.leer());
  assert.equal(m.get('vihconectados.demo.v1.copia-previa'), raw, 'la copia previa no se sobrescribe');
});

test('Migración: si no se puede guardar la copia previa (cuota), la base se guarda igualmente y no se pierde nada', () => {
  const v1 = comoV1(demo());
  const { m, storage } = almacen({ 'vihconectados.demo.v1': JSON.stringify(v1) });
  const setItem = storage.setItem;
  storage.setItem = (k, v) => { if (k.endsWith('copia-previa')) throw Error('cuota'); setItem(k, v); };
  const r = new RepositorioDemo(storage);
  r.guardar(r.leer());
  assert.equal(JSON.parse(m.get('vihconectados.demo.v1')).formato, FORMATO_ACTUAL);
  assert.equal(JSON.stringify(JSON.parse(m.get('vihconectados.demo.v1')).pacientes), JSON.stringify(v1.pacientes));
});

test('Lectura recuperable: formato desconocido o JSON dañado explican el problema y no modifican ni borran el almacenamiento', () => {
  for (const raw of [JSON.stringify({ formato: 'vihconectados/demo@9', pacientes: [] }), '{no es json', JSON.stringify({ formato: FORMATO_ACTUAL }), 'null']) {
    const { m, storage } = almacen({ 'vihconectados.demo.v1': raw }), r = new RepositorioDemo(storage);
    assert.throws(() => r.leer(), /Almacenamiento incompatible/);
    assert.equal(m.get('vihconectados.demo.v1'), raw);
  }
  const { storage } = almacen();
  assert.throws(() => new RepositorioDemo(storage).guardar({ formato: 'otro', pacientes: [] }), /formato/i);
});

test('Datos antiguos no conformes: se cargan, se conservan intactos y se avisa de ellos (no se descartan)', () => {
  const d = demo(), malo = { id: 'legacy-1', tipo: 'importacion', fuente: 'X', registrado: '2026-01-01T00:00:00.000Z' };
  const raro = { id: 'legacy-2', tipo: 'tipo_futuro', registrado: '2026-01-01T00:00:00.000Z' };
  d.pacientes[0].eventos.push(malo, raro);
  const { storage } = almacen({ 'vihconectados.demo.v1': JSON.stringify(d) }), r = new RepositorioDemo(storage);
  const leida = r.leer();
  assert.deepEqual(leida.pacientes[0].eventos.slice(-2), [malo, raro]);
  assert.deepEqual(r.diagnostico.no_conformes.map((x) => [x.paciente, x.evento, x.tipo]), [['DEMO-001', 'legacy-1', 'importacion'], ['DEMO-001', 'legacy-2', 'tipo_futuro']]);
  assert.match(r.diagnostico.no_conformes[0].motivo, /filas/);
  assert.match(r.diagnostico.no_conformes[1].motivo, /desconocido/);
});

test('Lectura tolerante: un evento antiguo malformado no inutiliza el cálculo del caso y el diagnóstico lo señala', () => {
  const d = demo(), p = d.pacientes[0];
  const antes = cobertura(demo().pacientes[0], '2026-11-08').pdc;
  p.eventos.push({ id: 'legacy-1', tipo: 'importacion', fuente: 'X', registrado: '2026-01-01T00:00:00.000Z' });
  assert.doesNotThrow(() => cobertura(p, '2026-11-08'));
  assert.doesNotThrow(() => evaluarSenales(p, '2026-11-08'));
  assert.equal(cobertura(p, '2026-11-08').pdc, antes, 'un evento sin filas no aporta ni quita cobertura');
  assert.equal(p.eventos.at(-1).id, 'legacy-1', 'el evento se conserva');
  assert.deepEqual(diagnosticarBase(d).no_conformes.map((x) => x.evento), ['legacy-1']);
});
