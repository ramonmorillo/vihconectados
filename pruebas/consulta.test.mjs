import test from 'node:test';
import assert from 'node:assert/strict';
import {crearPaciente,vacio,anexar} from '../src/almacen.js';
import {registrarConsulta,registrarSeguimiento} from '../src/comandos-consulta.js';
import {agendaConsultas,consultasHasta} from '../src/consulta.js';
import {EXPERIENCIA,REGLAS,cobertura} from '../src/motor.js';
import {informe,textoInforme} from '../src/informes.js';
import {vistaInforme} from '../src/vista-informes.js';
import {vistaConsultas} from '../src/vista-consulta.js';
import {demo} from '../src/demo.js';
import {nivelHasta,aplicable} from '../src/temporal.js';
const base=()=>anexar(crearPaciente(vacio(),'2','2026-01-01'),'DEMO-001',{tipo:'tratamiento',fecha:'2026-01-01',tar:'TAR_A'});
const v=(extra={})=>({fecha:'2026-01-31',problema:'Coordinación asistencial',objetivo:'Comprobar el acuerdo sintético en la revisión',responsable:'Farmacia Hospitalaria',revision:'2026-02-07',revisado:true,experiencia_modo:'existente',actuacion_modo:'nueva',accion:'Revisar el acuerdo sintético',...extra});
test('Consulta compuesta anexa experiencia, valoración y actuación de forma atómica, con vínculos y sin realizar automáticamente',()=>{
 const d=base(),original=JSON.stringify(d),exp=Object.fromEntries(Object.entries(EXPERIENCIA).map(([k,xs])=>[k,xs[0]]));
 const next=registrarConsulta(d,'DEMO-001',v({experiencia_modo:'nueva',experiencia:exp,adherencia:{periodo_inicio:'2026-01-01',periodo_fin:'2026-01-31',metodo:'Autoinforme',resultado:'No concluyente',porcentaje:75}}),REGLAS);
 const p=next.pacientes[0],c=p.eventos.at(-1);
 assert.equal(c.tipo,'consulta');assert.equal(c.contexto.tratamiento,'TAR_A');assert.equal(c.contexto.nivel,'2');
 for(const k of ['visita','evaluacion','actuacion'])assert.ok(p.eventos.some(e=>e.id===c[k]));
 assert.equal(consultasHasta(p,'2026-01-31')[0].actuacion_realizada,false);assert.equal(consultasHasta(p,'2026-01-31')[0].resultado,'Pendiente de evaluar');
 assert.equal(JSON.stringify(d),original);
 assert.throws(()=>registrarConsulta(d,'DEMO-001',v({experiencia_modo:'nueva',experiencia:exp,revision:'2026-01-01'}),REGLAS),/Revise/);
 assert.equal(JSON.stringify(d),original);
});
test('Vincula registros existentes sin duplicarlos ni crear una experiencia que no se recogió',()=>{
 let d=base();d=anexar(d,'DEMO-001',{tipo:'actuacion',texto:'Actuación previa',estado:'pendiente',fecha:'2026-01-20'});const act=d.pacientes[0].eventos.at(-1).id;
 const next=registrarConsulta(d,'DEMO-001',v({actuacion_modo:'existente',actuacion:act}),REGLAS),c=next.pacientes[0].eventos.at(-1);
 assert.equal(next.pacientes[0].eventos.length,d.pacientes[0].eventos.length+1);assert.equal(c.visita,null);assert.equal(c.evaluacion,null);assert.equal(c.actuacion,act);
 assert.throws(()=>registrarConsulta(d,'DEMO-001',v({actuacion_modo:'existente',actuacion:'ajena'}),REGLAS),/Vincule/);
});
test('Agenda por corte: próximo, para el corte, vencido y cerrado; resultado distinto de ejecución',()=>{
 let d=registrarConsulta(base(),'DEMO-001',v(),REGLAS),p=d.pacientes[0],id=p.eventos.at(-1).id;
 assert.equal(agendaConsultas([p],'2026-01-30').length,0);
 assert.equal(agendaConsultas([p],'2026-02-06')[0].plazo,'próxima');assert.equal(agendaConsultas([p],'2026-02-07')[0].plazo,'para el corte');assert.equal(agendaConsultas([p],'2026-02-08')[0].plazo,'vencida');
 d=registrarSeguimiento(d,'DEMO-001',{consulta:id,fecha:'2026-02-08',estado:'en_curso',resultado:'Objetivo parcialmente alcanzado',observaciones:'Seguimiento sintético',responsable:'Infecciosas',revision:'2026-02-10',marcar_realizada:true});
 p=d.pacientes[0];assert.equal(agendaConsultas([p],'2026-02-08')[0].responsable,'Infecciosas');assert.equal(consultasHasta(p,'2026-02-08')[0].actuacion_realizada,true);assert.equal(consultasHasta(p,'2026-02-08')[0].estado,'en_curso');
 assert.equal(consultasHasta(p,'2026-02-07')[0].actuacion_realizada,false);
 d=registrarSeguimiento(d,'DEMO-001',{consulta:id,fecha:'2026-02-10',estado:'cerrada',resultado:'Objetivo no alcanzado',observaciones:'Cierre fundamentado en simulación',responsable:'Infecciosas'});
 assert.equal(agendaConsultas(d.pacientes,'2026-02-10')[0].plazo,'cerrada');assert.equal(consultasHasta(d.pacientes[0],'2026-02-09')[0].estado,'en_curso');
 assert.throws(()=>registrarSeguimiento(d,'DEMO-001',{consulta:id,fecha:'2026-02-11'}),/cerrado/);
});
test('Validación rechaza plazos invertidos, roles inválidos, cierre sin resultado y seguimientos retroactivos',()=>{
 const original=base();
 for(const extra of [{objetivo:''},{responsable:'Persona real'},{revision:'2026-01-01'},{revisado:false},{accion:''},{experiencia_modo:'inválido'}])assert.throws(()=>registrarConsulta(original,'DEMO-001',v(extra),REGLAS));
 let d=registrarConsulta(original,'DEMO-001',v(),REGLAS),id=d.pacientes[0].eventos.at(-1).id;
 const s={consulta:id,fecha:'2026-02-08',estado:'en_curso',resultado:'Pendiente de evaluar',observaciones:'Sintético',responsable:'Farmacia Hospitalaria',revision:'2026-02-09'};
 for(const extra of [{consulta:'ajena'},{fecha:'2026-01-01'},{revision:'2026-02-01'},{observaciones:''},{estado:'cerrada'}])assert.throws(()=>registrarSeguimiento(d,'DEMO-001',{...s,...extra}));
 d=registrarSeguimiento(d,'DEMO-001',s);assert.throws(()=>registrarSeguimiento(d,'DEMO-001',{...s,fecha:'2026-02-07'}),/último/);
});
test('Planes e informes conservan instantáneas, escapan texto y no cambian el PDC',()=>{
 let d=base(),p=d.pacientes[0],cob=cobertura(p,'2026-01-31'),previo=informe(p,'2026-01-31'),htmlPrevio=vistaInforme(previo);
 d=registrarConsulta(d,p.id,v({objetivo:'Prueba <script>alert(1)</script>'}),REGLAS);p=d.pacientes[0];
 assert.deepEqual(cobertura(p,'2026-01-31'),cob);const i=informe(p,'2026-01-31'),json=JSON.stringify(i);
 assert.match(textoInforme(i),/PLANES Y SEGUIMIENTO/);assert.match(vistaInforme(i),/&lt;script&gt;/);assert.doesNotMatch(vistaConsultas(p,'2026-01-31'),/<script>/);
 d=registrarSeguimiento(d,p.id,{consulta:p.eventos.at(-1).id,fecha:'2026-02-08',estado:'cerrada',resultado:'No evaluable',observaciones:'Sin información suficiente',responsable:'Equipo compartido'});
 assert.equal(JSON.stringify(i),json);assert.equal(vistaInforme(previo),htmlPrevio);
});
test('Ejemplos nuevos fijan fechas efectivas y mantienen visibles sus niveles/estados en el corte de demostración',()=>{
 const d=demo();assert.deepEqual(d.pacientes.map(p=>nivelHasta(p,'2026-11-08')),['1','2','3']);
 assert.ok(d.pacientes.every(p=>p.eventos.filter(e=>['actuacion','estado_actuacion','estado_comunicacion'].includes(e.tipo)).every(e=>e.fecha && aplicable(e,'2026-11-08'))));
});
test('Un seguimiento no adelanta una realización posterior y el comando compuesto falla sin guardar parcialmente',()=>{
 let d=registrarConsulta(base(),'DEMO-001',v(),REGLAS);const c=d.pacientes[0].eventos.at(-1);
 d=anexar(d,'DEMO-001',{tipo:'estado_actuacion',actuacion:c.actuacion,estado:'realizada',fecha:'2026-02-10'});
 const antes=JSON.stringify(d);
 assert.throws(()=>registrarSeguimiento(d,'DEMO-001',{consulta:c.id,fecha:'2026-02-08',estado:'en_curso',resultado:'Pendiente de evaluar',observaciones:'Seguimiento sintético',responsable:'Farmacia Hospitalaria',revision:'2026-02-15',marcar_realizada:true}),/posterior/);
 assert.equal(JSON.stringify(d),antes);
});
