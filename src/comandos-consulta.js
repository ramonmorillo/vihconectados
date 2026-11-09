import { anexar } from './almacen.js';
import { ultimoEvento, fechaEfectiva } from './temporal.js';
/** Comandos compuestos: el repositorio se guarda una sola vez, después de validar todos los eventos. */
export function registrarConsulta(db,id,v,reglas) {
  if (!["existente","nueva"].includes(v.experiencia_modo) || !["existente","nueva"].includes(v.actuacion_modo)) throw Error("Modo de registro no válido.");
  if(v.actuacion_modo==='nueva' && (typeof v.accion!=='string' || !v.accion.trim() || v.accion.length>500))throw Error('Describa la actuación sintética (1–500 caracteres).');
  let next=db;
  const agregar=e=>{next=anexar(next,id,e);return next.pacientes.find(p=>p.id===id).eventos.at(-1).id;};
  const p=()=>next.pacientes.find(p=>p.id===id);
  if (!p()) throw Error('Caso inexistente.');
  const visita=v.experiencia_modo==='nueva'?agregar({tipo:'visita',fecha:v.fecha,experiencia:v.experiencia}):ultimoEvento(p(),'visita',v.fecha)?.id || null;
  const evaluacion=v.adherencia?agregar({tipo:'evaluacion_adherencia',fecha:v.fecha,periodo_inicio:v.adherencia.periodo_inicio,periodo_fin:v.adherencia.periodo_fin,metodo:v.adherencia.metodo,resultado:v.adherencia.resultado,porcentaje:v.adherencia.porcentaje}):ultimoEvento(p(),'evaluacion_adherencia',v.fecha)?.id || null;
  const actuacion=v.actuacion_modo==='existente'?v.actuacion:agregar({tipo:'actuacion',fecha:v.fecha,texto:v.accion,estado:'pendiente',fuente:'Plan acordado en consulta guiada · sintético'});
  agregar({tipo:'consulta',fecha:v.fecha,problema:v.problema,objetivo:v.objetivo,responsable:v.responsable,revision:v.revision,revisado:v.revisado,visita,evaluacion,actuacion,reglas:{...reglas}});
  return next;
}
export function registrarSeguimiento(db,id,v) {
  let next=anexar(db,id,{tipo:'seguimiento_consulta',consulta:v.consulta,fecha:v.fecha,estado:v.estado,resultado:v.resultado,observaciones:v.observaciones,responsable:v.responsable,revision:v.estado==='cerrada'?'':v.revision});
  if (v.marcar_realizada) {
    const p=next.pacientes.find(p=>p.id===id),c=p.eventos.find(e=>e.tipo==='consulta' && e.id===v.consulta);
    const estado=p.eventos.find(e=>e.tipo==='estado_actuacion' && e.actuacion===c.actuacion);
    if(estado && fechaEfectiva(estado)>v.fecha)throw Error('La actuación tiene un estado posterior. Revise la fecha antes de confirmar su realización.');
    const ya=!!estado;
    if (!ya && p.eventos.find(e=>e.id===c.actuacion)?.estado!=='realizada') next=anexar(next,id,{tipo:'estado_actuacion',actuacion:c.actuacion,fecha:v.fecha,estado:'realizada'});
  }
  return next;
}
