import test from 'node:test';
import assert from 'node:assert/strict';
import { demo } from '../src/demo.js';
import { anexar } from '../src/almacen.js';
import { cobertura } from '../src/motor.js';
import { PERFILES, ESTADOS_SOLICITUD, estadoSolicitud, solicitudesPaciente, bandeja, accionesDisponibles } from '../src/solicitudes.js';
import { aplicarComando } from '../src/comandos.js';

/**
 * Solicitudes de valoración entre profesionales (docs/strategy/COMUNICACION_PROFESIONALES.md).
 * Ciclo: enviada → recibida (destino) → respondida (destino, con texto) → cerrada (origen).
 * El «perfil» es una función declarada, no una identidad verificada. Valores esperados deducidos a mano.
 */
const F = 'Farmacia Hospitalaria', I = 'Infecciosas';
const base = () => demo();
const nueva = (o = {}) => ({ tipo: 'solicitud_valoracion', fecha: '2026-11-08', origen: F, destino: I, motivo: 'Valorar la cobertura baja del caso sintético.', plazo: '2026-11-12', senal: 'cobertura_demo', ...o });
const paso = (sol, estado, perfil, fecha, extra = {}) => ({ tipo: 'estado_solicitud', fecha, solicitud: sol, estado, perfil, ...extra });
const ultimaId = (d, id = 'DEMO-001') => d.pacientes.find((p) => p.id === id).eventos.at(-1).id;
const caso = (d, id = 'DEMO-001') => d.pacientes.find((p) => p.id === id);

test('Vocabulario: dos perfiles y cuatro estados', () => {
  assert.deepEqual(PERFILES, [F, I]);
  assert.deepEqual(ESTADOS_SOLICITUD, ['enviada', 'recibida', 'respondida', 'cerrada']);
});

test('Una solicitud válida se guarda, recibe identificador y empieza «enviada»', () => {
  const d = anexar(base(), 'DEMO-001', nueva());
  const s = estadoSolicitud(caso(d), ultimaId(d), '2026-11-08');
  assert.equal(s.estado, 'enviada');
  assert.deepEqual([s.origen, s.destino, s.plazo, s.senal], [F, I, '2026-11-12', 'cobertura_demo']);
  assert.equal(s.vencida, false);
});

test('Rechazos de forma y de contenido al crear', () => {
  const malos = [
    [nueva({ destino: F }), /distint/i], [nueva({ origen: 'Enfermería' }), /perfil/i], [nueva({ destino: 'Otro' }), /perfil/i],
    [nueva({ motivo: '   ' }), /motivo/i], [nueva({ motivo: 'x'.repeat(501) }), /motivo/i],
    [nueva({ plazo: '2026-11-07' }), /plazo/i], [nueva({ plazo: '2026-13-40' }), /fecha/i], [nueva({ plazo: undefined }), /Falta plazo/],
    [nueva({ extra: 1 }), /no permitido/], [nueva({ fecha: undefined }), /Falta fecha/], [nueva({ id: 'x' }), /reservado/],
    [nueva({ senal: 'a'.repeat(61) }), /señal/i],
  ];
  for (const [e, re] of malos) assert.throws(() => anexar(base(), 'DEMO-001', e), re, JSON.stringify(e).slice(0, 80));
});

test('El plazo puede coincidir con la fecha de envío', () => {
  assert.doesNotThrow(() => anexar(base(), 'DEMO-001', nueva({ plazo: '2026-11-08' })));
});

function ciclo() {
  let d = anexar(base(), 'DEMO-001', nueva());
  const id = ultimaId(d);
  d = anexar(d, 'DEMO-001', paso(id, 'recibida', I, '2026-11-09'));
  d = anexar(d, 'DEMO-001', paso(id, 'respondida', I, '2026-11-10', { respuesta: 'Revisado; se acuerda comprobar la recogida.' }));
  d = anexar(d, 'DEMO-001', paso(id, 'cerrada', F, '2026-11-11'));
  return { d, id };
}

