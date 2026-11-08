import { cobertura, alertas, nivel, episodios, nombreTar, estadoComunicacion } from './motor.js';
export const escapar = (valor) => String(valor ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct = c => c.pdc === null ? 'Sin cálculo' : new Intl.NumberFormat('es', {style:'percent', maximumFractionDigits:1}).format(c.pdc);
export function marcoMetodologico() {
  return `<section class="desk-method" aria-labelledby="metodo-desktop"><div class="desk-section-label">MARCO METODOLÓGICO</div><h2 id="metodo-desktop">Tres conceptos, tres lecturas</h2><div class="desk-three"><p><strong>01 · Retirada</strong><br>El retraso de retirada no está calculado en esta versión.</p><p><strong>02 · Cobertura teórica (PDC)</strong><br>Disponibilidad estimada del TAR completo; no acredita ingesta.</p><p><strong>03 · Adherencia evaluada</strong><br>La entrevista y los cuestionarios recogen información referida; no confirman objetivamente la toma.</p></div></section>`;
}
export function navegacionDesktop(activa, id) {
  const rutas = [['poblacional','Monitorización'],['cohorte','Cohorte']];
  if (id) rutas.push(['paciente/'+id,'Ficha longitudinal'],['cmo/'+id,'Intervención CMO']);
  return `<nav class="desk-nav" aria-label="Vistas de escritorio">${rutas.map(([ruta,texto]) => `<a href="#panel/${escapar(ruta)}" ${ruta.split('/')[0] === activa ? 'aria-current="page"' : ''}>${texto}</a>`).join('')}<a href="#panel">Vista clásica</a></nav>`;
}
export function tablaCohorte(ps, fin, reglas) {
  return `<div class="table-wrap"><table><caption class="desk-caption">Casos sintéticos · señales de demostración, sin prioridad clínica automática</caption><thead><tr>${['Caso / TAR registrado','CMO asignado','Cobertura teórica','Evaluación de adherencia','Comunicación simulada','Acciones'].map(t=>`<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${ps.map(p=>{
    const c=cobertura(p,fin,reglas), a=alertas(p,fin,reglas), informes=p.eventos.filter(e=>e.tipo==='informe');
    return `<tr><td><strong>${escapar(p.id)}</strong><br><small>${escapar(nombreTar(episodios(p).at(-1)))}</small><br><small>${a.length} señales para revisar</small></td><td>Nivel ${escapar(nivel(p))}<br><small>Demo manual</small></td><td><strong>${pct(c)}</strong><br><small>${c.cubiertos}/${c.total} días</small></td><td>Sin evaluación estructurada<br><small>Experiencia referida en la ficha</small></td><td>${informes.length ? informes.map(i=>`<span class="desk-state" data-state="${escapar(estadoComunicacion(p,i.id))}">${escapar(estadoComunicacion(p,i.id))}</span>`).join(' ') : 'Sin informe'}</td><td><a href="#panel/paciente/${escapar(p.id)}">Ver ficha</a><br><a href="#panel/cmo/${escapar(p.id)}">Intervención CMO</a></td></tr>`;
  }).join('') || '<tr><td colspan="6">No hay casos que coincidan.</td></tr>'}</tbody></table></div>`;
}
function filasRevision(ps,fin,reglas) {
  return `<div class="desk-review-list">${ps.map(p=>{
    const c=cobertura(p,fin,reglas), a=alertas(p,fin,reglas);
    return `<article class="desk-review"><div class="desk-review-head"><span class="desk-avatar" aria-hidden="true">${escapar(p.id.slice(-3))}</span><div><h3><a href="#panel/paciente/${escapar(p.id)}">${escapar(p.id)}</a></h3><p>${escapar(nombreTar(episodios(p).at(-1)))}</p></div><span class="desk-review-count">${a.length} señales demo</span></div><div class="desk-review-data"><p><span>Cobertura teórica</span><strong>${pct(c)}</strong><small>${c.cubiertos}/${c.total} días</small></p><p><span>Nivel asignado</span><strong>CMO ${escapar(nivel(p))}</strong><small>Asignación manual</small></p><p><span>Adherencia</span><strong>Sin evaluación</strong><small>No inferida del PDC</small></p></div><div class="desk-review-actions"><a href="#panel/paciente/${escapar(p.id)}">Revisar ficha →</a><a class="desk-link-primary" href="#panel/cmo/${escapar(p.id)}">Registrar intervención</a></div></article>`;
  }).join('') || '<p class="muted">No hay casos con señales bajo la configuración actual.</p>'}</div>`;
}
export function vistaPoblacional(ps,fin,reglas) {
  const senales=ps.reduce((n,p)=>n+alertas(p,fin,reglas).length,0);
  const abiertas=ps.reduce((n,p)=>n+p.eventos.filter(e=>e.tipo==='informe' && estadoComunicacion(p,e.id)!=='resuelto').length,0);
  const pendientes=ps.reduce((n,p)=>n+p.eventos.filter(e=>e.tipo==='actuacion' && e.estado==='pendiente' && !p.eventos.some(x=>x.tipo==='estado_actuacion' && x.actuacion===e.id)).length,0);
  return `<p class="eyebrow">ESTACIÓN DE SEGUIMIENTO · TAR ORAL</p><p class="intro">Una cohorte, distintas trayectorias.<br>Información para revisar, escuchar y coordinar.</p><div class="stats">${[['Casos sintéticos',ps.length,'Datos de este navegador'],['Señales para revisar',senales,'Parámetros demo existentes'],['Actuaciones pendientes',pendientes,'Sin ejecución automática'],['Comunicaciones abiertas',abiertas,'Sin envío real']].map(([t,n,d])=>`<article class="stat desk-kpi"><span>${t}</span><strong>${n}</strong><small>${d}</small></article>`).join('')}</div>${marcoMetodologico()}<div class="desk-columns"><section class="card"><h2>Mesa de revisión</h2><p>Casos con señales bajo los parámetros actuales. El orden no expresa riesgo clínico.</p>${filasRevision(ps.filter(p=>alertas(p,fin,reglas).length),fin,reglas)}<a href="#panel/cohorte">Explorar toda la cohorte →</a></section><section class="card"><p class="eyebrow">CONTEXTO DE LA COHORTE</p><h2>Niveles CMO asignados</h2>${['1','2','3'].map(n=>`<div class="desk-distribution"><p><span>Nivel ${n}</span><strong>${ps.filter(p=>nivel(p)===n).length} ${ps.filter(p=>nivel(p)===n).length===1 ? 'caso' : 'casos'}</strong></p><meter min="0" max="${Math.max(ps.length,1)}" value="${ps.filter(p=>nivel(p)===n).length}" aria-label="Casos con nivel ${n} asignado"></meter></div>`).join('')}<p class="muted">Asignaciones sintéticas manuales; no estratificación automática.</p><h3>Alcance de esta estación</h3><p>TAR oral y registros locales. Sin monitorización de inyectables ni resultados virológicos.</p><a href="#modelo">Consultar reglas y límites →</a></section></div>`;
}
export function vistaCohorte(ps,fin,reglas) {
  return `${marcoMetodologico()}<section class="card"><h2>Censo de casos sintéticos</h2><div class="desk-filters"><label>Buscar identificador o TAR<input id="desk-buscar" type="search" autocomplete="off"></label><label>Revisión<select id="desk-filtro"><option value="todos">Todos los casos</option><option value="senales">Con señales de demostración</option></select></label></div><p id="desk-resultados" role="status">${ps.length} casos</p><div id="desk-tabla">${tablaCohorte(ps,fin,reglas)}</div></section>`;
}
export function conectarCohorte(ps,fin,reglas) {
  const buscar=document.getElementById('desk-buscar'), filtro=document.getElementById('desk-filtro');
  if (!buscar) return;
  const actualizar=()=>{
    const q=buscar.value.trim().toLocaleLowerCase('es');
    const visibles=ps.filter(p=>(p.id+' '+nombreTar(episodios(p).at(-1))).toLocaleLowerCase('es').includes(q) && (filtro.value!=='senales'||alertas(p,fin,reglas).length));
    document.getElementById('desk-tabla').innerHTML=tablaCohorte(visibles,fin,reglas);
    document.getElementById('desk-resultados').textContent=visibles.length+(visibles.length===1 ? ' caso' : ' casos');
  };
  buscar.addEventListener('input',actualizar); filtro.addEventListener('change',actualizar);
}
export function resumenLongitudinal(p,fin,reglas) {
  const c=cobertura(p,fin,reglas);
  return `${marcoMetodologico()}<section class="card"><h2>Cronograma de cobertura por episodio</h2><p>Intervalos UTC [inicio, fin), dentro de la ventana de ${reglas.ventana} días. No representan retrasos de retirada.</p>${c.detalle.map(d=>`<article class="desk-episode"><h3>${escapar(d.tar)}</h3><p>${escapar(d.inicio)} → ${escapar(d.fin_exclusivo)} (fin excluido)</p><meter min="0" max="${d.total}" value="${d.cubiertos}" aria-label="Días con cobertura teórica">${d.cubiertos}/${d.total}</meter><p>${d.cubiertos}/${d.total} días con cobertura · ${d.total-d.cubiertos} sin cobertura registrada</p></article>`).join('') || '<p>Sin intervalo evaluable.</p>'}</section>`;
}
export function itinerarioCMO(p) {
  return `${marcoMetodologico()}<section class="card"><h2>Itinerario de intervención CMO</h2><p>Registro local simulado para ${escapar(p.id)}. Cada acción conserva su evento; no hay firma electrónica ni envío.</p><ol class="desk-three"><li><strong>Evaluación</strong><p>Explore la experiencia y las barreras referidas.</p><button data-action="visita">Registrar experiencia</button></li><li><strong>Intervención</strong><p>Seleccione en la biblioteca y distinga pendiente de realizada.</p><button data-action="desktop-biblioteca">Ir a la biblioteca ↓</button></li><li><strong>Seguimiento</strong><p>Revise los informes y sus cinco estados.</p><button data-action="desktop-informes">Ver informes del caso</button></li></ol></section><div id="biblioteca-cmo"></div>`;
}
