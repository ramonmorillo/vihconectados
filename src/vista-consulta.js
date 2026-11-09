import { PROBLEMAS, RESPONSABLES, RESULTADOS, contextoConsulta, consultasHasta, agendaConsultas, textoPlan } from './consulta.js';
import { registrarConsulta, registrarSeguimiento } from './comandos-consulta.js';
import { EXPERIENCIA } from './motor.js';
import { ultimoEvento, aplicable, nivelHasta } from './temporal.js';
import { METODOS_ADHERENCIA, RESULTADOS_ADHERENCIA, textoEvaluacionAdherencia } from './adherencia.js';
import { esc } from './vista-informes.js';
const opciones=(xs,valor='')=>xs.map(x=>`<option value="${esc(x)}" ${x===valor?'selected':''}>${esc(x)}</option>`).join('');
const etiquetas={barrera:'Barreras',dificultad:'Dificultad de toma',efecto:'Efectos referidos',carga:'Carga percibida',preferencia:'Preferencia de seguimiento'};
export function abrirConsultaGuiada({db,id,fin,reglas,biblioteca,modal,guardar}) {
  const p=db.pacientes.find(p=>p.id===id);
  if(!p)throw Error('Caso inexistente.');
  const actuaciones=p.eventos.filter(e=>e.tipo==='actuacion');
  modal('Consulta guiada', `<p>Un problema y un objetivo por plan. Puede iniciar otros planes independientes. Los campos son exclusivamente sintéticos.</p><p id="pasoConsulta" tabindex="-1" class="eyebrow" aria-live="polite"></p>
  <fieldset data-paso="0"><legend>1. Revisar el contexto</legend><label>Fecha efectiva de consulta<input type="date" name="fecha" id="fechaConsulta" value="${fin}" required></label><div id="contextoConsulta"></div><label class="check-line"><input type="checkbox" name="contexto_revisado" required> He revisado tratamiento, cobertura y límites de los datos.</label></fieldset>
  <fieldset data-paso="1" hidden><legend>2. Experiencia y valoración</legend><div id="experienciaVinculada" class="notice"></div><label>Experiencia<select name="experiencia_modo" id="modoExperiencia"><option value="existente">Vincular la última experiencia aplicable, si existe</option><option value="nueva">Registrar experiencia de esta consulta</option></select></label><div id="nuevaExperiencia">${Object.entries(EXPERIENCIA).map(([k,xs])=>`<label>${etiquetas[k]}<select name="exp_${k}">${opciones(xs)}</select></label>`).join('')}</div><label class="check-line"><input type="checkbox" id="nuevaAdherencia" name="nueva_adherencia"> Registrar valoración manual de adherencia en esta consulta</label><div id="valoracionPrevia"></div><div id="camposAdherencia"><label>Inicio del periodo<input name="periodo_inicio" type="date" required></label><label>Fin del periodo (excluido)<input name="periodo_fin" type="date" value="${fin}" required></label><label>Método<select name="metodo">${opciones(METODOS_ADHERENCIA)}</select></label><label>Resultado referido<select name="resultado_referido">${opciones(RESULTADOS_ADHERENCIA)}</select></label><label>Porcentaje declarado opcional (0–100)<input type="number" name="porcentaje" min="0" max="100" step="0.1"></label><p class="muted">La valoración es independiente del PDC y no confirma objetivamente la toma.</p></div></fieldset>
  <fieldset data-paso="2" hidden><legend>3. Problema, objetivo y actuación</legend><label>Problema principal<select name="problema">${opciones(PROBLEMAS)}</select></label><label>Objetivo acordado (solo sintético)<textarea name="objetivo" maxlength="500" required placeholder="Qué se espera conseguir y cómo se comprobará"></textarea></label><label>Actuación<select name="actuacion_modo" id="modoActuacion"><option value="nueva">Crear una actuación pendiente para este plan</option><option value="existente">Vincular una actuación ya registrada</option></select></label><div id="accionNueva"><label>Biblioteca CMO (selección opcional)<select id="bibliotecaConsulta"><option value="">Redactar una actuación propia</option></select></label><label>Actuación acordada (solo sintética)<textarea name="accion" maxlength="500" required></textarea></label></div><div id="accionExistente"><label>Actuación registrada<select name="actuacion" required><option value="">Seleccione una actuación</option>${actuaciones.map(e=>`<option value="${esc(e.id)}">${esc(e.texto)}</option>`).join('')}</select></label><p class="muted">Vincular no cambia el estado de la actuación existente.</p></div></fieldset>
  <fieldset data-paso="3" hidden><legend>4. Acordar seguimiento</legend><label>Responsable funcional (simulado)<select name="responsable">${opciones(RESPONSABLES)}</select></label><label>Fecha de revisión acordada<input type="date" name="revision" id="revisionConsulta" value="${fin}" required></label><div id="resumenConsulta" class="notice"></div><label class="check-line"><input type="checkbox" name="revisado" required> He revisado el plan acordado para este caso sintético.</label><p class="muted">Guardar crea un plan abierto. La nueva actuación queda pendiente hasta que se registre como realizada; el objetivo se evalúa después.</p></fieldset>
  <div class="actions"><button type="button" id="consultaAnterior">Anterior</button><button type="button" id="consultaSiguiente" class="primary">Siguiente</button></div>`,v=>{
    if(v.contexto_revisado!=='on')throw Error('Confirme la revisión del contexto.');
    const experiencia=Object.fromEntries(Object.keys(EXPERIENCIA).map(k=>[k,v['exp_'+k]]));
    const adherencia=v.nueva_adherencia==='on'?{periodo_inicio:v.periodo_inicio,periodo_fin:v.periodo_fin,metodo:v.metodo,resultado:v.resultado_referido,porcentaje:v.porcentaje===''?null:Number(v.porcentaje)}:null;
    guardar(registrarConsulta(db,id,{...v,experiencia,adherencia,revisado:v.revisado==='on'},reglas));
    return 'Consulta y plan guardados. La nueva actuación queda pendiente y el objetivo está pendiente de evaluar.';
  });
  const $=id=>document.getElementById(id),form=$('formulario').querySelector('form'),pasos=[...form.querySelectorAll('[data-paso]')],save=form.querySelector('button[type=submit]') || form.querySelector('button:not([type])');
  let paso=0,catalogo=[];
  const grupo=(id,activo)=>{const el=$(id);el.hidden=!activo;el.querySelectorAll('input,select,textarea').forEach(x=>x.disabled=!activo);};
  const alternar=()=>{grupo('nuevaExperiencia',$('modoExperiencia').value==='nueva');grupo('camposAdherencia',$('nuevaAdherencia').checked);grupo('accionNueva',$('modoActuacion').value==='nueva');grupo('accionExistente',$('modoActuacion').value==='existente');};
  const actualizar=()=>{
    const dia=$('fechaConsulta').value;if(!dia)return;
    try {
      const c=contextoConsulta(p,dia,reglas),v=ultimoEvento(p,'visita',dia),a=ultimoEvento(p,'evaluacion_adherencia',dia);
      $('contextoConsulta').innerHTML=`<p><strong>${esc(c.tratamiento)}</strong> · Nivel CMO ${esc(c.nivel || 'sin dato')}</p><p>PDC oral: ${c.cobertura.pdc===null?'Sin cálculo oral aplicable':new Intl.NumberFormat('es',{style:'percent',maximumFractionDigits:1}).format(c.cobertura.pdc)} · ${c.cobertura.cubiertos}/${c.cobertura.total} días.</p><p class="muted">La cobertura no demuestra ingesta. ${c.cobertura.excluidos.length?'Hay periodos intramusculares excluidos.':''}</p>`;
      $('experienciaVinculada').textContent=v?`Última experiencia: ${v.fecha}. ${Object.entries(v.experiencia).map(([k,x])=>`${etiquetas[k]}: ${x}`).join(' · ')}`:'Sin experiencia registrada aplicable. Puede registrar una nueva o dejar constancia de que no se dispone de ella.';
      $('valoracionPrevia').textContent=textoEvaluacionAdherencia(a);
      catalogo=biblioteca?.niveles[nivelHasta(p,dia)]?.intervenciones || [];
      $('bibliotecaConsulta').innerHTML='<option value="">Redactar una actuación propia</option>'+catalogo.map((x,i)=>`<option value="${i}">${esc(x.texto)}</option>`).join('');
      const sel=form.querySelector('[name=actuacion]');
      sel.querySelectorAll('option[value]').forEach(o=>{const e=actuaciones.find(e=>e.id===o.value);if(e)o.disabled=!aplicable(e,dia);});
      $('revisionConsulta').min=dia;
    } catch(e){$('contextoConsulta').textContent=e.message;}
  };
  const resumir=()=>{
    const v=Object.fromEntries(new FormData(form));
    $('resumenConsulta').textContent=`${v.problema}. Objetivo: ${v.objetivo}. Actuación: ${v.actuacion_modo==='existente'?actuaciones.find(a=>a.id===v.actuacion)?.texto || 'Sin selección':v.accion}. Responsable: ${v.responsable}. Revisión: ${v.revision}.`;
  };
  const mostrar=()=>{
    pasos.forEach((el,i)=>el.hidden=i!==paso);$('pasoConsulta').textContent=`Paso ${paso+1} de 4`;
    $('consultaAnterior').hidden=paso===0;$('consultaSiguiente').hidden=paso===3;save.hidden=paso!==3;
    if(paso===3)resumir();
    $('pasoConsulta').focus();$('modal').scrollTop=0;
  };
  $('consultaSiguiente').onclick=()=>{const invalido=[...pasos[paso].querySelectorAll('input,select,textarea')].find(el=>!el.disabled && !el.checkValidity());if(invalido){invalido.reportValidity();return;}paso++;mostrar();};
  form.addEventListener('change',()=>{if(paso===3)resumir();});
  $('consultaAnterior').onclick=()=>{paso--;mostrar();};
  $('fechaConsulta').onchange=actualizar;$('modoExperiencia').onchange=alternar;$('nuevaAdherencia').onchange=alternar;$('modoActuacion').onchange=alternar;
  $('bibliotecaConsulta').onchange=()=>{const i=$('bibliotecaConsulta').value;if(i!=='')form.querySelector('[name=accion]').value=catalogo[+i].texto;};
  form.addEventListener('keydown',e=>{if(e.key==='Enter' && paso!==3 && e.target.tagName==='INPUT'){e.preventDefault();$('consultaSiguiente').click();}});
  form.addEventListener('submit',e=>{if(paso!==3){e.preventDefault();e.stopImmediatePropagation();}},true);
  alternar();actualizar();mostrar();
}
export function abrirSeguimientoConsulta({db,id,consulta,fin,modal,guardar}) {
  const p=db.pacientes.find(p=>p.id===id),c=consultasHasta(p,fin).find(c=>c.id===consulta);
  if(!c)throw Error('Plan no aplicable al corte.');
  if(!c.modificable)throw Error('Hay seguimientos posteriores. Avance el corte para registrar uno nuevo.');
  modal('Registrar seguimiento del plan', `<p>${esc(textoPlan(c))}</p><label>Fecha efectiva de seguimiento<input name="fecha" type="date" value="${fin}" required></label><label>Estado del plan<select name="estado" id="estadoPlan"><option value="en_curso">Mantener en curso</option><option value="cerrada">Cerrar este plan</option></select></label><label>Resultado del objetivo<select name="resultado">${opciones(RESULTADOS)}</select></label><label>Observaciones y fundamento (solo sintético)<textarea name="observaciones" maxlength="500" required></textarea></label><label>Responsable funcional<select name="responsable">${opciones(RESPONSABLES,c.responsable)}</select></label><label id="proximaRevisionPlan">Próxima revisión acordada<input name="revision" type="date" value="${fin}" required></label><label class="check-line"><input name="marcar_realizada" type="checkbox" ${c.actuacion_realizada?'disabled':''}> Confirmo que la actuación se ha realizado (independiente del resultado del objetivo)</label>`,v=>guardar(registrarSeguimiento(db,id,{...v,consulta,marcar_realizada:v.marcar_realizada==='on'})));
  document.getElementById('estadoPlan').onchange=ev=>{const cerrado=ev.target.value==='cerrada',el=document.getElementById('proximaRevisionPlan');el.hidden=cerrado;el.querySelector('input').disabled=cerrado;};
}
function tarjeta(c,paciente='') {
  return `<article class="card"><div class="section-head"><h3>${paciente?`${esc(paciente)} · `:''}${esc(c.problema)}</h3><span class="badge ${c.plazo==='vencida'?'warn':''}">${c.estado==='cerrada'?'Plan cerrado':esc(c.estado)+' · '+esc(c.plazo)}</span></div><p><strong>Objetivo:</strong> ${esc(c.objetivo)}</p><p><strong>Actuación:</strong> ${esc(c.actuacion_texto)} · ${c.actuacion_realizada?'realizada':'pendiente'}</p><p><strong>Responsable:</strong> ${esc(c.responsable)} · <strong>Revisión:</strong> ${esc(c.revision || 'Sin revisión pendiente')}</p><p><strong>Resultado:</strong> ${esc(c.resultado)}${c.observaciones?` · ${esc(c.observaciones)}`:''}</p><div class="actions">${paciente?`<a href="#caso/${esc(paciente)}">Abrir caso →</a>`:''}${c.estado!=='cerrada' && c.modificable?`<button data-action="seguimiento-consulta" data-id="${esc(paciente?paciente+'|'+c.id:c.id)}">Registrar seguimiento</button>`:''}</div>${!c.modificable && c.estado!=='cerrada'?'<p class="muted">Vista histórica: hay seguimientos posteriores. Avance el corte para registrar otro.</p>':''}<details><summary>Historia del plan</summary><p>Consulta ${esc(c.fecha)} · Registro ${esc(c.registrado)} · ${esc(c.id)}</p><p>Experiencia vinculada: ${esc(c.visita || 'Sin registro')} · Valoración: ${esc(c.evaluacion || 'Sin registro')}</p>${c.historial.map(e=>`<p>${esc(e.fecha)} · ${esc(e.estado)} · ${esc(e.resultado)} · ${esc(e.observaciones)}<br><small>Registro ${esc(e.registrado)} · ${esc(e.id)}</small></p>`).join('')}</details></article>`;
}
export function vistaConsultas(p,fin) {
  const cs=consultasHasta(p,fin);
  return `<section><div class="section-head"><h2>Consulta y plan acordado</h2><button data-action="consulta-guiada" class="primary">Iniciar consulta guiada</button></div><p class="muted">Un objetivo por plan. El responsable es una función simulada, no una asignación a un usuario real. Las fechas son acuerdos profesionales, no plazos clínicos automáticos.</p>${cs.length?cs.map(c=>tarjeta(c)).join(''):'<p>Sin planes registrados para este corte. Las visitas y actuaciones anteriores siguen disponibles en sus secciones.</p>'}</section>`;
}
export function vistaAgenda(ps,fin) {
  return `<p class="intro">Revisar el siguiente paso acordado. Las fechas vencidas señalan tareas pendientes, sin establecer prioridad clínica.</p><section class="card"><div class="desk-filters"><label>Plazo<select id="agendaPlazo"><option value="activas">Planes activos</option><option value="vencida">Revisión vencida</option><option value="para el corte">Para la fecha de corte</option><option value="próxima">Revisión próxima</option><option value="cerrada">Planes cerrados</option><option value="todas">Todos</option></select></label><label>Responsable funcional<select id="agendaResponsable"><option value="">Todos</option>${opciones(RESPONSABLES)}</select></label></div><p id="agendaCuenta" role="status"></p><div id="agendaPlanes"></div></section>`;
}
export function conectarAgenda(ps,fin) {
  const plazo=document.getElementById('agendaPlazo'),responsable=document.getElementById('agendaResponsable');if(!plazo)return;
  const actualizar=()=>{const cs=agendaConsultas(ps,fin).filter(c=>(!responsable.value || c.responsable===responsable.value) && (plazo.value==='todas' || (plazo.value==='activas'?c.estado!=='cerrada':c.plazo===plazo.value)));document.getElementById('agendaCuenta').textContent=`${cs.length} ${cs.length===1?'plan':'planes'}`;document.getElementById('agendaPlanes').innerHTML=cs.map(c=>tarjeta(c,c.paciente)).join('') || '<p>Sin planes para estos filtros y fecha de corte.</p>';};
  plazo.onchange=actualizar;responsable.onchange=actualizar;actualizar();
}
