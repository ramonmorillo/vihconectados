import { leerCSV, validarDispensacion, episodios, componentes, nombreTar } from './motor.js';
import { historialDispensaciones, planificarDispensaciones } from './dispensaciones.js';
import { evaluarSenales, ESTADOS_SENAL } from './senales.js';
import { aplicable } from './temporal.js';
import { esc } from './vista-informes.js';
/** Conciliación dentro del mismo formulario, sin perder la entrada ni sumar coincidencias. */
export function crearGuardadoConciliado(p, guardar) {
  let firma='', resoluciones={};
  return (entradas,v,{huella='',fuente='Entrada manual'}={})=>{
    const actual=JSON.stringify(entradas);
    if (actual!==firma) {firma=actual;resoluciones={};}
    else for (const f of entradas) {
      const eleccion=v['decision_'+f.linea];
      if (eleccion) {
        const [accion,referencia]=eleccion.split('|');
        resoluciones[f.linea]={accion,referencia,motivo:v['motivo_'+f.linea] || ''};
      }
    }
    const plan=planificarDispensaciones(p,entradas,{huella,resoluciones});
    if (plan.conflictos.length) {
      document.getElementById('conciliacionDispensaciones').innerHTML=`<h3>Conciliar coincidencias</h3><p>La coincidencia no demuestra un duplicado. Compare los registros y decida si es otra dispensación legítima. Sin decisión no se guarda ninguna fila.</p>${plan.conflictos.map(({fila,candidatos})=>`<fieldset><legend>Fila ${fila.linea}: ${esc(fila.fecha)} · ${esc(fila.componente)} · ${fila.dias} días</legend>${candidatos.map(c=>`<p>${esc(c.referencia)} · ${c.dias} días · ${esc(c.estado)} · ${esc(c.fuente || 'Entrada de este lote')}</p>`).join('')}<label>Decisión<select name="decision_${fila.linea}" required><option value="">Seleccione</option><option value="nueva">Es otra dispensación legítima: añadir</option>${candidatos.map(c=>`<option value="duplicado|${esc(c.referencia)}">Es duplicado de ${esc(c.referencia)}: no añadir</option>`).join('')}</select></label><label>Motivo sintético<input name="motivo_${fila.linea}" maxlength="300" required></label></fieldset>`).join('')}`;
      document.getElementById('conciliacionDispensaciones').scrollIntoView({block:'nearest'});
      throw Error('Hay coincidencias pendientes. Complete la conciliación y vuelva a guardar; todavía no se ha añadido ninguna fila.');
    }
    if (!plan.filas.length && !plan.decisiones.length) return `${0} filas incorporadas; ${plan.duplicadas.length} duplicadas omitidas. Reimportación identificada; no se han añadido duplicados.`;
    guardar({tipo:'importacion',conciliada:true,fuente,entradas,resoluciones,huella,...plan});
    return `${plan.filas.length} filas incorporadas; ${plan.duplicadas.length} duplicadas omitidas. Conciliación conservada.`;
  };
}
export function abrirCSVConciliado({p,modal,guardar}) {
  const guardarPlan=crearGuardadoConciliado(p,guardar);
  modal('Importar dispensaciones sintéticas', `<p>Plantilla de cuatro columnas compatible. Puede añadir las columnas <code>origen;id_origen</code> para identificar dispensaciones de origen. Solo datos sintéticos.</p><label>Archivo CSV (opcional)<input id="archivoCsv" type="file" accept=".csv,text/csv"></label><label>Contenido CSV<textarea name="csv" id="csv" required placeholder="fecha;episodio;componente;dias"></textarea></label><div id="conciliacionDispensaciones"></div>`,async v=>{
    const entradas=leerCSV(p,v.csv);
    const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v.csv));
    const huella=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
    return guardarPlan(entradas,v,{huella,fuente:'CSV sintético'});
  });
  document.getElementById('csv').oninput=()=>document.getElementById('conciliacionDispensaciones').innerHTML='';
}
export function tablaDispensaciones(p,fin) {
  const filas=historialDispensaciones(p).filter(f=>f.fecha<=fin);
  return `<section class="card" id="registroDispensaciones"><h2>Dispensaciones y correcciones</h2><p class="muted">La cobertura usa solo filas vigentes. Las correcciones son retrospectivas y conservan el original; los informes guardados no se recalculan.</p><div class="table-wrap"><table><thead><tr>${['Fecha efectiva / registro','Medicamento / episodio','Días','Estado / origen','Acción'].map(t=>`<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${filas.map(f=>`<tr><td>${esc(f.fecha)}<br><small>${esc(f.registrado || 'Registro no disponible')}</small></td><td>${esc(f.componente)}<br><small>${esc(f.episodio)}<br>${esc(f.referencia)}</small></td><td>${f.dias}</td><td><strong>${esc(f.estado)}</strong><br>${esc(f.fuente)}<br>${esc(f.origen || '')} ${esc(f.id_origen || '')}${f.motivo?`<p>${esc(f.motivo)}</p>`:''}${f.sustituye?`<p>Sustituye ${esc(f.sustituye)}</p>`:''}</td><td>${f.estado==='vigente'?`<button data-action="corregir-dispensacion" data-id="${esc(f.referencia)}">Corregir / anular</button>`:'Original conservado'}</td></tr>`).join('') || '<tr><td colspan="5">Sin dispensaciones para el corte.</td></tr>'}</tbody></table></div></section>`;
}
export function abrirCorreccion({p,referencia,modal,guardar}) {
  const original=historialDispensaciones(p).find(f=>f.referencia===referencia && f.estado==='vigente');
  if (!original) throw Error('Dispensación no vigente. Actualice la vista.');
  const eps=episodios(p).filter(e=>e.modalidad!=='inyectable');
  modal('Corregir dispensación', `<p>Original ${esc(referencia)}: ${esc(original.fecha)} · ${esc(original.componente)} · ${original.dias} días. Se conservará íntegro.</p><label>Operación<select name="operacion"><option value="sustituir">Sustituir por un registro corregido</option><option value="anular">Anular sin sustitución</option></select></label><label>Fecha corregida<input name="fecha" type="date" value="${esc(original.fecha)}" required></label><label>Episodio corregido<select name="episodio" id="episodioCorreccion">${eps.map(e=>`<option value="${esc(e.id)}" ${e.id===original.episodio?'selected':''}>${esc(e.fecha)} · ${esc(nombreTar(e))}</option>`).join('')}</select></label><label>Componente corregido<select name="componente" id="componenteCorreccion"></select></label><label>Días corregidos<input name="dias" type="number" min="1" max="400" step="1" value="${original.dias}" required></label><label>Motivo de la corrección (solo sintético)<input name="motivo" maxlength="300" required></label><label class="check-line"><input type="checkbox" name="coincidencia_confirmada"> Si coincide con otra dispensación vigente, he comprobado que son dispensaciones independientes.</label>`,v=>{
    const sustitucion=v.operacion==='anular'?null:{fecha:v.fecha,episodio:v.episodio,componente:v.componente,dias:Number(v.dias),...(original.id_origen?{origen:original.origen,id_origen:original.id_origen}:{})};
    guardar({tipo:'correccion_dispensacion',referencia,motivo:v.motivo,sustitucion,coincidencia_confirmada:v.coincidencia_confirmada==='on'});
  });
  const sel=document.getElementById('episodioCorreccion');
  const dibujar=()=>document.getElementById('componenteCorreccion').innerHTML=componentes(eps.find(e=>e.id===sel.value)).map(c=>`<option ${c===original.componente?'selected':''}>${esc(c)}</option>`).join('');
  sel.onchange=dibujar;dibujar();
}
export function abrirGestionSenal({p,regla,fin,reglas,modal,guardar}) {
  const s=evaluarSenales(p,fin,reglas).find(s=>s.regla===regla);
  if (!s) throw Error('La condición ya no está presente. Actualice la vista.');
  const acciones=p.eventos.filter(e=>e.tipo==='actuacion' && aplicable(e,fin));
  modal('Gestionar señal', `<p>${esc(s.texto)}</p><p>La condición calculada se conserva aunque cambie su gestión. Al cambiar datos efectivos, intervalo o reglas se requerirá una nueva revisión.</p><label>Estado de gestión<select name="estado">${ESTADOS_SENAL.map(e=>`<option>${esc(e)}</option>`).join('')}</select></label><label>Motivo sintético<input name="motivo" maxlength="300" required></label><label>Actuación vinculada (obligatoria para estado actuación)<select name="actuacion"><option value="">Sin vínculo</option>${acciones.map(e=>`<option value="${esc(e.id)}">${esc(e.texto)}</option>`).join('')}</select></label>`,v=>guardar({tipo:'gestion_senal',fecha:fin,regla,evidencia:s.evidencia,estado:v.estado,motivo:v.motivo,actuacion:v.actuacion,reglas:{...reglas}}));
}
