import test from 'node:test';
import assert from 'node:assert/strict';
import { TIPOS_COMANDO, validarComando, aplicarComando } from '../src/comandos.js';
import { RepositorioLocal } from '../src/repositorio.js';
import { RepositorioDemo, vacio, crearPaciente } from '../src/almacen.js';
import { FORMATO_ACTUAL, FORMATO_ANTERIOR } from '../src/migraciones.js';
import { REGLAS } from '../src/motor.js';
import { demo, ESCENARIOS } from '../src/demo.js';

/** A07 · Puerto de repositorio por comandos (docs/ARQUITECTURA.md). */
const EXP = { barrera: 'No explorada', dificultad: 'No explorada', efecto: 'No explorado', carga: 'No explorada', preferencia: 'No explorada' };
const almacen = (inicial = {}) => {
  const m = new Map(Object.entries(inicial)), escrituras = [];
  return { m, escrituras, storage: { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { escrituras.push(k); m.set(k, v); } } };
};
const KEY = 'vihconectados.demo.v1';
const nivel = { tipo: 'anexar_evento', paciente: 'DEMO-001', evento: { tipo: 'nivel', fecha: '2026-11-10', nivel: '1' } };
const consulta = (fecha = '2026-11-10') => ({
  tipo: 'registrar_consulta', paciente: 'DEMO-001', reglas: { ...REGLAS },
  datos: { experiencia_modo: 'nueva', experiencia: { ...EXP }, fecha, adherencia: null, actuacion_modo: 'nueva', accion: 'Plan sintético', problema: 'Acceso a la dispensación', objetivo: 'Objetivo sintético', responsable: 'Farmacia Hospitalaria', revision: '2026-12-01', revisado: true },
});

/* ---------- esquema de comandos ---------- */
const MUESTRAS = {
  sembrar_demo: { tipo: 'sembrar_demo' },
  crear_caso: { tipo: 'crear_caso', nivel: '2', fecha_nivel: '2026-11-08' },
  crear_caso_escenario: { tipo: 'crear_caso_escenario', escenario: 'acceso' },
  actualizar_cohorte: { tipo: 'actualizar_cohorte' },
  anexar_evento: nivel,
  registrar_consulta: consulta(),
  registrar_seguimiento: { tipo: 'registrar_seguimiento', paciente: 'DEMO-001', datos: { consulta: 'c', fecha: '2026-11-12' } },
};
test('Comandos: hay un esquema cerrado por cada tipo y cada muestra es válida', () => {
  assert.deepEqual([...TIPOS_COMANDO].sort(), Object.keys(MUESTRAS).sort());
  for (const [t, c] of Object.entries(MUESTRAS)) assert.doesNotThrow(() => validarComando(c), t);
});

test('Comandos: tipos desconocidos, campos no previstos, obligatorios ausentes y tipos de dato incorrectos se rechazan', () => {
  assert.throws(() => validarComando({ tipo: 'borrar_todo' }), /Comando desconocido/);
  assert.throws(() => validarComando({}), /Comando desconocido/);
  assert.throws(() => validarComando(null), /no válido/);
  for (const [t, c] of Object.entries(MUESTRAS)) assert.throws(() => validarComando({ ...c, extra: 1 }), /no permitido/, t);
  assert.throws(() => validarComando({ tipo: 'anexar_evento', paciente: 'DEMO-001' }), /Falta evento/);
  assert.throws(() => validarComando({ tipo: 'anexar_evento', evento: {} }), /Falta paciente/);
  assert.throws(() => validarComando({ tipo: 'anexar_evento', paciente: 7, evento: {} }), /paciente/);
  assert.throws(() => validarComando({ tipo: 'anexar_evento', paciente: 'DEMO-001', evento: [] }), /evento/);
  assert.throws(() => validarComando({ tipo: 'crear_caso', nivel: 2 }), /nivel/);
  assert.throws(() => validarComando({ tipo: 'crear_caso_escenario' }), /Falta escenario/);
});

