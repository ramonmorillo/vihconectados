import { crearGuardadoConciliado } from "./revision-datos.js";
import { episodios, componentes, nombreTar, prepararDispensacionManual, validarDispensacion } from './motor.js';
import { esc } from './vista-informes.js';
import { METODOS_ADHERENCIA, RESULTADOS_ADHERENCIA, evaluacionesAdherencia, textoEvaluacionAdherencia } from './adherencia.js';
export function abrirDispensacionManual({ p, fin, modal, guardar }) {
  const eps = episodios(p).filter(ep => ep.modalidad !== 'inyectable');
  if (!eps.length) throw Error('Registre primero un episodio de TAR oral. No se calculan días de suministro de inyectables.');
  const defecto = eps.filter(e=>e.fecha<=fin).at(-1) || eps.at(-1);
  const guardarPlan=crearGuardadoConciliado(p,guardar);
  modal('Registrar dispensación manual', `<p class="notice">Días de suministro declarados, no dosis ni tomas. Use solo datos sintéticos. Se aplica la misma validación y detección de duplicados que al CSV.</p><label>Episodio de TAR oral<select name="episodio" id="episodioManual">${eps.map(ep=>`<option value="${esc(ep.id)}" ${ep.id===defecto.id?'selected':''}>${esc(ep.fecha)} · ${esc(nombreTar(ep))}</option>`).join('')}</select></label><label>Fecha de dispensación<input name="fecha" type="date" value="${fin}" required></label><label>Origen (opcional, solo si hay identificadores)<input name="origen" maxlength="80" placeholder="SISTEMA-DEMO"></label><div id="suministrosManuales"></div><div id="conciliacionDispensaciones"></div><p class="muted">Indique los días de los medicamentos dispensados y deje en blanco los restantes. No se deducen días del envase. En combinaciones orales, el PDC exige cobertura simultánea de todos los componentes.</p>`, v=>{
    const ep=eps.find(e=>e.id===v.episodio);
    const entradas=componentes(ep).map((componente,i)=>({fecha:v.fecha,episodio:v.episodio,componente,linea:i+2,dias:v['dias'+i] === '' ? null : Number(v['dias'+i]),...(v['id_origen'+i] || v.origen?{origen:v.origen,id_origen:v['id_origen'+i]}:{})})).filter(f=>f.dias!==null);
    if (!entradas.length) throw Error('Indique días para al menos un medicamento.');
    entradas.forEach(f=>validarDispensacion(p,f));
    return guardarPlan(entradas,v);
  });
  const selector=document.getElementById('episodioManual');
  const dibujar=()=>{
    const ep=eps.find(e=>e.id===selector.value);
    document.getElementById('suministrosManuales').innerHTML=componentes(ep).map((c,i)=>`<label>Días de suministro · ${esc(ep.medicamentos?.[i]?.nombre || c)}<input name="dias${i}" type="number" min="1" max="400" step="1" inputmode="numeric" aria-label="Días de suministro ${esc(c)}"></label><label>Identificador de origen · ${esc(c)} (opcional)<input name="id_origen${i}" maxlength="80" placeholder="DISP-DEMO-001"></label>`).join('');
  };
  selector.onchange=()=>{dibujar();document.getElementById('conciliacionDispensaciones').innerHTML='';}; dibujar();
  document.getElementById('formulario').querySelector('form').addEventListener('input',ev=>{
    if (/^(fecha|origen|dias\d+|id_origen\d+)$/.test(ev.target.name || '')) document.getElementById('conciliacionDispensaciones').innerHTML='';
  });
}
export function abrirEvaluacionManual({fin,modal,guardar}) {
  const opciones=arr=>arr.map(s=>`<option>${esc(s)}</option>`).join('');
  modal('Registrar valoración manual de adherencia', `<p class="notice">Valoración referida o revisada por el profesional, separada de la cobertura de dispensación. El porcentaje es opcional y no se calcula a partir de la entrevista ni del PDC.</p><label>Fecha de evaluación<input type="date" name="fecha" value="${fin}" required></label><label>Inicio del periodo<input type="date" name="periodo_inicio" required></label><label>Fin del periodo (excluido)<input type="date" name="periodo_fin" value="${fin}" required></label><label>Método<select name="metodo">${opciones(METODOS_ADHERENCIA)}</select></label><label>Resultado referido<select name="resultado">${opciones(RESULTADOS_ADHERENCIA)}</select></label><label>Porcentaje declarado (opcional, 0–100)<input type="number" name="porcentaje" min="0" max="100" step="0.1" inputmode="decimal"></label><p class="muted">No es un cuestionario validado ni confirmación objetiva de toma. No se generan umbrales, alertas ni diagnósticos a partir de esta anotación.</p>`,v=>guardar({tipo:'evaluacion_adherencia',fecha:v.fecha,periodo_inicio:v.periodo_inicio,periodo_fin:v.periodo_fin,metodo:v.metodo,resultado:v.resultado,porcentaje:v.porcentaje === '' ? null : Number(v.porcentaje)}));
}
export function vistaEvaluacionesManuales(p, fin) {
  const es=evaluacionesAdherencia(p,fin);
  return `<section class="card"><div class="section-head"><h2>Valoración manual de adherencia</h2><button data-action="evaluacion-manual">Registrar valoración manual</button></div><p class="muted">Registro independiente del PDC. Cada valoración se conserva; una nueva no sobrescribe la anterior.</p>${es.length ? [...es].reverse().map(e=>`<article class="item"><p>${esc(textoEvaluacionAdherencia(e))}</p><small>Registro ${esc(e.id)} · ${esc(e.registrado)}</small></article>`).join('') : '<p>Sin valoraciones manuales para esta fecha.</p>'}</section>`;
}
