import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REGISTRO_REGLAS, ESTADOS_VALIDACION, ESTADO_PENDIENTE, ESTADO_MODIFICADO,
  validarRegistro, reglasPorDefecto, reglasConParametros, fichaRegla, fichasAplicadas, estadoValidacionRegla,
} from '../src/reglas.js';
import { REGLAS, alertas, cobertura, importarCSV } from '../src/motor.js';
import { evaluarSenales } from '../src/senales.js';
import { crearPaciente, vacio, anexar } from '../src/almacen.js';
import { informe, textoInforme } from '../src/informes.js';
import { vistaInforme } from '../src/vista-informes.js';
import { normalizarFicha, modalidadTar } from '../src/cima.js';
import { demo } from '../src/demo.js';
import { fichaPrueba } from './fixtures-cima.js';

/** A03 · Registro de reglas clínicas versionado y con estado de validación (docs/REGISTRO_REGLAS.md). */
const IDS = ['pdc_oral', 'cobertura_demo', 'datos_fuera_episodio', 'experiencia_referida', 'sin_datos', 'tar_inyectable_no_evaluable'];
const activas = (r) => r.reglas.filter(x => x.vigente_hasta === null);
const clon = () => structuredClone(REGISTRO_REGLAS);
const canonico = (f) => JSON.stringify(Object.fromEntries(Object.keys(f.parametros).sort().map(k => [k, f.parametros[k].valor])));

/**
 * Cambiar un parámetro exige una versión nueva. Si esta prueba falla porque ha editado un valor:
 * NO cambie esta tabla; deje la ficha existente con vigente_hasta y añada una ficha con otra versión
 * (más su línea aquí y la aprobación del CCR).
 */
const PARAMETROS_FIJADOS = {
  'pdc_oral@demo-1': '{"ventana":180}',
  'cobertura_demo@demo-1': '{"umbral":0.9}',
  'datos_fuera_episodio@demo-1': '{}',
  'experiencia_referida@demo-1': '{}',
  'sin_datos@demo-1': '{}',
  'tar_inyectable_no_evaluable@demo-1': '{}',
};

test('Registro: contiene las seis reglas del motor, con ficha completa y una única versión vigente por regla', () => {
  assert.equal(REGISTRO_REGLAS.formato, 'vihconectados/registro-reglas@1');
  assert.deepEqual(activas(REGISTRO_REGLAS).map(x => x.id).sort(), [...IDS].sort());
  for (const f of REGISTRO_REGLAS.reglas) {
    for (const k of ['id', 'version', 'tipo', 'vigente_desde', 'vigente_hasta', 'descripcion', 'fuente', 'estado_validacion', 'parametros', 'poblacion', 'exclusiones', 'riesgos', 'aprobacion'])
      assert.ok(k in f, `${f.id}: falta ${k}`);
    assert.ok(['metrica', 'senal'].includes(f.tipo));
    assert.ok(ESTADOS_VALIDACION.includes(f.estado_validacion));
    assert.ok(f.descripcion.length > 20 && f.fuente.length > 20, `${f.id}: descripción y fuente deben ser explícitas`);
    for (const p of Object.values(f.parametros)) assert.ok(p.unidad && p.min <= p.valor && p.valor <= p.max);
  }
  validarRegistro(REGISTRO_REGLAS);
});

test('Registro: ninguna regla declara validación sin aprobación documentada, y está congelado', () => {
  for (const f of REGISTRO_REGLAS.reglas) assert.equal(f.estado_validacion, ESTADO_PENDIENTE, f.id + ': hoy no existe validación aprobada');
  const r = clon();
  r.reglas[0].estado_validacion = ESTADOS_VALIDACION[3];
  assert.throws(() => validarRegistro(r), /sin aprobación/);
  Object.assign(r.reglas[0].aprobacion, { comite: 'CCR', revisor_independiente: 'Revisor', fecha: '2027-01-15', acta: 'ACTA-1' });
  validarRegistro(r);
  assert.throws(() => { REGISTRO_REGLAS.reglas[0].version = 'x'; }, TypeError);
  assert.throws(() => { REGISTRO_REGLAS.reglas[0].parametros.ventana.valor = 1; }, TypeError);
});

test('Registro: rechaza duplicados, dos versiones vigentes, parámetros fuera de rango y conjunto desactualizado', () => {
  let r = clon(); r.reglas.push(structuredClone(r.reglas[0]));
  assert.throws(() => validarRegistro(r), /duplicad/i);
  r = clon(); r.reglas.push({ ...structuredClone(r.reglas[0]), version: 'demo-2' });
  assert.throws(() => validarRegistro(r), /vigente/i);
  r = clon(); r.reglas[0].parametros.ventana.valor = 9999;
  assert.throws(() => validarRegistro(r), /rango/i);
  r = clon(); r.conjunto.incluye.pdc_oral = 'demo-9';
  assert.throws(() => validarRegistro(r), /conjunto/i);
});

