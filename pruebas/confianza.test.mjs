import test from 'node:test';
import assert from 'node:assert/strict';
import {crearPaciente,vacio,anexar,RepositorioDemo} from '../src/almacen.js';
import {cobertura,leerCSV,importarCSV,estadoComunicacion,REGLAS} from '../src/motor.js';
import {tratamientoHasta,nivelHasta,ultimoEvento,aplicable,eventosHasta} from '../src/temporal.js';
import {historialDispensaciones,planificarDispensaciones} from '../src/dispensaciones.js';
import {evaluarSenales,pendientesSenales} from '../src/senales.js';
import {informe,resumenInforme} from '../src/informes.js';
import {vistaInforme} from '../src/vista-informes.js';
const cfg={...REGLAS,ventana:30};
function base(){let d=crearPaciente(vacio(),'2','2026-01-01');return anexar(d,'DEMO-001',{tipo:'tratamiento',tar:'TAR_A',fecha:'2026-01-01'});}
const fila=(d,extra={})=>({fecha:'2026-01-01',episodio:d.pacientes[0].eventos.find(e=>e.tipo==='tratamiento').id,componente:'A',dias:10,linea:2,...extra});
function importar(d,entradas,extra={}){return anexar(d,'DEMO-001',{tipo:'importacion',conciliada:true,fuente:'CSV sintético',entradas,...extra});}
const guardarGestion=(d,s,extra={})=>anexar(d,'DEMO-001',{tipo:'gestion_senal',fecha:'2026-01-31',regla:s.regla,evidencia:s.evidencia,estado:'cerrada',motivo:'Revisión sintética',reglas:cfg,...extra});
test('Corte: tratamiento, nivel y visita futuros no sustituyen los históricos; hechos inclusivos y PDC exclusivo',()=>{
 let d=base();d=importar(d,[fila(d,{dias:30})]);
 d=anexar(d,'DEMO-001',{tipo:'tratamiento',tar:'TAR_B',fecha:'2026-02-01'});
 d=anexar(d,'DEMO-001',{tipo:'nivel',nivel:'1',fecha:'2026-02-01'});
 const p=d.pacientes[0];
 assert.equal(tratamientoHasta(p,'2026-01-31').tar,'TAR_A');assert.equal(nivelHasta(p,'2026-01-31'),'2');
 assert.equal(tratamientoHasta(p,'2026-02-01').tar,'TAR_B');assert.equal(nivelHasta(p,'2026-02-01'),'1');
 assert.equal(cobertura(p,'2026-02-01',cfg).detalle.at(-1).tar,'TAR_A');
 const i=informe(p,'2026-01-31',cfg);assert.equal(i.nivel,'2');assert.equal(resumenInforme(i).tratamiento.tar,'TAR_A');
 assert.equal(ultimoEvento({eventos:[{tipo:'visita',fecha:'2026-02-01'}]},'visita','2026-01-31'),undefined);
});
test('Datos antiguos sin fecha efectiva usan registro, sin modificar ni inventar historia',()=>{
 const e={tipo:'nivel',nivel:'1',registrado:'2026-03-01T10:00:00Z'},p={eventos:[e]};
 assert.equal(nivelHasta(p,'2026-02-28'),null);assert.equal(nivelHasta(p,'2026-03-01'),'1');
 assert.equal(aplicable({tipo:'nivel',nivel:'3'},'2026-03-01'),false);assert.equal('fecha' in e,false);
});
test('Estado de comunicación e informes nuevos respetan fechas efectivas, no orden de anexado',()=>{
 let d=base();d=anexar(d,'DEMO-001',informe(d.pacientes[0],'2026-01-31',cfg));const id=d.pacientes[0].eventos.at(-1).id;
 d=anexar(d,'DEMO-001',{tipo:'estado_comunicacion',fecha:'2026-02-01',informe:id,estado:'comunicado'});
 d=anexar(d,'DEMO-001',{tipo:'estado_comunicacion',fecha:'2026-02-02',informe:id,estado:'recibido'});
 assert.equal(estadoComunicacion(d.pacientes[0],id,'2026-01-31'),'pendiente');
 assert.equal(estadoComunicacion(d.pacientes[0],id,'2026-02-01'),'comunicado');
 assert.equal(estadoComunicacion(d.pacientes[0],id,'2026-02-02'),'recibido');
});
test('Corrección anexada: conserva original, recalcula actual y no cambia informe ya guardado',()=>{
 let d=base();d=importar(d,[fila(d)]);const p=d.pacientes[0],original=historialDispensaciones(p)[0];
 const raw=JSON.stringify(p.eventos),i=informe(p,'2026-01-31',cfg),congelado=JSON.stringify(i),html=vistaInforme(i);
 d=anexar(d,p.id,{tipo:'correccion_dispensacion',referencia:original.referencia,motivo:'Días corregidos en caso sintético',sustitucion:{...fila(d),dias:20}});
 const hs=historialDispensaciones(d.pacientes[0]);
 assert.equal(hs[0].estado,'sustituida');assert.equal(hs[1].sustituye,hs[0].referencia);
 assert.equal(cobertura(d.pacientes[0],'2026-01-31',cfg).cubiertos,20);
 assert.equal(JSON.stringify(d.pacientes[0].eventos.slice(0,-1)),raw);assert.equal(JSON.stringify(i),congelado);assert.equal(vistaInforme(i),html);
 d=anexar(d,p.id,{tipo:'correccion_dispensacion',referencia:hs[1].referencia,motivo:'Anulación sintética',sustitucion:null});
 assert.equal(cobertura(d.pacientes[0],'2026-01-31',cfg).cubiertos,0);
 assert.throws(()=>anexar(d,p.id,{tipo:'correccion_dispensacion',referencia:original.referencia,motivo:'Otra',sustitucion:null}),/vigente/);
});
test('Correcciones rechazan motivo vacío, componente inválido y colisión no confirmada',()=>{
 let d=base();d=importar(d,[fila(d),fila(d,{fecha:'2026-01-02',linea:3})]);const ref=historialDispensaciones(d.pacientes[0])[0].referencia;
 assert.throws(()=>anexar(d,'DEMO-001',{tipo:'correccion_dispensacion',referencia:ref,motivo:'',sustitucion:null}),/motivo/);
 assert.throws(()=>anexar(d,'DEMO-001',{tipo:'correccion_dispensacion',referencia:ref,motivo:'Sintético',sustitucion:fila(d,{componente:'B'})}),/incompatibles/);
 const evento={tipo:'correccion_dispensacion',referencia:ref,motivo:'Otra dispensación independiente',sustitucion:fila(d,{fecha:'2026-01-02',dias:5})};
 assert.throws(()=>anexar(d,'DEMO-001',evento),/independientes/);
 assert.doesNotThrow(()=>anexar(d,'DEMO-001',{...evento,coincidencia_confirmada:true}));
});
test('CSV clásico sigue siendo válido; sin ID de origen toda coincidencia exige conciliación explícita',()=>{
 let d=base();const f=fila(d),csv=`fecha;episodio;componente;dias\n${f.fecha};${f.episodio};A;10`;
 assert.equal(leerCSV(d.pacientes[0],csv).length,1);d=importar(d,[f]);
 assert.equal(planificarDispensaciones(d.pacientes[0],[f]).conflictos.length,1);
 assert.throws(()=>importar(d,[f]),/conciliación/);
 const ref=historialDispensaciones(d.pacientes[0])[0].referencia;
 const duplicado={2:{accion:'duplicado',referencia:ref,motivo:'Misma entrega'}};
 d=importar(d,[f],{resoluciones:duplicado});assert.equal(cobertura(d.pacientes[0],'2026-01-31',cfg).cubiertos,10);
 d=importar(d,[f],{resoluciones:{2:{accion:'nueva',motivo:'Segunda entrega independiente confirmada'}}});
 assert.equal(cobertura(d.pacientes[0],'2026-01-31',cfg).cubiertos,20);
});
test('Identidad de origen distingue dos entregas del mismo día; reimportación no resucita una anulada',()=>{
 let d=base();const a=fila(d,{origen:'DEMO',id_origen:'DISP-1'}),b=fila(d,{origen:'DEMO',id_origen:'DISP-2',linea:3});
 d=importar(d,[a,b]);assert.equal(cobertura(d.pacientes[0],'2026-01-31',cfg).cubiertos,20);
 const p=d.pacientes[0],plan=planificarDispensaciones(p,[a,b]);assert.equal(plan.duplicadas.length,2);assert.equal(plan.conflictos.length,0);
 assert.throws(()=>planificarDispensaciones(p,[{...a,dias:11}]),/identificador de origen en conflicto/);
 const ref=historialDispensaciones(p)[0].referencia;
 d=anexar(d,p.id,{tipo:'correccion_dispensacion',referencia:ref,motivo:'Anulado',sustitucion:null});
 assert.equal(planificarDispensaciones(d.pacientes[0],[a]).duplicadas.length,1);assert.equal(cobertura(d.pacientes[0],'2026-01-31',cfg).cubiertos,10);
});
test('Huella más filas normalizadas reconoce reimportación exacta, sin confundir archivo distinto',()=>{
 let d=base(),f=fila(d);d=importar(d,[f],{huella:'a'.repeat(64)});
 const p=d.pacientes[0];assert.ok(planificarDispensaciones(p,[f],{huella:'a'.repeat(64)}).reimportacion);
 assert.equal(planificarDispensaciones(p,[{...f,dias:11}],{huella:'a'.repeat(64)}).conflictos.length,1);
});
test('Conciliación de un lote es atómica y contempla coincidencias dentro del archivo',()=>{
 const d=base(),a=fila(d),b={...a,linea:3};
 assert.equal(planificarDispensaciones(d.pacientes[0],[a,b]).conflictos.length,1);
 const antes=JSON.stringify(d);
 assert.throws(()=>importar(d,[a,b]),/conciliación/);assert.equal(JSON.stringify(d),antes);
 const n=importar(d,[a,b],{resoluciones:{3:{accion:'nueva',motivo:'Entregas independientes'}}});
 assert.equal(cobertura(n.pacientes[0],'2026-01-31',cfg).cubiertos,20);
 assert.throws(()=>importar(d,[a,{...b,linea:2}]),/únicas/);
});
test('Gestión no cambia condición calculada; render estable, reapertura solo por nueva evidencia efectiva',()=>{
 let d=base();d=importar(d,[fila(d)]);let s=evaluarSenales(d.pacientes[0],'2026-01-31',cfg).find(s=>s.regla==='cobertura_demo');
 d=guardarGestion(d,s);let p=d.pacientes[0];
 assert.equal(evaluarSenales(p,'2026-01-31',cfg).find(s=>s.regla==='cobertura_demo').estado_gestion,'cerrada');
 assert.equal(pendientesSenales(p,'2026-01-31',cfg).length,0);
 assert.deepEqual(evaluarSenales(p,'2026-01-31',cfg),evaluarSenales(p,'2026-01-31',cfg));
 d=importar(d,[fila(d,{fecha:'2026-02-02'})]);assert.equal(pendientesSenales(d.pacientes[0],'2026-01-31',cfg).length,0);
 d=importar(d,[fila(d,{fecha:'2026-01-20',dias:1})]);
 s=evaluarSenales(d.pacientes[0],'2026-01-31',cfg).find(s=>s.regla==='cobertura_demo');assert.equal(s.estado_gestion,'pendiente');assert.equal(s.reabierta,true);
});
test('Avisos metodológicos separados, gestión exige motivo y actuación válida; legacy no se reinterpreta',()=>{
 let d=crearPaciente(vacio());const p=d.pacientes[0];
 assert.equal(evaluarSenales(p,'2026-01-31',cfg)[0].categoria,'aviso');assert.equal(pendientesSenales(p,'2026-01-31',cfg).length,0);
 d=base();d=importar(d,[fila(d)]);const s=evaluarSenales(d.pacientes[0],'2026-01-31',cfg)[0];
 assert.throws(()=>guardarGestion(d,s,{motivo:''}),/motivo/);assert.throws(()=>guardarGestion(d,s,{estado:'actuacion',actuacion:'inexistente'}),/Vincule/);
 d=anexar(d,'DEMO-001',{tipo:'revision_alertas',fecha:'2026-01-31',resultado:'Señal descartada en simulación'});
 assert.equal(evaluarSenales(d.pacientes[0],'2026-01-31',cfg)[0].estado_gestion,'pendiente');
 const memoria=new Map(),repo=new RepositorioDemo({getItem:k=>memoria.get(k),setItem:(k,v)=>memoria.set(k,v)});repo.guardar(d);assert.deepEqual(repo.leer(),d);
});
test('Fechas de estados no pueden preceder a su informe, transición anterior o actuación',()=>{
 let d=base();d=anexar(d,'DEMO-001',informe(d.pacientes[0],'2026-01-31',cfg));const id=d.pacientes[0].eventos.at(-1).id;
 assert.throws(()=>anexar(d,'DEMO-001',{tipo:'estado_comunicacion',informe:id,estado:'comunicado',fecha:'2026-01-30'}),/anterior/);
 d=anexar(d,'DEMO-001',{tipo:'estado_comunicacion',informe:id,estado:'comunicado',fecha:'2026-02-02'});
 assert.throws(()=>anexar(d,'DEMO-001',{tipo:'estado_comunicacion',informe:id,estado:'recibido',fecha:'2026-02-01'}),/anterior/);
 d=anexar(d,'DEMO-001',{tipo:'actuacion',fecha:'2026-02-02',texto:'Sintética',estado:'pendiente'});const act=d.pacientes[0].eventos.at(-1).id;
 assert.throws(()=>anexar(d,'DEMO-001',{tipo:'estado_actuacion',actuacion:act,estado:'realizada',fecha:'2026-02-01'}),/anterior/);
});
test('Gestión admite vínculo de actuación, mantiene orden efectivo y canonicaliza reglas equivalentes',()=>{
 let d=base();d=importar(d,[fila(d)]);
 d=anexar(d,'DEMO-001',{tipo:'actuacion',fecha:'2026-01-25',texto:'Revisión sintética',estado:'pendiente'});
 const act=d.pacientes[0].eventos.at(-1).id,s=evaluarSenales(d.pacientes[0],'2026-01-31',cfg)[0];
 d=guardarGestion(d,s,{estado:'actuacion',actuacion:act});
 assert.equal(evaluarSenales(d.pacientes[0],'2026-01-31',cfg)[0].estado_gestion,'actuacion');
 const r=Object.fromEntries(Object.entries(cfg).reverse());
 assert.equal(evaluarSenales(d.pacientes[0],'2026-01-31',r)[0].estado_gestion,'actuacion');
 assert.equal(evaluarSenales(d.pacientes[0],'2026-01-30',cfg)[0].estado_gestion,'pendiente');
});