test('El ciclo completo se reconstruye según la fecha de corte, y antes del envío no existe', () => {
  const { d, id } = ciclo(), p = caso(d);
  const est = (fin) => estadoSolicitud(p, id, fin)?.estado ?? null;
  assert.deepEqual(['2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-30'].map(est), [null, 'enviada', 'recibida', 'respondida', 'cerrada', 'cerrada']);
  const h = estadoSolicitud(p, id, '2026-11-11').historial;
  assert.deepEqual(h.map((x) => [x.estado, x.perfil, x.fecha]), [['enviada', F, '2026-11-08'], ['recibida', I, '2026-11-09'], ['respondida', I, '2026-11-10'], ['cerrada', F, '2026-11-11']]);
  assert.equal(estadoSolicitud(p, id, '2026-11-11').respuesta, 'Revisado; se acuerda comprobar la recogida.');
  assert.equal(estadoSolicitud(p, id, '2026-11-09').respuesta, null, 'la respuesta no aparece antes de darse');
});

test('Solo se puede avanzar un paso, en orden, por quien corresponde', () => {
  let d = anexar(base(), 'DEMO-001', nueva());
  const id = ultimaId(d);
  const falla = (e, re) => assert.throws(() => anexar(d, 'DEMO-001', e), re);
  falla(paso(id, 'respondida', I, '2026-11-09', { respuesta: 'x' }), /orden|siguiente/i);
  falla(paso(id, 'cerrada', F, '2026-11-09'), /orden|siguiente/i);
  falla(paso(id, 'enviada', I, '2026-11-09'), /estado/i);
  falla(paso(id, 'recibida', F, '2026-11-09'), /destino|perfil/i);
  falla(paso(id, 'recibida', 'Otro', '2026-11-09'), /perfil/i);
  falla(paso(id, 'recibida', I, '2026-11-09', { respuesta: 'no procede' }), /respuesta/i);
  falla(paso(id, 'recibida', I, '2026-11-07'), /fecha/i);
  falla(paso('no-existe', 'recibida', I, '2026-11-09'), /solicitud/i);
  d = anexar(d, 'DEMO-001', paso(id, 'recibida', I, '2026-11-09'));
  falla(paso(id, 'recibida', I, '2026-11-09'), /orden|siguiente/i);
  falla(paso(id, 'respondida', I, '2026-11-09'), /respuesta/i);
  falla(paso(id, 'respondida', I, '2026-11-09', { respuesta: '  ' }), /respuesta/i);
  falla(paso(id, 'respondida', I, '2026-11-09', { respuesta: 'x'.repeat(1001) }), /respuesta/i);
  falla(paso(id, 'respondida', F, '2026-11-09', { respuesta: 'ok' }), /destino|perfil/i);
  d = anexar(d, 'DEMO-001', paso(id, 'respondida', I, '2026-11-09', { respuesta: 'ok' }));
  falla(paso(id, 'cerrada', I, '2026-11-10'), /origen|perfil/i);
  d = anexar(d, 'DEMO-001', paso(id, 'cerrada', F, '2026-11-10'));
  falla(paso(id, 'cerrada', F, '2026-11-11'), /ya está cerrada/);
  falla(paso(id, 'recibida', I, '2026-11-11'), /ya está cerrada/);
});

test('Una solicitud de un caso no se puede avanzar desde otro caso', () => {
  const d = anexar(base(), 'DEMO-001', nueva()), id = ultimaId(d);
  assert.throws(() => anexar(d, 'DEMO-002', paso(id, 'recibida', I, '2026-11-09')), /solicitud/i);
});

test('Vencimiento: pasa el plazo sin respuesta; no vence una vez respondida ni cerrada', () => {
  const { d, id } = ciclo(), p = caso(d);
  const sin = anexar(base(), 'DEMO-001', nueva()), pid = ultimaId(sin), ps = caso(sin);
  assert.equal(estadoSolicitud(ps, pid, '2026-11-12').vencida, false, 'el día del plazo aún está en plazo');
  assert.equal(estadoSolicitud(ps, pid, '2026-11-13').vencida, true);
  const rec = anexar(sin, 'DEMO-001', paso(pid, 'recibida', I, '2026-11-09'));
  assert.equal(estadoSolicitud(caso(rec), pid, '2026-11-13').vencida, true, 'recibida pero sin responder');
  assert.equal(estadoSolicitud(p, id, '2026-11-20').vencida, false, 'cerrada');
  const resp = anexar(rec, 'DEMO-001', paso(pid, 'respondida', I, '2026-11-12', { respuesta: 'ok' }));
  assert.equal(estadoSolicitud(caso(resp), pid, '2026-11-20').vencida, false, 'respondida a tiempo; falta cerrar');
});

