import { anexar } from '../src/almacen.js';
import { alertas, importarCSV, prepararDispensacionManual, REGLAS } from '../src/motor.js';
import { planificarDispensaciones } from '../src/dispensaciones.js';
import { evaluarSenales } from '../src/senales.js';
import { informe, informePaciente } from '../src/informes.js';
import { registrarConsulta, registrarSeguimiento } from '../src/comandos-consulta.js';
import { PROBLEMAS, RESPONSABLES } from '../src/consulta.js';
import { normalizarFicha, modalidadTar } from '../src/cima.js';
import { demo } from '../src/demo.js';
import { fichaPrueba } from './fixtures-cima.js';

/** Base con los 18 tipos de evento, generada por los productores reales de la aplicación (compartida por varias pruebas). */
export const EXP = { barrera: 'No explorada', dificultad: 'No explorada', efecto: 'No explorado', carga: 'No explorada', preferencia: 'No explorada' };

const inyectable = () => {
  const ms = ['999993', '999994'].map((id) => {
    const { presentaciones, ...m } = normalizarFicha({ ...fichaPrueba, nregistro: id, nombre: 'TAR ' + id, viasAdministracion: [{ nombre: 'VÍA INTRAMUSCULAR' }] });
    return { ...m, cn: id, presentacion: presentaciones[0].nombre };
  });
  return { tipo: 'tratamiento', fecha: '2027-01-01', tar: 'CIMA', medicamentos: ms, modalidad: modalidadTar(ms), confirmado: true };
};

export function baseCompleta() {
  const id = 'DEMO-001', fin = '2026-11-08';
  let d = demo();
  const p = () => d.pacientes.find((x) => x.id === id);
  const ultimo = () => p().eventos.at(-1).id;
  const add = (e) => { d = anexar(d, id, e); return ultimo(); };
  const ep = p().eventos.filter((e) => e.tipo === 'tratamiento').at(-1).id;
  add({ tipo: 'nivel', fecha: fin, nivel: '1' });
  const act = add({ tipo: 'actuacion', fecha: fin, texto: 'Acción sintética', estado: 'pendiente', nivel: '1', fuente: 'prueba' });
  add({ tipo: 'estado_actuacion', fecha: fin, actuacion: act, estado: 'realizada' });
  add({ tipo: 'evaluacion_adherencia', fecha: fin, periodo_inicio: '2026-05-01', periodo_fin: fin, metodo: 'Autoinforme', resultado: 'No concluyente', porcentaje: null });
  d = registrarConsulta(d, id, { experiencia_modo: 'nueva', experiencia: { ...EXP }, fecha: '2026-11-10', adherencia: { periodo_inicio: '2026-05-01', periodo_fin: '2026-11-10', metodo: 'Autoinforme', resultado: 'No concluyente', porcentaje: 50 }, actuacion_modo: 'nueva', accion: 'Plan sintético', problema: PROBLEMAS[0], objetivo: 'Objetivo sintético', responsable: RESPONSABLES[0], revision: '2026-12-01', revisado: true }, { ...REGLAS });
  const consulta = p().eventos.filter((e) => e.tipo === 'consulta').at(-1).id;
  d = registrarSeguimiento(d, id, { consulta, fecha: '2026-11-12', estado: 'en_curso', resultado: 'Pendiente de evaluar', observaciones: 'Seguimiento sintético', responsable: RESPONSABLES[0], revision: '2026-12-10', marcar_realizada: true });
  add(informe(p(), fin, REGLAS));
  const inf = ultimo();
  add({ tipo: 'estado_comunicacion', fecha: fin, informe: inf, estado: 'comunicado' });
  add(informePaciente(p(), fin, { instrucciones: 'Instrucciones sintéticas', proxima_cita: '2026-12-15', incluir_recurso: true, revisado: true }, REGLAS));
  add({ tipo: 'revision_alertas', fecha: fin, resultado: 'Requiere exploración', alertas: alertas(p(), fin), reglas: { ...REGLAS } });
  const s = evaluarSenales(p(), fin)[0];
  add({ tipo: 'gestion_senal', fecha: fin, regla: s.regla, evidencia: s.evidencia, estado: 'revisada', motivo: 'Motivo sintético', actuacion: '', reglas: { ...REGLAS } });
  add({ tipo: 'importacion', fuente: 'CSV', ...importarCSV(p(), `fecha;episodio;componente;dias\n2026-11-20;${ep};A;30`) });
  const lote = ultimo();
  const entradas = [{ fecha: '2026-11-25', episodio: ep, componente: 'A', dias: 10, linea: 2 }];
  add({ tipo: 'importacion', conciliada: true, fuente: 'CSV sintético', entradas, resoluciones: {}, huella: 'abc', ...planificarDispensaciones(p(), entradas, { resoluciones: {}, huella: 'abc' }) });
  add({ tipo: 'importacion', fuente: 'Entrada manual', ...prepararDispensacionManual(p(), { fecha: '2026-11-26', episodio: ep, suministros: [{ componente: 'A', dias: 5 }] }) });
  add({ tipo: 'correccion_dispensacion', referencia: `${lote}:0`, motivo: 'Corrección sintética', sustitucion: { fecha: '2026-11-20', episodio: ep, componente: 'A', dias: 20 }, coincidencia_confirmada: false });
  add({ tipo: 'configuracion', reglas: { ...REGLAS } });
  add({ tipo: 'solicitud_valoracion', fecha: fin, origen: 'Farmacia Hospitalaria', destino: 'Infecciosas', motivo: 'Motivo sintético de la solicitud', plazo: '2026-11-20', senal: 'cobertura_demo' });
  const sol = ultimo();
  add({ tipo: 'estado_solicitud', fecha: fin, solicitud: sol, estado: 'recibida', perfil: 'Infecciosas' });
  add({ tipo: 'estado_solicitud', fecha: fin, solicitud: sol, estado: 'respondida', perfil: 'Infecciosas', respuesta: 'Respuesta sintética' });
  add(inyectable());
  return d;
}
