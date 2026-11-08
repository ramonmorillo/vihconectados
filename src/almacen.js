import {CATALOGOS,EXPERIENCIA,fecha,episodios,ESTADOS,estadoComunicacion,transicion} from './motor.js';
const copia=x=>structuredClone(x);
export const vacio=()=>({formato:'vihconectados/demo@1',pacientes:[]});
export function crearPaciente(db,nivel='3') {
  if(!['1','2','3'].includes(nivel))throw Error('Nivel CMO inválido');
  const n=db.pacientes.length+1,id=`DEMO-${String(n).padStart(3,'0')}`;
  return {...copia(db),pacientes:[...copia(db.pacientes),{id,sintetico:true,eventos:[{id:crypto.randomUUID(),tipo:'nivel',nivel,registrado:new Date().toISOString()}]}]};
}
/** Puerto de repositorio: leer() y guardar(db). Un backend futuro debe validar y autorizar cada comando. */
export class RepositorioDemo {
  constructor(storage){this.storage=storage;this.key='vihconectados.demo.v1';}
  leer(){const raw=this.storage.getItem(this.key);if(!raw)return vacio(); const db=JSON.parse(raw);if(db.formato!=='vihconectados/demo@1'||!Array.isArray(db.pacientes))throw Error('Almacenamiento incompatible');return copia(db);}
  guardar(db){this.storage.setItem(this.key,JSON.stringify(db));}
}
export function anexar(db,id,evento) {
  const next=copia(db),p=next.pacientes.find(p=>p.id===id);if(!p)throw Error('Caso inexistente');
  const e=copia(evento);
  if(e.fecha)fecha(e.fecha);
  if(e.tipo==='tratamiento') {
    if(!CATALOGOS[e.tar]||!e.fecha||episodios(p).some(x=>x.fecha>=e.fecha))throw Error('Añada el TAR después del último inicio registrado');
  } else if(e.tipo==='visita') {
    if(!e.fecha||Object.entries(EXPERIENCIA).some(([k,v])=>!v.includes(e.experiencia?.[k])))throw Error('Experiencia no válida');
    if(p.eventos.some(x=>x.tipo==='visita'&&x.fecha>e.fecha))throw Error('Fecha anterior a la última visita');
  } else if(e.tipo==='nivel') {if(!['1','2','3'].includes(e.nivel))throw Error('Nivel inválido');}
  else if(e.tipo==='actuacion') {if(!e.texto||!['pendiente','realizada'].includes(e.estado))throw Error('Actuación no válida');}
  else if(e.tipo==='estado_actuacion') {if(!p.eventos.some(x=>x.id===e.actuacion&&x.tipo==='actuacion')||e.estado!=='realizada')throw Error('Actuación inexistente');}
  else if(e.tipo==='estado_comunicacion') {if(!p.eventos.some(x=>x.id===e.informe&&x.tipo==='informe'))throw Error('Informe inexistente');transicion(estadoComunicacion(p,e.informe),e.estado);}
  else if(!['importacion','informe','revision_alertas','configuracion'].includes(e.tipo))throw Error('Tipo de evento desconocido');
  e.id=crypto.randomUUID();e.registrado=new Date().toISOString();p.eventos.push(e);return next;
}
