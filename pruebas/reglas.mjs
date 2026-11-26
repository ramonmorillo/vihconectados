import {chromium} from 'playwright';
import assert from 'node:assert/strict';
/** A03 · Registro de reglas en la interfaz: tabla, parámetros de sesión deterministas y normalización de sesiones antiguas. */
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try {
 const page=await browser.newPage({locale:'es-ES',viewport:{width:1440,height:1000}}),errores=[],externas=[];
 page.on('pageerror',e=>errores.push(e.message));page.on('console',m=>{if(m.type()==='error')errores.push(m.text());});
 page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5173/'))externas.push(r.url());});
 const tabla=()=>page.locator('#registroReglas').textContent();
 const encabezado=()=>page.locator('h3').filter({hasText:'Reglas de demostración'}).textContent();
 const configurar=async(ventana,umbral)=>{
  await page.getByRole('button',{name:'Configurar parámetros de demostración',exact:true}).click();
  await page.locator('input[name=ventana]').fill(String(ventana));await page.locator('input[name=umbral]').fill(String(umbral));
  await page.getByRole('button',{name:'Guardar registro',exact:true}).click();
  await page.getByRole('heading',{name:/Reglas de demostración/}).waitFor();
 };
 await page.goto('http://127.0.0.1:5173/#modelo');await page.locator('#registroReglas').waitFor();
 let t=await tabla();
 for (const id of ['pdc_oral','cobertura_demo','datos_fuera_episodio','experiencia_referida','sin_datos','tar_inyectable_no_evaluable']) assert.match(t,new RegExp(id));
 assert.equal((t.match(/Pendiente de validación profesional/g)||[]).length,6);
 assert.match(await encabezado(),/demo-1$/);

 await configurar(90,80);
 const version=(await encabezado()).replace(/^.*· /,'').trim();
 assert.equal(version,'demo-1+mod(ventana=90;umbral=0.8)');
 t=await tabla();
 assert.equal((t.match(/Parámetros modificados por el usuario; sin validación/g)||[]).length,2,'solo pdc_oral y cobertura_demo dependen de parámetros');
 assert.equal((t.match(/Pendiente de validación profesional/g)||[]).length,4);

 await page.reload();await page.locator('#registroReglas').waitFor();
 assert.equal((await encabezado()).replace(/^.*· /,'').trim(),version,'la sesión conserva la versión');
 await configurar(90,80);
 assert.equal((await encabezado()).replace(/^.*· /,'').trim(),version,'los mismos parámetros dan la misma versión (no depende del reloj)');

 await page.evaluate(()=>sessionStorage.setItem('vih.reglas',JSON.stringify({version:'demo-local-1700000000000',ventana:60,umbral:0.5,validacion:'Pendiente de validación profesional'})));
 await page.reload();await page.locator('#registroReglas').waitFor();
 assert.equal((await encabezado()).replace(/^.*· /,'').trim(),'demo-1+mod(ventana=60;umbral=0.5)','una sesión antigua se normaliza');
 assert.match(await tabla(),/Parámetros modificados/);

 await configurar(180,90);
 assert.match(await encabezado(),/demo-1$/);
 assert.equal(((await tabla()).match(/Pendiente de validación profesional/g)||[]).length,6,'con los parámetros vigentes vuelve al estado del registro');

 await page.getByRole('button',{name:'Configurar parámetros de demostración',exact:true}).click();
 await page.locator('input[name=ventana]').fill('731');await page.getByRole('button',{name:'Guardar registro',exact:true}).click();
 // La validación nativa del campo (max=730) impide el envío: el diálogo sigue abierto y nada cambia.
 assert.equal(await page.locator('#modal').evaluate(d=>d.open),true,'un valor fuera de rango no se acepta');
 await page.getByRole('button',{name:'Cerrar',exact:true}).click();
 assert.match(await encabezado(),/demo-1$/);
 assert.equal(errores.length,0,errores.join('\n'));assert.deepEqual(externas,[]);
 console.log('Reglas: registro visible, versión determinista de parámetros de sesión, normalización de sesiones antiguas y rechazo fuera de rango: OK');
} finally { await browser.close(); }
