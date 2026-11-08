import test from 'node:test';
import assert from 'node:assert/strict';
import {fecha,importarCSV,cobertura,alertas,REGLAS,transicion,estadoComunicacion} from '../src/motor.js';
import {vacio,crearPaciente,anexar,RepositorioDemo} from '../src/almacen.js';
import {informe} from '../src/informes.js';
import {demo} from '../src/demo.js';
function base(tar='TAR_A'){let d=crearPaciente(vacio());d=anexar(d,'DEMO-001',{tipo:'tratamiento',fecha:'2026-01-01',tar});return d;}
function csv(db,rows){const p=db.pacientes[0];return anexar(db,p.id,{tipo:'importacion',...importarCSV(p,'fecha;episodio;componente;dias\n'+rows(p).join('\n'))});}
const cfg={...REGLAS,ventana:30};
test('Fechas UTC: bisiesto, imposible y vacío',()=>{assert.ok(fecha('2024-02-29'));for(const s of ['2026-02-29','2026-13-01','','2026-2-01'])assert.throws(()=>fecha(s));});
test('Cobertura exacta: final excluido, huecos y solapes con arrastre',()=>{let d=base();d=csv(d,p=>{const ep=p.eventos[1].id;return [`2026-01-01;${ep};A;10`,`2026-01-05;${ep};A;10`];});const c=cobertura(d.pacientes[0],'2026-01-31',cfg);assert.equal(c.total,30);assert.equal(c.cubiertos,20);assert.equal(c.pdc,2/3);});
test('Sin dispensaciones no equivale a adherencia: 0 cobertura con tratamiento y sin cálculo sin TAR',()=>{assert.equal(cobertura(base().pacientes[0],'2026-01-31',cfg).pdc,0);assert.equal(cobertura(crearPaciente(vacio()).pacientes[0],'2026-01-31',cfg).pdc,null);});
test('Multicomponente: intersección y no suma de coberturas',()=>{let d=base('TAR_CD');d=csv(d,p=>{const ep=p.eventos[1].id;return [`2026-01-01;${ep};C;30`,`2026-01-11;${ep};D;10`];});assert.equal(cobertura(d.pacientes[0],'2026-01-31',cfg).cubiertos,10);});
test('Cambio de TAR corta sobrante sin trasladar cobertura',()=>{let d=base();d=csv(d,p=>[`2026-01-01;${p.eventos[1].id};A;90`]);d=anexar(d,'DEMO-001',{tipo:'tratamiento',fecha:'2026-01-16',tar:'TAR_B'});const c=cobertura(d.pacientes[0],'2026-01-31',cfg);assert.equal(c.cubiertos,15);assert.equal(c.detalle.length,2);assert.equal(c.detalle[1].cubiertos,0);});
test('CSV: duplicados de lote y entre lotes se omiten; conflictos atómicos',()=>{const d=base(),p=d.pacientes[0],s=`fecha;episodio;componente;dias\n2026-01-01;${p.eventos[1].id};A;30`;const r=importarCSV(p,s+'\n'+s.split('\n')[1]);assert.equal(r.filas.length,1);assert.equal(r.duplicadas.length,1);const dd=anexar(d,p.id,{tipo:'importacion',...r});assert.equal(importarCSV(dd.pacientes[0],s).filas.length,0);assert.throws(()=>importarCSV(dd.pacientes[0],s.replace(';30',';31')),/conflicto/);assert.equal(d.pacientes[0].eventos.length,2);});
test('CSV rechaza identificación, fechas imposibles, componente y episodio ajenos',()=>{const p=base().pacientes[0],ep=p.eventos[1].id;for(const s of ['nombre;fecha\nAna;2026-01-01',`fecha;episodio;componente;dias\n2026-02-30;${ep};A;30`,`fecha;episodio;componente;dias\n2026-01-01;otro;A;30`,`fecha;episodio;componente;dias\n2026-01-01;${ep};B;30`,`fecha;episodio;componente;dias\n2026-01-01;${ep};A;0`])assert.throws(()=>importarCSV(p,s));});
test('CSV no acepta una dispensación del antiguo episodio después del cambio',()=>{let d=base();const old=d.pacientes[0].eventos[1].id;d=anexar(d,'DEMO-001',{tipo:'tratamiento',fecha:'2026-01-16',tar:'TAR_B'});assert.throws(()=>importarCSV(d.pacientes[0],`fecha;episodio;componente;dias\n2026-01-17;${old};A;30`));});
test('Datos y eventos previos no cambian al añadir tratamientos y visitas',()=>{const d=demo(),before=JSON.stringify(d),next=anexar(d,'DEMO-001',{tipo:'tratamiento',fecha:'2026-12-01',tar:'TAR_B'});assert.equal(JSON.stringify(d),before);assert.deepEqual(next.pacientes[0].eventos.slice(0,-1),d.pacientes[0].eventos);next.pacientes[0].eventos[0].nivel='3';assert.equal(d.pacientes[0].eventos[0].nivel,'1');});
test('Informe es una instantánea independiente de tratamientos, datos y reglas posteriores',()=>{const d=demo(),p=d.pacientes[0],r={...cfg},i=informe(p,'2026-11-08',r),before=JSON.stringify(i);p.eventos[0].nivel='2';r.umbral=0.1;assert.equal(JSON.stringify(i),before);assert.equal(i.nivel,'1');});
test('Alertas explican numerador, denominador y versión; parámetro configurable',()=>{const p=base().pacientes[0],a=alertas(p,'2026-01-31',cfg);assert.match(a[0].texto,/0\/30/);assert.equal(a[0].version,cfg.version);assert.match(a[0].estado,/Pendiente/);assert.equal(alertas(p,'2026-01-31',{...cfg,umbral:0}).length,0);assert.throws(()=>alertas(p,'2026-01-31',{...cfg,ventana:0}));});
test('Comunicaciones: secuencia completa, sin saltos, sin retrocesos ni informes inexistentes',()=>{let d=base();d=anexar(d,'DEMO-001',informe(d.pacientes[0],'2026-01-31',cfg));const id=d.pacientes[0].eventos.at(-1).id;for(const estado of ['comunicado','recibido','valorado','resuelto'])d=anexar(d,'DEMO-001',{tipo:'estado_comunicacion',informe:id,estado});assert.equal(estadoComunicacion(d.pacientes[0],id),'resuelto');assert.throws(()=>transicion('pendiente','resuelto'));assert.throws(()=>transicion('recibido','pendiente'));assert.throws(()=>anexar(d,'DEMO-001',{tipo:'estado_comunicacion',informe:'no',estado:'comunicado'}));});
test('Persistencia, aislamiento y fallo de almacenamiento visible',()=>{const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},r=new RepositorioDemo(storage),d=demo();r.guardar(d);assert.deepEqual(r.leer(),d);const x=r.leer();x.pacientes.pop();assert.equal(r.leer().pacientes.length,3);storage.setItem=()=>{throw Error('cuota')};assert.throws(()=>r.guardar(d),/cuota/);});
test('No se reescriben inicios ni se aceptan opciones de experiencia libres',()=>{const d=base();assert.throws(()=>anexar(d,'DEMO-001',{tipo:'tratamiento',tar:'TAR_A',fecha:'2025-12-01'}));assert.throws(()=>anexar(d,'DEMO-001',{tipo:'visita',fecha:'2026-02-01',experiencia:{barrera:'nombre real'}}));});

test('Cambio posterior a una dispensación ya registrada: conserva fila y señala necesidad de conciliación',()=>{
 let d=base();d=csv(d,p=>[`2026-01-20;${p.eventos[1].id};A;30`]);
 const antes=JSON.stringify(d.pacientes[0].eventos);
 d=anexar(d,'DEMO-001',{tipo:'tratamiento',fecha:'2026-01-16',tar:'TAR_B'});
 assert.equal(JSON.stringify(d.pacientes[0].eventos.slice(0,-1)),antes);
 assert.equal(cobertura(d.pacientes[0],'2026-01-31',cfg).cubiertos,0);
 assert.ok(alertas(d.pacientes[0],'2026-01-31',cfg).some(a=>a.regla==='datos_fuera_episodio'));
});
test('Ventana acotada conserva suministro previo y no incluye dispensaciones posteriores al corte',()=>{
 let d=base();d=csv(d,p=>{const ep=p.eventos[1].id;return [`2026-01-01;${ep};A;90`,`2026-04-01;${ep};A;90`];});
 const c=cobertura(d.pacientes[0],'2026-03-01',cfg);assert.equal(c.total,30);assert.equal(c.cubiertos,30);assert.equal(c.pdc,1);
});
