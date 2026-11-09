import { fecha, cobertura, nombreTar } from './motor.js';
import { tratamientoHasta, nivelHasta, aplicable } from './temporal.js';
export const RESPONSABLES = ['Farmacia Hospitalaria', 'Infecciosas', 'Equipo compartido'];
export const PROBLEMAS = ['Acceso a la dispensación', 'Dificultades de toma referidas', 'Tolerancia referida', 'Conciliación de datos', 'Coordinación asistencial', 'Otro problema sintético'];
export const RESULTADOS = ['Pendiente de evaluar', 'Objetivo alcanzado', 'Objetivo parcialmente alcanzado', 'Objetivo no alcanzado', 'No evaluable'];
const texto = (s,max=500) => typeof s==='string' && s.trim().length>0 && s.length<=max;
export function contextoConsulta(p,fin,reglas) {
  return {fecha:fin,tratamiento:nombreTar(tratamientoHasta(p,fin)),episodio:tratamientoHasta(p,fin)?.id || null,nivel:nivelHasta(p,fin),cobertura:cobertura(p,fin,reglas)};
}
export function validarConsulta(p,e) {
  fecha(e.fecha);fecha(e.revision);
  if (!PROBLEMAS.includes(e.problema) || !texto(e.objetivo) || !RESPONSABLES.includes(e.responsable) || e.revision<e.fecha || e.revisado!==true)
    throw Error('Revise problema, objetivo (1–500 caracteres), responsable, fecha de revisión y confirmación profesional.');
  if (!p.eventos.some(a=>a.tipo==='actuacion' && a.id===e.actuacion && aplicable(a,e.fecha))) throw Error('Vincule una actuación existente y aplicable a la consulta.');
  for (const [campo,tipo] of [['visita','visita'],['evaluacion','evaluacion_adherencia']])
    if (e[campo] && !p.eventos.some(a=>a.id===e[campo] && a.tipo===tipo && aplicable(a,e.fecha))) throw Error('La experiencia o valoración vinculada no es aplicable al corte.');
}
export function seguimientosConsulta(p,id,fin) {
  return p.eventos.filter(e=>e.tipo==='seguimiento_consulta' && e.consulta===id && aplicable(e,fin)).sort((a,b)=>a.fecha.localeCompare(b.fecha));
}
export function estadoConsulta(p,c,fin) {
  const historial=seguimientosConsulta(p,c.id,fin),ultimo=historial.at(-1);
  const estado=ultimo?.estado || 'abierta',revision=ultimo?ultimo.revision:c.revision;
  const actuacion=p.eventos.find(e=>e.tipo==='actuacion' && e.id===c.actuacion && aplicable(e,fin));
  const realizada=actuacion?.estado==='realizada' || p.eventos.some(e=>e.tipo==='estado_actuacion' && e.actuacion===c.actuacion && aplicable(e,fin));
  return {...c,estado,revision,modificable:!seguimientosConsulta(p,c.id).some(e=>fin && e.fecha>fin),responsable:ultimo?.responsable || c.responsable,resultado:ultimo?.resultado || 'Pendiente de evaluar',observaciones:ultimo?.observaciones || '',historial,
    actuacion_texto:actuacion?.texto || 'Actuación no disponible al corte',actuacion_realizada:!!realizada,
    plazo:estado==='cerrada'?'cerrada':revision<fin?'vencida':revision===fin?'para el corte':'próxima'};
}
export function consultasHasta(p,fin) {
  return p.eventos.filter(e=>e.tipo==='consulta' && aplicable(e,fin)).map(c=>estadoConsulta(p,c,fin));
}
export function agendaConsultas(ps,fin) {
  return ps.flatMap(p=>consultasHasta(p,fin).map(c=>({...c,paciente:p.id}))).sort((a,b)=>(a.estado==='cerrada')-(b.estado==='cerrada') || (a.revision || a.fecha).localeCompare(b.revision || b.fecha));
}
export function validarSeguimiento(p,e) {
  fecha(e.fecha);
  const c=p.eventos.find(c=>c.tipo==='consulta' && c.id===e.consulta);
  if (!c || e.fecha<c.fecha) throw Error('Consulta inexistente o seguimiento anterior a la consulta.');
  const ultimo=seguimientosConsulta(p,c.id).at(-1);
  if (ultimo?.estado==='cerrada') throw Error('Este plan ya está cerrado. Inicie una nueva consulta para acordar un nuevo plan.');
  if (ultimo && e.fecha<ultimo.fecha) throw Error('El seguimiento no puede preceder al último registrado.');
  if (!['en_curso','cerrada'].includes(e.estado) || !RESULTADOS.includes(e.resultado) || !RESPONSABLES.includes(e.responsable) || !texto(e.observaciones)) throw Error('Revise estado, resultado, responsable y observaciones sintéticas (1–500 caracteres).');
  if (e.estado==='cerrada') {
    if (e.resultado==='Pendiente de evaluar' || e.revision) throw Error('Para cerrar indique un resultado (también puede ser no evaluable) y deje vacía la próxima revisión.');
  } else {fecha(e.revision);if(e.revision<e.fecha) throw Error('La próxima revisión no puede preceder al seguimiento.');}
}
export function textoPlan(c) {
  return `${c.problema}. Objetivo: ${c.objetivo}. Actuación: ${c.actuacion_texto} (${c.actuacion_realizada?'realizada':'pendiente'}). Responsable funcional: ${c.responsable}. Plan: ${c.estado}. ${c.estado==='cerrada'?'Sin revisión pendiente':'Revisión: '+c.revision}. Resultado: ${c.resultado}.${c.observaciones?' Observaciones: '+c.observaciones:''}`;
}
