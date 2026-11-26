import test from 'node:test';
import assert from 'node:assert/strict';
import { crearSesionConciliacion, entradasManuales, entradasDesdeCSV, huellaTexto } from '../src/conciliacion.js';
import { construirCorreccion, construirGestionSenal, construirEvaluacionManual } from '../src/eventos-formulario.js';
import { crearSeleccionTar } from '../src/seleccion-tar.js';
import { crearPaciente, vacio, anexar } from '../src/almacen.js';
import { historialDispensaciones } from '../src/dispensaciones.js';
import { episodios, importarCSV, REGLAS, componentes } from '../src/motor.js';
import { evaluarSenales } from '../src/senales.js';
import { normalizarFicha } from '../src/cima.js';
import { fichaPrueba } from './fixtures-cima.js';

/** A07 · Lógica que antes vivía dentro de los formularios, ahora en módulos puros y con pruebas propias. */
const ID = 'DEMO-001';
function base(tar = 'TAR_A') {
  let d = anexar(crearPaciente(vacio(), '2'), ID, { tipo: 'tratamiento', fecha: '2027-01-01', tar });
  const ep = d.pacientes[0].eventos.at(-1).id;
  d = anexar(d, ID, { tipo: 'importacion', fuente: 'prueba', ...importarCSV(d.pacientes[0], `fecha;episodio;componente;dias\n2027-01-01;${ep};${tar === 'TAR_CD' ? 'C' : 'A'};30`) });
  return { d, ep, p: () => d.pacientes[0] };
}
const fila = (ep, extra = {}) => ({ fecha: '2027-01-01', episodio: ep, componente: 'A', dias: 30, linea: 2, ...extra });

/* ---------- sesión de conciliación ---------- */
test('Conciliación: una coincidencia sin identidad de origen no se guarda y devuelve los conflictos, sin tocar nada', () => {
  const { p, ep } = base();
  const r = crearSesionConciliacion(p()).evaluar([fila(ep)], {}, { huella: '', fuente: 'CSV sintético' });
  assert.equal(r.estado, 'conflictos');
  assert.equal(r.conflictos.length, 1);
  assert.equal(r.conflictos[0].fila.linea, 2);
  assert.equal(r.conflictos[0].candidatos.length, 1);
  assert.match(r.mensaje, /coincidencias pendientes.*ninguna fila/s);
  assert.equal('evento' in r, false);
});

test('Conciliación: con una decisión «otra entrega legítima» y su motivo, se prepara un evento válido que se anexa', () => {
  const { d, p, ep } = base(), s = crearSesionConciliacion(p()), e = [fila(ep)];
  s.evaluar(e, {});
  const r = s.evaluar(e, { decision_2: 'nueva', motivo_2: 'Otra entrega legítima' }, { fuente: 'CSV sintético' });
  assert.equal(r.estado, 'listo');
  assert.equal(r.evento.tipo, 'importacion'); assert.equal(r.evento.conciliada, true); assert.equal(r.evento.fuente, 'CSV sintético');
  assert.deepEqual(r.evento.filas.map((f) => f.linea), [2]);
  assert.equal(r.evento.decisiones[0].accion, 'nueva');
  assert.match(r.mensaje, /^1 filas incorporadas; 0 duplicadas omitidas\. Conciliación conservada\.$/);
  const siguiente = anexar(d, ID, r.evento);
  assert.equal(historialDispensaciones(siguiente.pacientes[0]).filter((f) => f.estado === 'vigente').length, 2);
});

test('Conciliación: «es duplicado de» no añade filas pero conserva la decisión como evento', () => {
  const { p, ep } = base(), s = crearSesionConciliacion(p()), e = [fila(ep)];
  const ref = s.evaluar(e, {}).conflictos[0].candidatos[0].referencia;
  const r = s.evaluar(e, { decision_2: `duplicado|${ref}`, motivo_2: 'Es el mismo suministro' });
  assert.equal(r.estado, 'listo');
  assert.deepEqual([r.evento.filas.length, r.evento.duplicadas, r.evento.decisiones.length], [0, [2], 1]);
  assert.match(r.mensaje, /^0 filas incorporadas; 1 duplicadas omitidas\. Conciliación conservada\.$/);
});

test('Conciliación: si cambian las entradas se descartan las decisiones anteriores', () => {
  const { p, ep } = base(), s = crearSesionConciliacion(p());
  s.evaluar([fila(ep)], {});
  assert.equal(s.evaluar([fila(ep)], { decision_2: 'nueva', motivo_2: 'x' }).estado, 'listo');
  const s2 = crearSesionConciliacion(p());
  s2.evaluar([fila(ep)], {});
  const otras = [fila(ep, { dias: 31 })];
  assert.equal(s2.evaluar(otras, { decision_2: 'nueva', motivo_2: 'x' }).estado, 'conflictos', 'con otras entradas la decisión previa no vale');
});

