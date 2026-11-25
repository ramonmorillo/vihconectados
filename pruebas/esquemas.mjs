import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {demo} from '../src/demo.js';
/** A08 · Datos del formato anterior en el navegador: lectura sin cambios, migración en la primera escritura y datos no conformes conservados. */
const KEY='vihconectados.demo.v1', COPIA=KEY+'.copia-previa';
const v1=structuredClone(demo());v1.formato='vihconectados/demo@1';delete v1.esquema_eventos;
const raw1=JSON.stringify(v1);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const abrir=async(inicial)=>{
 const context=await browser.newContext({locale:'es-ES',viewport:{width:1440,height:1000}}),page=await context.newPage(),errores=[],externas=[];
 page.on('pageerror',e=>errores.push(e.message));page.on('console',m=>{if(m.type()==='error')errores.push(m.text());});
 page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5173/'))externas.push(r.url());});
 await page.addInitScript(([k,v])=>{if(v&&!localStorage.getItem(k)&&!sessionStorage.getItem('vih.sembrado')){localStorage.setItem(k,v);sessionStorage.setItem('vih.sembrado','1');}},[KEY,inicial]);
 return {page,errores,externas,almacen:(k)=>page.evaluate(k=>localStorage.getItem(k),k)};
};
try {
 // 1. Base del formato anterior: se lee sin cambios; la primera escritura la migra y deja copia.
 {
  const {page,errores,externas,almacen}=await abrir(raw1);
  await page.goto('http://127.0.0.1:5173/#pacientes');await page.locator('#nuevo').waitFor();
  assert.equal(await almacen(KEY),raw1,'leer no modifica el almacenamiento');
  assert.match(await page.locator('#mensaje').textContent(),/formato anterior/);
  assert.equal(await page.locator('#contenido').getByText('DEMO-003').first().isVisible(),true,'los tres casos se muestran');
  await page.locator('#nuevo').click();
  await page.locator('select[name=nivel]').selectOption('2');
  await page.getByRole('button',{name:'Guardar registro',exact:true}).click();
  await page.locator('#contenido').getByText('DEMO-004').first().waitFor();
  const nueva=JSON.parse(await almacen(KEY));
  assert.equal(nueva.formato,'vihconectados/demo@2');assert.equal(nueva.pacientes.length,4);
  assert.equal(JSON.stringify(nueva.pacientes.slice(0,3)),JSON.stringify(v1.pacientes),'los eventos anteriores no cambian ni un byte');
  assert.equal(await almacen(COPIA),raw1,'copia íntegra de la base anterior');
  await page.reload();await page.locator('#nuevo').waitFor();
  assert.equal(await page.locator('#mensaje').textContent(),'','ya migrada: sin aviso');
  assert.equal(await almacen(COPIA),raw1,'la copia no se sobrescribe');
  assert.equal(errores.length,0,errores.join('\n'));assert.deepEqual(externas,[]);
 }
 // 2. Eventos antiguos no conformes: se avisa y se conservan.
 {
  const malo=structuredClone(v1);malo.formato='vihconectados/demo@2';malo.esquema_eventos=1;
  const ev={id:'legacy-1',tipo:'importacion',fuente:'X',registrado:'2026-01-01T00:00:00.000Z'};malo.pacientes[0].eventos.push(ev);
  const raw=JSON.stringify(malo);
  const {page,errores,almacen}=await abrir(raw);
  await page.goto('http://127.0.0.1:5173/#pacientes');await page.locator('#nuevo').waitFor();
  const aviso=await page.locator('#mensaje').textContent();
  assert.match(aviso,/1 evento guardado no cumple el esquema actual/);assert.match(aviso,/DEMO-001 · importacion/);
  assert.equal(await almacen(KEY),raw,'no se descarta ni modifica ningún evento');
  assert.equal(errores.length,0,errores.join('\n'));
 }
 // 3. Formato desconocido: no se toca y se explica.
 {
  const raw=JSON.stringify({formato:'vihconectados/demo@9',pacientes:[]});
  const {page,almacen}=await abrir(raw);
  await page.goto('http://127.0.0.1:5173/#pacientes');
  await page.getByText(/No se pudo iniciar: Almacenamiento incompatible/).waitFor();
  assert.match(await page.locator('#contenido').textContent(),/No se han borrado sus datos/);
  assert.equal(await almacen(KEY),raw);
 }
 console.log('Esquemas: lectura sin cambios, migración en la primera escritura con copia previa, eventos no conformes conservados y formato desconocido intacto: OK');
} finally { await browser.close(); }