test('Bandeja por perfil: qué me toca, qué espero y qué está cerrado', () => {
  let d = anexar(base(), 'DEMO-001', nueva());                       // S1: F → I, enviada
  const s1 = ultimaId(d);
  d = anexar(d, 'DEMO-002', nueva({ origen: I, destino: F, motivo: 'Revisar la dispensación de este caso.', senal: null }));
  const s2 = ultimaId(d, 'DEMO-002');
  d = anexar(d, 'DEMO-002', paso(s2, 'recibida', F, '2026-11-09'));
  d = anexar(d, 'DEMO-002', paso(s2, 'respondida', F, '2026-11-10', { respuesta: 'Revisada.' })); // S2: I → F, respondida
  d = anexar(d, 'DEMO-003', nueva({ motivo: 'Otro caso ya resuelto.' }));
  const s3 = ultimaId(d, 'DEMO-003');
  for (const [e, p, f, x] of [['recibida', I, '2026-11-09', {}], ['respondida', I, '2026-11-09', { respuesta: 'ok' }], ['cerrada', F, '2026-11-10', {}]]) d = anexar(d, 'DEMO-003', paso(s3, e, p, f, x));
  const ids = (xs) => xs.map((x) => x.id).sort();
  const bi = bandeja(d.pacientes, '2026-11-10', I), bf = bandeja(d.pacientes, '2026-11-10', F);
  assert.deepEqual([ids(bi.paraMi), ids(bi.esperando), ids(bi.cerradas)], [ids([{ id: s1 }, { id: s2 }]), [], [s3]]);
  assert.deepEqual([ids(bf.paraMi), ids(bf.esperando), ids(bf.cerradas)], [[], ids([{ id: s1 }, { id: s2 }]), [s3]]);
  assert.equal(bi.paraMi.find((x) => x.id === s1).paciente, 'DEMO-001');
  assert.equal(solicitudesPaciente(caso(d, 'DEMO-002'), '2026-11-10').length, 1);
});

test('Acciones disponibles: cada perfil ve solo el paso que le corresponde', () => {
  const d = anexar(base(), 'DEMO-001', nueva()), id = ultimaId(d), p = caso(d);
  const sol = (fin) => estadoSolicitud(p, id, fin);
  assert.deepEqual([accionesDisponibles(sol('2026-11-08'), I), accionesDisponibles(sol('2026-11-08'), F)], [['recibida'], []]);
  let d2 = anexar(d, 'DEMO-001', paso(id, 'recibida', I, '2026-11-09'));
  assert.deepEqual(accionesDisponibles(estadoSolicitud(caso(d2), id, '2026-11-09'), I), ['respondida']);
  d2 = anexar(d2, 'DEMO-001', paso(id, 'respondida', I, '2026-11-09', { respuesta: 'ok' }));
  assert.deepEqual([accionesDisponibles(estadoSolicitud(caso(d2), id, '2026-11-09'), F), accionesDisponibles(estadoSolicitud(caso(d2), id, '2026-11-09'), I)], [['cerrada'], []]);
  assert.deepEqual(accionesDisponibles(null, F), []);
});

test('Las solicitudes no alteran el cálculo de cobertura ni mutan la base original', () => {
  const d0 = base(), antes = JSON.stringify(d0), pdc0 = cobertura(caso(d0), '2026-11-08');
  const d1 = anexar(d0, 'DEMO-001', nueva());
  assert.equal(JSON.stringify(d0), antes);
  assert.deepEqual(cobertura(caso(d1), '2026-11-08'), pdc0);
});

test('Funciona mediante el puerto de comandos y deja el historial intacto si falla', () => {
  const d = base();
  const { db } = aplicarComando(d, { tipo: 'anexar_evento', paciente: 'DEMO-001', evento: nueva() });
  assert.equal(caso(db).eventos.length, caso(d).eventos.length + 1);
  assert.throws(() => aplicarComando(db, { tipo: 'anexar_evento', paciente: 'DEMO-001', evento: nueva({ destino: F }) }), /distint/i);
});

test('El texto libre se conserva tal cual (el escape es responsabilidad de la vista) y se recorta', () => {
  const d = anexar(base(), 'DEMO-001', nueva({ motivo: '  <b>x</b> & "y"  ' }));
  assert.equal(estadoSolicitud(caso(d), ultimaId(d), '2026-11-08').motivo, '<b>x</b> & "y"');
});