test('Conciliación sin nuevas filas queda visible y una corrección retroactiva aparece desde la primera fecha afectada',()=>{
 let d=base();d=importar(d,[fila(d,{fecha:'2026-01-10'})]);
 const ref=historialDispensaciones(d.pacientes[0])[0].referencia;
 d=importar(d,[fila(d,{fecha:'2026-01-10'})],{resoluciones:{2:{accion:'duplicado',referencia:ref,motivo:'Misma entrega'}}});
 const auditoria=d.pacientes[0].eventos.at(-1);
 assert.equal(auditoria.filas.length,0);assert.ok(eventosHasta(d.pacientes[0],'2026-01-31').some(e=>e.id===auditoria.id));
 d=anexar(d,'DEMO-001',{tipo:'correccion_dispensacion',referencia:ref,motivo:'Fecha efectiva corregida',sustitucion:fila(d,{fecha:'2026-01-01',dias:10})});
 const correccion=d.pacientes[0].eventos.at(-1);
 assert.equal(correccion.fecha_original,'2026-01-10');assert.equal(correccion.fecha,'2026-01-01');
 assert.ok(eventosHasta(d.pacientes[0],'2026-01-05').some(e=>e.id===correccion.id));
 assert.equal(cobertura(d.pacientes[0],'2026-01-05',cfg).cubiertos,4);
});
