import test from 'node:test';
import assert from 'node:assert/strict';
import { demo } from '../src/demo.js';
import { REGLAS } from '../src/motor.js';
import { tablaCohorte, resumenLongitudinal, navegacionDesktop } from '../src/desktop.js';
test('Desktop escapa identificadores, TAR y enlaces sin ejecutar HTML del prototipo',()=>{
 const p=demo().pacientes[0];
 p.id='DEMO-<img src=x onerror="alert(1)">';
 p.eventos.filter(e=>e.tipo==='tratamiento').forEach(e=>e.medicamentos=[{nombre:'<script>alert(1)</script>',nregistro:'sintetico'}]);
 const html=tablaCohorte([p],'2026-11-08',REGLAS)+resumenLongitudinal(p,'2026-11-08',REGLAS)+navegacionDesktop('paciente',p.id);
 assert.ok(!html.includes('<img'));
 assert.ok(!html.includes('<script>'));
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(html.includes('&quot;'));
});
test('Desktop preserva los cinco estados y distingue cobertura nula de cero',()=>{
 const p=demo().pacientes[0];
 const i=p.eventos.find(e=>e.tipo==='informe');
 for (const estado of ['pendiente','comunicado','recibido','valorado','resuelto']) {
  const copia=structuredClone(p);
  copia.eventos.push({tipo:'estado_comunicacion',fecha:'2026-11-08',informe:i.id,estado});
  assert.ok(tablaCohorte([copia],'2026-11-08',REGLAS).includes(`>${estado}</span>`));
 }
 const vacio={id:'DEMO-999',eventos:[]};
 assert.match(tablaCohorte([vacio],'2026-11-08',REGLAS),/Sin cálculo/);
 assert.match(resumenLongitudinal(vacio,'2026-11-08',REGLAS),/Sin intervalo evaluable/);
 const sinSuministro=structuredClone(p);
 sinSuministro.eventos=sinSuministro.eventos.filter(e=>e.tipo!=='importacion');
 assert.match(tablaCohorte([sinSuministro],'2026-11-08',REGLAS),/0\s?%/);
});