test('Conciliación: sin coincidencias se prepara el evento directamente; una decisión sin motivo se rechaza', () => {
  const { p, ep } = base();
  const nueva = crearSesionConciliacion(p()).evaluar([fila(ep, { fecha: '2027-02-01' })], {});
  assert.equal(nueva.estado, 'listo'); assert.equal(nueva.evento.filas.length, 1);
  const s = crearSesionConciliacion(p()), e = [fila(ep)];
  s.evaluar(e, {});
  assert.throws(() => s.evaluar(e, { decision_2: 'nueva', motivo_2: '' }), /decisión y un motivo/);
});

test('Conciliación: reimportar exactamente el mismo archivo se reconoce por su huella y no añade eventos', () => {
  const { d, p, ep } = base(), e = [fila(ep, { fecha: '2027-02-01' })];
  const primera = crearSesionConciliacion(p()).evaluar(e, {}, { huella: 'abc123', fuente: 'CSV sintético' });
  const d2 = anexar(d, ID, primera.evento);
  const otra = crearSesionConciliacion(d2.pacientes[0]).evaluar(e, {}, { huella: 'abc123', fuente: 'CSV sintético' });
  assert.equal(otra.estado, 'sin_cambios');
  assert.match(otra.mensaje, /Reimportación identificada; no se han añadido duplicados/);
  assert.equal('evento' in otra, false);
});

/* ---------- construcción de entradas y eventos desde formularios ---------- */
test('Entradas manuales: solo los medicamentos con días, con la línea y el origen del formulario', () => {
  const { p, ep } = base('TAR_CD');
  const episodio = episodios(p()).at(-1);
  assert.deepEqual(componentes(episodio), ['C', 'D']);
  const e = entradasManuales(p(), episodio, { fecha: '2027-02-01', episodio: ep, dias0: '', dias1: '20', id_origen0: '', id_origen1: 'DISP-9', origen: 'SISTEMA-DEMO' });
  assert.deepEqual(e, [{ fecha: '2027-02-01', episodio: ep, componente: 'D', linea: 3, dias: 20, origen: 'SISTEMA-DEMO', id_origen: 'DISP-9' }]);
  const sin = entradasManuales(p(), episodio, { fecha: '2027-02-01', episodio: ep, dias0: '7', dias1: '', id_origen0: '', id_origen1: '', origen: '' });
  assert.deepEqual(sin, [{ fecha: '2027-02-01', episodio: ep, componente: 'C', linea: 2, dias: 7 }]);
});

test('Entradas manuales: sin días, con días fuera de rango o con fecha fuera del episodio se rechazan antes de guardar', () => {
  const { p, ep } = base();
  const episodio = episodios(p()).at(-1), v = (x) => ({ fecha: '2027-02-01', episodio: ep, dias0: '30', id_origen0: '', origen: '', ...x });
  assert.throws(() => entradasManuales(p(), episodio, v({ dias0: '' })), /al menos un medicamento/);
  assert.throws(() => entradasManuales(p(), episodio, v({ dias0: '0' })), /entre 1 y 400/);
  assert.throws(() => entradasManuales(p(), episodio, v({ dias0: '500' })), /entre 1 y 400/);
  assert.throws(() => entradasManuales(p(), episodio, v({ fecha: '2026-01-01' })), /incompatibles/);
});