test('Compatibilidad: REGLAS conserva exactamente su forma histórica (la huella de evidencia de señales gestionadas no cambia)', () => {
  assert.equal(JSON.stringify(REGLAS), '{"version":"demo-1","ventana":180,"umbral":0.9,"validacion":"Pendiente de validación profesional"}');
  assert.deepEqual(reglasPorDefecto(), REGLAS);
  assert.equal(Object.isFrozen(REGLAS), true);
});

test('Cambiar un parámetro exige una versión nueva: los valores de cada versión quedan fijados', () => {
  const claves = REGISTRO_REGLAS.reglas.map(f => `${f.id}@${f.version}`).sort();
  assert.deepEqual(claves, Object.keys(PARAMETROS_FIJADOS).sort(), 'Toda versión nueva debe añadirse a PARAMETROS_FIJADOS');
  for (const f of REGISTRO_REGLAS.reglas) assert.equal(canonico(f), PARAMETROS_FIJADOS[`${f.id}@${f.version}`], `${f.id}@${f.version}: parámetros editados sin cambiar de versión`);
});

test('Parámetros de sesión: la versión es determinista y distinta; el estado indica que no están validados', () => {
  assert.deepEqual(reglasConParametros(180, 0.9), REGLAS);
  const a = reglasConParametros(90, 0.8), b = reglasConParametros(90, 0.8), c = reglasConParametros(91, 0.8);
  assert.deepEqual(a, b);
  assert.notEqual(a.version, REGLAS.version); assert.notEqual(a.version, c.version);
  assert.match(a.version, /^demo-1\+mod\(/); assert.doesNotMatch(a.version, /\d{10,}/, 'no debe depender del reloj');
  assert.equal(a.validacion, ESTADO_MODIFICADO);
  assert.deepEqual([a.ventana, a.umbral], [90, 0.8]);
  assert.throws(() => reglasConParametros(0, 0.9), /Parámetros fuera de rango/);
  assert.throws(() => reglasConParametros(90, 1.5), /Parámetros fuera de rango/);
});

const fueraDeEpisodio = () => {
  let d = anexar(crearPaciente(vacio()), 'DEMO-001', { tipo: 'tratamiento', fecha: '2026-01-01', tar: 'TAR_A' });
  d = anexar(d, 'DEMO-001', { tipo: 'importacion', fuente: 'prueba', ...importarCSV(d.pacientes[0], `fecha;episodio;componente;dias\n2026-02-10;${d.pacientes[0].eventos.at(-1).id};A;30`) });
  return anexar(d, 'DEMO-001', { tipo: 'tratamiento', fecha: '2026-02-01', tar: 'TAR_B' }).pacientes[0];
};
const inyectable = () => {
  const ms = ['999993', '999994'].map((id) => {
    const { presentaciones, ...m } = normalizarFicha({ ...fichaPrueba, nregistro: id, nombre: 'TAR ' + id, viasAdministracion: [{ nombre: 'VÍA INTRAMUSCULAR' }] });
    return { ...m, cn: id, presentacion: presentaciones[0].nombre };
  });
  return anexar(crearPaciente(vacio()), 'DEMO-001', { tipo: 'tratamiento', fecha: '2026-01-01', tar: 'CIMA', medicamentos: ms, modalidad: modalidadTar(ms), confirmado: true }).pacientes[0];
};

test('Cada señal emitida lleva id, versión y estado de validación que proceden del registro', () => {
  const casos = [...demo().pacientes.map(p => [p, '2026-11-08']), [crearPaciente(vacio()).pacientes[0], '2026-01-31'], [inyectable(), '2026-01-31'], [fueraDeEpisodio(), '2026-03-02']];
  const vistas = new Set();
  for (const [p, fin] of casos) for (const s of alertas(p, fin)) {
    vistas.add(s.regla);
    const f = fichaRegla(s.regla);
    assert.ok(f, `La regla ${s.regla} no tiene ficha en el registro`);
    assert.equal(s.version, REGLAS.version);
    assert.equal(s.estado, f.estado_validacion);
    assert.equal(s.estado, estadoValidacionRegla(s.regla));
  }
  assert.deepEqual([...vistas].sort(), IDS.filter(i => i !== 'pdc_oral').sort(), 'Los casos deben ejercitar las cinco reglas de señal');
  for (const s of evaluarSenales(demo().pacientes[0], '2026-11-08')) assert.equal(s.estado, ESTADO_PENDIENTE);
});

test('Con parámetros modificados, las señales que dependen de ellos no aparentan estar pendientes de validación sino modificadas', () => {
  const r = reglasConParametros(90, 0.99), p = demo().pacientes[0];
  const cob = alertas(p, '2026-11-08', r).find(s => s.regla === 'cobertura_demo');
  assert.equal(cob.estado, ESTADO_MODIFICADO); assert.equal(cob.version, r.version);
  const fuera = alertas(fueraDeEpisodio(), '2026-03-02', r).find(s => s.regla === 'datos_fuera_episodio');
  assert.equal(fuera.estado, ESTADO_PENDIENTE, 'una regla sin parámetros no cambia por modificar la ventana');
});

test('Informe: incluye las reglas aplicadas con id, versión y estado; texto y vista profesional las muestran', () => {
  const i = informe(demo().pacientes[0], '2026-11-08');
  assert.deepEqual(i.reglas_aplicadas, fichasAplicadas(REGLAS));
  assert.deepEqual(i.reglas_aplicadas.map(x => x.id).sort(), [...IDS].sort());
  for (const x of i.reglas_aplicadas) { assert.equal(x.version, 'demo-1'); assert.equal(x.estado_validacion, ESTADO_PENDIENTE); }
  const t = textoInforme(i), v = vistaInforme(i);
  for (const id of IDS) assert.ok(t.includes(id + ' demo-1'), 'texto: ' + id);
  assert.match(t, /Reglas aplicadas/);
  // La hoja impresa lleva un resumen compacto (el informe breve debe seguir cabiendo en una página A4).
  assert.match(v, /Reglas aplicadas: 6 reglas demo-1 · Pendiente de validación profesional\./);
});

test('Informe con parámetros modificados lo declara; los informes antiguos y el registro no se ven afectados', () => {
  const p = demo().pacientes[0], r = reglasConParametros(90, 0.8);
  const antiguo = informe(p, '2026-11-08'), copia = JSON.stringify(antiguo);
  const nuevo = informe(p, '2026-11-08', r);
  assert.equal(JSON.stringify(antiguo), copia);
  assert.equal(nuevo.cobertura.reglas.version, r.version);
  const pdc = nuevo.reglas_aplicadas.find(x => x.id === 'pdc_oral');
  assert.equal(pdc.estado_validacion, ESTADO_MODIFICADO); assert.equal(pdc.parametros_modificados, true);
  assert.equal(nuevo.reglas_aplicadas.find(x => x.id === 'sin_datos').estado_validacion, ESTADO_PENDIENTE);
  const v = vistaInforme(nuevo);
  assert.match(v, /2 reglas demo-1 · Parámetros modificados por el usuario; sin validación/);
  assert.match(v, /4 reglas demo-1 · Pendiente de validación profesional/);
  nuevo.reglas_aplicadas[0].version = 'manipulada';
  assert.equal(fichaRegla('pdc_oral').version, 'demo-1', 'el informe contiene copias, no referencias al registro');
});

test('Evolución del registro: una versión nueva no altera lo ya emitido, que conserva la suya', () => {
  const p = demo().pacientes[0], antiguo = informe(p, '2026-11-08'), copia = JSON.stringify(antiguo);
  const evo = clon();
  evo.reglas.find(f => f.id === 'pdc_oral').vigente_hasta = '2027-01-15';
  evo.reglas.push({
    ...structuredClone(evo.reglas.find(f => f.id === 'pdc_oral')), version: 'demo-2', vigente_desde: '2027-01-15', vigente_hasta: null,
    estado_validacion: ESTADOS_VALIDACION[1], parametros: { ventana: { valor: 90, unidad: 'días', min: 1, max: 730 } },
    aprobacion: { comite: 'CCR', revisor_independiente: 'Revisor', fecha: '2027-01-15', acta: 'ACTA-1' },
  });
  evo.conjunto.version = 'demo-2'; evo.conjunto.incluye.pdc_oral = 'demo-2';
  validarRegistro(evo);
  const nuevas = fichasAplicadas(reglasPorDefecto(evo), evo);
  assert.equal(nuevas.find(x => x.id === 'pdc_oral').version, 'demo-2');
  assert.equal(reglasPorDefecto(evo).ventana, 90);
  assert.equal(JSON.stringify(antiguo), copia);
  assert.equal(antiguo.reglas_aplicadas.find(x => x.id === 'pdc_oral').version, 'demo-1');
  assert.equal(fichaRegla('pdc_oral', undefined, evo).version, 'demo-2');
  assert.equal(fichaRegla('pdc_oral', 'demo-1', evo).vigente_hasta, '2027-01-15');
});

test('Compatibilidad hacia atrás: un informe anterior sin reglas_aplicadas sigue mostrándose', () => {
  const i = informe(demo().pacientes[0], '2026-11-08');
  delete i.reglas_aplicadas;
  assert.doesNotMatch(textoInforme(i), /Reglas aplicadas/);
  assert.doesNotThrow(() => vistaInforme(i));
  assert.equal(cobertura(demo().pacientes[0], '2026-11-08').reglas.version, 'demo-1');
});
