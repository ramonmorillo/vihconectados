/** Proyección no destructiva. Las referencias de filas antiguas se derivan, no se escriben. */
export function historialDispensaciones(p) {
  const filas = [];
  for (const e of p.eventos) {
    if (e.tipo === 'importacion') e.filas.forEach((f,i) => filas.push({...f, referencia: `${e.id}:${i}`, lote: e.id, fuente: e.fuente || 'Importación anterior', registrado: e.registrado, estado: 'vigente'}));
    if (e.tipo === 'correccion_dispensacion') {
      const original = filas.find(f => f.referencia === e.referencia);
      if (!original) continue;
      original.estado = e.sustitucion ? 'sustituida' : 'anulada';
      original.correccion = e.id;
      original.motivo = e.motivo;
      if (e.sustitucion) filas.push({...e.sustitucion, referencia: `${e.id}:0`, sustituye: e.referencia, lote:e.id, fuente:'Corrección', registrado:e.registrado, estado:'vigente'});
    }
  }
  return filas;
}
export const dispensacionesVigentes = p => historialDispensaciones(p).filter(f => f.estado === 'vigente');
export const mismaFila = (a,b) => ['fecha','episodio','componente','dias','origen','id_origen'].every(k => (a[k] ?? '') === (b[k] ?? ''));
export const mismaClave = (a,b) => a.fecha === b.fecha && a.episodio === b.episodio && a.componente === b.componente;
export function planificarDispensaciones(p, entradas, {resoluciones = {}, huella = ''} = {}) {
  const anterior = huella && p.eventos.find(e => e.tipo === 'importacion' && e.huella === huella && e.entradas?.length === entradas.length && e.entradas.every((f,i) => mismaFila(f,entradas[i])));
  if (anterior) return {filas:[],duplicadas:entradas.map(f=>f.linea),conflictos:[],decisiones:[],reimportacion:anterior.id};
  const prev = historialDispensaciones(p), filas=[], duplicadas=[], conflictos=[], decisiones=[];
  for (const f of entradas) {
    const todos=[...prev,...filas.map(x=>({...x,referencia:`entrada:${x.linea}`,estado:'vigente'}))];
    const identidad=f.id_origen ? todos.filter(x=>x.origen===f.origen && x.id_origen===f.id_origen) : [];
    if (identidad.length) {
      if (!identidad.some(x=>mismaFila(x,f))) throw Error(`Fila ${f.linea}: identificador de origen en conflicto; corrija el registro existente.`);
      duplicadas.push(f.linea); continue;
    }
    const candidatos=todos.filter(x=>mismaClave(x,f) && (!f.id_origen || !x.id_origen));
    if (!candidatos.length) {filas.push(f);continue;}
    const d=resoluciones[f.linea];
    if (!d) {conflictos.push({fila:f,candidatos});continue;}
    if (!['duplicado','nueva'].includes(d.accion) || typeof d.motivo!=='string' || !d.motivo.trim() || d.motivo.length>300) throw Error('Cada conciliación requiere una decisión y un motivo (1–300 caracteres).');
    if (d.accion==='duplicado') {
      if (!candidatos.some(x=>x.referencia===d.referencia)) throw Error('Referencia de conciliación no válida.');
      duplicadas.push(f.linea);
    } else filas.push(f);
    decisiones.push({linea:f.linea,...d,motivo:d.motivo.trim()});
  }
  return {filas,duplicadas,conflictos,decisiones};
}