test('CSV y huella: el texto se interpreta con la validación de dominio y la huella es el SHA-256 del contenido', async () => {
  const { p, ep } = base();
  assert.equal(entradasDesdeCSV(p(), `fecha;episodio;componente;dias\n2027-02-01;${ep};A;30`).length, 1);
  assert.throws(() => entradasDesdeCSV(p(), 'otra;cabecera\n1;2'), /Cabecera requerida/);
  assert.equal(await huellaTexto('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('Corrección: sustituir conserva la identidad de origen; anular no lleva sustitución; el evento es válido para anexar', () => {
  const { d, p, ep } = base();
  const original = historialDispensaciones(p()).find((f) => f.estado === 'vigente');
  const v = { operacion: 'sustituir', fecha: '2027-01-01', episodio: ep, componente: 'A', dias: '20', motivo: 'Corrección sintética', coincidencia_confirmada: undefined };
  const e = construirCorreccion(original, v);
  assert.deepEqual([e.tipo, e.referencia, e.sustitucion.dias, e.coincidencia_confirmada], ['correccion_dispensacion', original.referencia, 20, false]);
  assert.equal('origen' in e.sustitucion, false);
  const conOrigen = construirCorreccion({ ...original, origen: 'SIS', id_origen: 'D-1' }, v);
  assert.deepEqual([conOrigen.sustitucion.origen, conOrigen.sustitucion.id_origen], ['SIS', 'D-1']);
  const anular = construirCorreccion(original, { ...v, operacion: 'anular', coincidencia_confirmada: 'on' });
  assert.deepEqual([anular.sustitucion, anular.coincidencia_confirmada], [null, true]);
  assert.doesNotThrow(() => anexar(d, ID, e));
});

test('Valoración manual y gestión de señal: eventos construidos desde formulario y válidos', () => {
  const { d, p } = base();
  const ev = construirEvaluacionManual({ fecha: '2027-01-31', periodo_inicio: '2027-01-01', periodo_fin: '2027-01-31', metodo: 'Autoinforme', resultado: 'No concluyente', porcentaje: '' });
  assert.equal(ev.porcentaje, null);
  assert.equal(construirEvaluacionManual({ ...ev, porcentaje: '0' }).porcentaje, 0);
  assert.equal(construirEvaluacionManual({ ...ev, porcentaje: '37.5' }).porcentaje, 37.5);
  assert.doesNotThrow(() => anexar(d, ID, ev));
  const fin = '2027-03-31', reglas = { ...REGLAS, ventana: 90 };
  const s = evaluarSenales(p(), fin, reglas).find((x) => x.regla === 'cobertura_demo');
  assert.ok(s, 'la base debe generar la señal de cobertura para la prueba');
  const g = construirGestionSenal(s, { estado: 'revisada', motivo: 'Revisada en simulación', actuacion: '' }, { fin, reglas });
  assert.deepEqual([g.tipo, g.fecha, g.regla, g.evidencia, g.estado, g.actuacion], ['gestion_senal', fin, s.regla, s.evidencia, 'revisada', '']);
  assert.notEqual(g.reglas, reglas, 'copia de las reglas');
  assert.doesNotThrow(() => anexar(d, ID, g));
});

/* ---------- selección de TAR desde CIMA ---------- */
const ficha = (n, via = 'VÍA ORAL') => normalizarFicha({ ...fichaPrueba, nregistro: String(1000 + n), nombre: 'TAR SINTÉTICO ' + n, viasAdministracion: [{ nombre: via }] });
test('Selección de TAR: añadir con su presentación, rechazar repetidos, mezcla de vías y más de 8; quitar', () => {
  const s = crearSeleccionTar();
  assert.deepEqual(s.lista(), []);
  const r = s.anadir(ficha(1), 0);
  assert.equal(r.ok, true); assert.match(r.mensaje, /Medicamento añadido/);
  assert.equal(s.lista()[0].nregistro, '1001'); assert.ok(s.lista()[0].cn && s.lista()[0].presentacion); assert.equal('presentaciones' in s.lista()[0], false);
  assert.deepEqual(s.anadir(ficha(1), 0), { ok: false, mensaje: 'Ese medicamento ya está seleccionado.' });
  const mezcla = s.anadir(ficha(2, 'VÍA INTRAMUSCULAR'), 0);
  assert.equal(mezcla.ok, false); assert.match(mezcla.mensaje, /No mezcle/); assert.equal(s.lista().length, 1);
  for (let i = 2; i <= 8; i++) assert.equal(s.anadir(ficha(i), 0).ok, true);
  assert.deepEqual(s.anadir(ficha(9), 0), { ok: false, mensaje: 'Máximo 8 medicamentos por episodio.' });
  s.quitar(0);
  assert.equal(s.lista().length, 7);
});

test('Selección de TAR: el evento de tratamiento exige medicamentos, fija la modalidad y es válido para anexar', () => {
  const s = crearSeleccionTar();
  assert.throws(() => s.eventoTratamiento({ fecha: '2027-01-01', confirmado: true }), /al menos un medicamento/);
  s.anadir(ficha(1), 0); s.anadir(ficha(2), 0);
  const e = s.eventoTratamiento({ fecha: '2027-01-01', confirmado: true });
  assert.deepEqual([e.tipo, e.tar, e.modalidad, e.confirmado, e.medicamentos.length], ['tratamiento', 'CIMA', 'oral', true, 2]);
  assert.doesNotThrow(() => anexar(crearPaciente(vacio(), '2'), ID, e));
  assert.throws(() => anexar(crearPaciente(vacio(), '2'), ID, s.eventoTratamiento({ fecha: '2027-01-01', confirmado: false })), /Confirme/);
  const iny = crearSeleccionTar(); iny.anadir(ficha(3, 'VÍA INTRAMUSCULAR'), 0);
  assert.equal(iny.eventoTratamiento({ fecha: '2027-01-01', confirmado: true }).modalidad, 'inyectable');
});
