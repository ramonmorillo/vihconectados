import test from 'node:test';
import assert from 'node:assert/strict';
import * as motor from '../src/motor.js';
import { crearPaciente, vacio, anexar } from '../src/almacen.js';
import { cobertura, REGLAS } from '../src/motor.js';
import { evaluarSenales, pendientesSenales } from '../src/senales.js';
import { nivelHasta } from '../src/temporal.js';
import { normalizarFicha, modalidadTar } from '../src/cima.js';
import { informe, textoInforme } from '../src/informes.js';
import { vistaInforme } from '../src/vista-informes.js';
import { demo } from '../src/demo.js';
import { fichaPrueba } from './fixtures-cima.js';

/** A06 · Seguridad clínica de la demostración (docs/strategy/PRIORITIZED_BACKLOG.md). */
const cfg = { ...REGLAS, ventana: 90 };
const FIN = '2026-01-31';
const SIEMPRE = '2099-12-31'; // los eventos sin fecha efectiva usan su fecha de registro (hoy)
const med = (id, inyectable) => {
  const { presentaciones, ...m } = normalizarFicha({
    ...fichaPrueba, nregistro: id, nombre: 'TAR SINTÉTICO ' + id,
    viasAdministracion: [{ nombre: inyectable ? 'VÍA INTRAMUSCULAR' : 'VÍA ORAL' }],
  });
  return { ...m, cn: id, presentacion: presentaciones[0].nombre };
};
const tratamiento = (ms, fecha = '2026-01-01') =>
  ({ tipo: 'tratamiento', tar: 'CIMA', fecha, medicamentos: ms, modalidad: modalidadTar(ms), confirmado: true });
const conInyectable = () => anexar(crearPaciente(vacio(), '2'), 'DEMO-001', tratamiento([med('999993', true), med('999994', true)]));

test('A06.2 · Un caso nuevo sin nivel indicado queda sin estratificar; no se infiere nivel 3', () => {
  for (const d of [crearPaciente(vacio()), crearPaciente(vacio(), null), crearPaciente(vacio(), undefined, '2026-01-01')]) {
    const p = d.pacientes[0];
    assert.equal(p.eventos.some(e => e.tipo === 'nivel'), false);
    assert.equal(nivelHasta(p, SIEMPRE), null);
  }
});

test('A06.2 · Un nivel explícito sigue registrándose y un nivel inválido sigue rechazándose', () => {
  assert.equal(nivelHasta(crearPaciente(vacio(), '3').pacientes[0], SIEMPRE), '3');
  assert.equal(nivelHasta(crearPaciente(vacio(), '1', '2026-01-01').pacientes[0], FIN), '1');
  assert.throws(() => crearPaciente(vacio(), '9'), /Nivel CMO inválido/);
  assert.throws(() => crearPaciente(vacio(), 3), /Nivel CMO inválido/);
});

test('A06.2 · Se elimina motor.nivel(): devolvía "3" por defecto y no tenía llamadores', () => {
  assert.equal('nivel' in motor, false);
});

test('A06.1 · TAR inyectable: señal pendiente «no monitorizado», no silencio; el PDC no cambia', () => {
  const p = conInyectable().pacientes[0];
  const c = cobertura(p, FIN, cfg);
  assert.equal(c.pdc, null); assert.equal(c.total, 0); assert.equal(c.excluidos[0].total, 30);
  const s = evaluarSenales(p, FIN, cfg);
  assert.deepEqual(s.map(x => [x.regla, x.categoria]), [['tar_inyectable_no_evaluable', 'no_monitorizado']]);
  assert.match(s[0].texto, /NO MONITORIZADO/);
  assert.equal(pendientesSenales(p, FIN, cfg).length, 1);
});

test('A06.1 · La gestión profesional no borra la condición: sigue calculada y visible tras revisarla', () => {
  let d = conInyectable();
  const s = evaluarSenales(d.pacientes[0], FIN, cfg)[0];
  d = anexar(d, 'DEMO-001', { tipo: 'gestion_senal', fecha: FIN, regla: s.regla, evidencia: s.evidencia, estado: 'revisada', motivo: 'Revisado en simulación', actuacion: '', reglas: { ...cfg } });
  const p = d.pacientes[0];
  assert.equal(pendientesSenales(p, FIN, cfg).length, 0);
  const despues = evaluarSenales(p, FIN, cfg)[0];
  assert.equal(despues.regla, 'tar_inyectable_no_evaluable'); assert.equal(despues.estado_gestion, 'revisada');
});

test('A06.1 · Informe profesional e informe visual muestran «NO MONITORIZADO»', () => {
  const i = informe(conInyectable().pacientes[0], FIN, cfg);
  assert.match(textoInforme(i), /NO MONITORIZADO/);
  assert.match(vistaInforme(i), /NO MONITORIZADO/);
});

test('A06.4 · Sin cambios para TAR oral: cohorte de demostración conserva señales pendientes y PDC', () => {
  const esperado = { 'DEMO-001': [2, 0.85], 'DEMO-002': [0, 0.9833333333333333], 'DEMO-003': [0, 1] };
  for (const p of demo().pacientes) {
    const [pendientes, pdc] = esperado[p.id];
    assert.equal(pendientesSenales(p, '2026-11-08').length, pendientes, p.id);
    assert.equal(cobertura(p, '2026-11-08').pdc, pdc, p.id);
    assert.equal(evaluarSenales(p, '2026-11-08').some(s => s.categoria === 'no_monitorizado'), false, p.id);
  }
});
