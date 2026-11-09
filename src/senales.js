import { alertas, cobertura, episodios, dispensaciones } from './motor.js';
import { aplicable, ultimoEvento, fechaEfectiva } from './temporal.js';
const canonico = valor => JSON.stringify(valor, (_k,v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])) : v);
const ESTADOS = ['revisada','justificada','actuacion','cerrada'];
export const ESTADOS_SENAL = ESTADOS;
/** Huella determinista de evidencias efectivas; no depende del reloj, render o gestión. */
export function evaluarSenales(p, fin, reglas) {
  const c=cobertura(p,fin,reglas);
  return alertas(p,fin,reglas).map(a=>{
    const categoria=['sin_datos','tar_inyectable_no_evaluable'].includes(a.regla)?'aviso':a.regla==='datos_fuera_episodio'?'datos':'asistencial';
    const evidencia=canonico({regla:a.regla,reglas:c.reglas,inicio:c.inicio,fin,detalle:c.detalle,excluidos:c.excluidos,
      tratamientos:episodios(p).filter(e=>e.fecha<=fin).map(e=>e.id),
      suministros:dispensaciones(p).filter(f=>f.fecha<fin).map(f=>[f.referencia,f.fecha,f.episodio,f.componente,f.dias]),
      correcciones:p.eventos.filter(e=>e.tipo==='correccion_dispensacion' && (e.fecha<fin || e.sustitucion?.fecha<fin)).map(e=>e.id),
      visita:a.regla==='experiencia_referida'?ultimoEvento(p,'visita',fin)?.id:null});
    const gestiones=p.eventos.filter(e=>e.tipo==='gestion_senal' && e.regla===a.regla && aplicable(e,fin));
    const gestion=gestiones.filter(e=>e.evidencia===evidencia).sort((a,b)=>fechaEfectiva(a).localeCompare(fechaEfectiva(b))).at(-1);
    return {...a,categoria,evidencia,gestion:gestion || null,estado_gestion:gestion?.estado || 'pendiente',reabierta:!gestion && gestiones.length>0};
  });
}
export const pendientesSenales = (p,fin,r) => evaluarSenales(p,fin,r).filter(s=>s.categoria!=='aviso' && s.estado_gestion==='pendiente');
export function validarGestionSenal(p,e,r) {
  if (!ESTADOS.includes(e.estado) || typeof e.motivo!=='string' || !e.motivo.trim() || e.motivo.length>300) throw Error('Seleccione estado y motivo sintético (1–300 caracteres).');
  const s=evaluarSenales(p,e.fecha,r).find(s=>s.regla===e.regla);
  if (!s || s.evidencia!==e.evidencia) throw Error('Las evidencias de la señal han cambiado. Revise de nuevo antes de guardar.');
  if (e.estado==='actuacion' && !p.eventos.some(a=>a.tipo==='actuacion' && a.id===e.actuacion && aplicable(a,e.fecha))) throw Error('Vincule una actuación existente aplicable al corte.');
}