/* ---------- aplicación pura de comandos ---------- */
test('aplicarComando es puro: no modifica la base recibida y devuelve el resultado de cada comando', () => {
  const d = demo(), antes = JSON.stringify(d);
  const r = aplicarComando(d, nivel);
  assert.equal(JSON.stringify(d), antes);
  assert.equal(r.db.pacientes[0].eventos.at(-1).tipo, 'nivel');
  assert.equal(r.resultado.paciente, 'DEMO-001');
  assert.equal(typeof r.resultado.evento, 'string');
  const c = aplicarComando(d, { tipo: 'crear_caso', nivel: '3', fecha_nivel: '2026-11-08' });
  assert.equal(c.resultado.paciente, 'DEMO-004');
  assert.equal(c.db.pacientes.length, 4);
  const sin = aplicarComando(vacio(), { tipo: 'crear_caso' });
  assert.equal(sin.db.pacientes[0].eventos.some((e) => e.tipo === 'nivel'), false, 'sin nivel indicado queda sin estratificar');
  const esc = aplicarComando(vacio(), { tipo: 'crear_caso_escenario', escenario: ESCENARIOS[0].id });
  assert.equal(esc.resultado.paciente, 'DEMO-001');
  assert.throws(() => aplicarComando(vacio(), { tipo: 'crear_caso_escenario', escenario: 'inexistente' }), /Escenario sintético desconocido/);
});

test('sembrar_demo solo siembra una base vacía; actualizar_cohorte es idempotente y cuenta los casos añadidos', () => {
  const s = aplicarComando(vacio(), { tipo: 'sembrar_demo' });
  assert.equal(s.db.pacientes.length, 3); assert.equal(s.resultado.sembrado, true);
  const otra = aplicarComando(s.db, { tipo: 'sembrar_demo' });
  assert.deepEqual([otra.db, otra.resultado.sembrado], [s.db, false]);
  assert.equal(aplicarComando(s.db, { tipo: 'actualizar_cohorte' }).resultado.anadidos, 0);
  const parcial = aplicarComando(vacio(), { tipo: 'crear_caso_escenario', escenario: 'acceso' }).db;
  assert.equal(aplicarComando(parcial, { tipo: 'actualizar_cohorte' }).resultado.anadidos, 2);
});

test('Comandos compuestos: la consulta y el seguimiento se aplican de una vez y un fallo no deja nada a medias', () => {
  const d = demo(), antes = JSON.stringify(d);
  const r = aplicarComando(d, consulta());
  const tipos = r.db.pacientes[0].eventos.slice(d.pacientes[0].eventos.length).map((e) => e.tipo);
  assert.deepEqual(tipos, ['visita', 'actuacion', 'consulta']);
  const roto = consulta(); roto.datos.problema = 'Problema inventado';
  assert.throws(() => aplicarComando(d, roto), /Revise problema/);
  assert.equal(JSON.stringify(d), antes);
  const id = r.db.pacientes[0].eventos.filter((e) => e.tipo === 'consulta').at(-1).id;
  const seg = aplicarComando(r.db, { tipo: 'registrar_seguimiento', paciente: 'DEMO-001', datos: { consulta: id, fecha: '2026-11-12', estado: 'en_curso', resultado: 'Pendiente de evaluar', observaciones: 'Seguimiento sintético', responsable: 'Farmacia Hospitalaria', revision: '2026-12-10', marcar_realizada: true } });
  assert.deepEqual(seg.db.pacientes[0].eventos.slice(r.db.pacientes[0].eventos.length).map((e) => e.tipo), ['seguimiento_consulta', 'estado_actuacion']);
});

/* ---------- el puerto ---------- */
test('El puerto solo expone consultar() y ejecutar(comando): no hay leer()/guardar(db)', () => {
  const { storage } = almacen(), repo = new RepositorioLocal(storage);
  assert.equal(typeof repo.consultar, 'function'); assert.equal(typeof repo.ejecutar, 'function');
  assert.equal(repo.guardar, undefined); assert.equal(repo.leer, undefined);
  assert.equal(repo.hayDatos(), false);
  assert.deepEqual(repo.consultar(), vacio());
});

test('Puerto: la siembra y los comandos persisten en el formato actual y se leen de vuelta', () => {
  const { m, storage } = almacen(), repo = new RepositorioLocal(storage);
  const s = repo.ejecutar({ tipo: 'sembrar_demo' });
  assert.equal(s.db.pacientes.length, 3); assert.equal(repo.hayDatos(), true);
  const r = repo.ejecutar(nivel);
  assert.deepEqual(new RepositorioLocal(storage).consultar(), r.db);
  assert.equal(JSON.parse(m.get(KEY)).formato, FORMATO_ACTUAL);
});

test('Puerto: un comando inválido no escribe nada: ni una sola escritura, ni siquiera la migración de una base anterior', () => {
  const malos = [
    { tipo: 'anexar_evento', paciente: 'DEMO-999', evento: { tipo: 'nivel', nivel: '1' } },
    { tipo: 'anexar_evento', paciente: 'DEMO-001', evento: { tipo: 'nivel', nivel: '1', id: 'forjado' } },
    { tipo: 'borrar_todo' },
    { ...consulta(), datos: { ...consulta().datos, problema: 'x' } },
  ];
  const { m, escrituras, storage } = almacen(), repo = new RepositorioLocal(storage);
  repo.ejecutar({ tipo: 'sembrar_demo' });
  const antes = m.get(KEY); escrituras.length = 0;
  for (const c of malos) assert.throws(() => repo.ejecutar(c));
  assert.deepEqual([escrituras.length, m.get(KEY)], [0, antes]);
  const v1 = structuredClone(demo()); v1.formato = FORMATO_ANTERIOR; delete v1.esquema_eventos;
  const viejo = almacen({ [KEY]: JSON.stringify(v1) }), r2 = new RepositorioLocal(viejo.storage);
  for (const c of malos) assert.throws(() => r2.ejecutar(c));
  assert.equal(viejo.escrituras.length, 0, 'un comando fallido no debe migrar la base ni crear la copia previa');
  assert.equal(viejo.m.has(KEY + '.copia-previa'), false);
});

test('Puerto: dos sesiones sobre el mismo almacenamiento no se pisan (con leer()/guardar(db) la segunda borraba lo de la primera)', () => {
  const { storage } = almacen();
  new RepositorioLocal(storage).ejecutar({ tipo: 'sembrar_demo' });
  const a = new RepositorioLocal(storage), b = new RepositorioLocal(storage);
  a.consultar(); b.consultar();
  a.ejecutar(nivel);
  b.ejecutar({ tipo: 'anexar_evento', paciente: 'DEMO-001', evento: { tipo: 'visita', fecha: '2026-11-11', experiencia: { ...EXP } } });
  const final = new RepositorioLocal(storage).consultar().pacientes[0].eventos;
  assert.ok(final.some((e) => e.tipo === 'nivel' && e.fecha === '2026-11-10'), 'se conserva el evento de la primera sesión');
  assert.ok(final.some((e) => e.tipo === 'visita' && e.fecha === '2026-11-11'), 'y el de la segunda');
  // Contraste: el modelo anterior (la base completa que cada sesión tenía en memoria) sí perdía el primero.
  const viejo = almacen(); const r1 = new RepositorioDemo(viejo.storage), r2 = new RepositorioDemo(viejo.storage);
  r1.guardar(demo()); const bd1 = r1.leer(), bd2 = r2.leer();
  bd1.pacientes[0].eventos.push({ id: 'a', tipo: 'nivel', nivel: '1', registrado: '2026-11-10T00:00:00.000Z' }); r1.guardar(bd1);
  bd2.pacientes[0].eventos.push({ id: 'b', tipo: 'nivel', nivel: '2', registrado: '2026-11-11T00:00:00.000Z' }); r2.guardar(bd2);
  assert.equal(new RepositorioDemo(viejo.storage).leer().pacientes[0].eventos.some((e) => e.id === 'a'), false, 'actualización perdida con la base completa');
});

test('Puerto: una base del formato anterior se migra al ejecutar el primer comando, con copia previa y diagnóstico', () => {
  const v1 = structuredClone(demo()); v1.formato = FORMATO_ANTERIOR; delete v1.esquema_eventos;
  const raw = JSON.stringify(v1), { m, storage } = almacen({ [KEY]: raw }), repo = new RepositorioLocal(storage);
  const lectura = repo.consultar();
  assert.equal(repo.diagnostico.migrada_desde, FORMATO_ANTERIOR);
  assert.equal(JSON.stringify(lectura.pacientes), JSON.stringify(v1.pacientes));
  assert.equal(m.get(KEY), raw, 'consultar no escribe');
  repo.ejecutar(nivel);
  assert.equal(JSON.parse(m.get(KEY)).formato, FORMATO_ACTUAL);
  assert.equal(m.get(KEY + '.copia-previa'), raw);
});

test('Puerto: un almacenamiento ilegible no se toca y un comando tampoco lo sobrescribe', () => {
  const { m, storage } = almacen({ [KEY]: '{no es json' }), repo = new RepositorioLocal(storage);
  assert.throws(() => repo.consultar(), /Almacenamiento incompatible/);
  assert.throws(() => repo.ejecutar({ tipo: 'sembrar_demo' }), /Almacenamiento incompatible/);
  assert.equal(m.get(KEY), '{no es json');
});

test('Equivalencia: crear un caso por comando da la misma base que el modelo anterior', () => {
  const por = aplicarComando(demo(), { tipo: 'crear_caso', nivel: '2', fecha_nivel: '2026-11-08' }).db;
  const antes = crearPaciente(demo(), '2', '2026-11-08');
  const forma = (db) => db.pacientes.map((p) => [p.id, p.eventos.map((e) => [e.tipo, e.fecha, e.nivel])]);
  assert.deepEqual(forma(por), forma(antes));
});
