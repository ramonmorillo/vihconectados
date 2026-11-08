import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
try {
const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[], external=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5173')) external.push(r.url());});
const go=async hash=>{await page.goto('http://127.0.0.1:5173/'+hash);await page.locator('.desk-nav').waitFor();};
await go('#panel/poblacional');
await page.getByRole('heading',{name:'Mesa de revisión',exact:true}).waitFor();
assert.equal(await page.locator('.stats .stat strong').first().textContent(),'3');
await page.screenshot({path:'/tmp/vih-stitch-poblacional.png',fullPage:true});
await page.getByRole('link',{name:'Cohorte',exact:true}).click();
await page.locator('#desk-buscar').fill('DEMO-002');
assert.equal(await page.locator('#desk-tabla tbody tr').count(),1);
await page.locator('#desk-tabla').getByRole('link',{name:'Ver ficha',exact:true}).click();
await page.getByRole('heading',{name:'Cronograma de cobertura por episodio'}).waitFor();
await page.getByRole('button',{name:'Historia longitudinal',exact:true}).click();
await page.getByRole('heading',{name:'Registro longitudinal',exact:true}).waitFor();
await page.getByRole('link',{name:'Intervención CMO',exact:true}).click();
await page.getByRole('heading',{name:'Itinerario de intervención CMO'}).waitFor();
await page.getByRole('button',{name:'Registrar experiencia',exact:true}).click();
await page.locator('#modal').waitFor();
await page.getByRole('button',{name:'Cerrar',exact:true}).click();
const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('vihconectados.demo.v1')).pacientes[1].eventos.length);
await page.getByRole('button',{name:'Añadir a pendientes',exact:true}).first().click();
await page.reload();
await page.getByRole('heading',{name:'Itinerario de intervención CMO'}).waitFor();
const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('vihconectados.demo.v1')).pacientes[1].eventos.length);
assert.equal(after,before+1);
await page.getByRole('button',{name:'Ver informes del caso',exact:true}).click();
await page.getByRole('button',{name:'Generar informe simulado',exact:true}).waitFor();
await page.getByRole('button',{name:'Ir a la biblioteca ↓',exact:true}).click();
await page.getByRole('heading',{name:/Biblioteca CMO/}).waitFor();
assert.equal(new URL(page.url()).hash,'#panel/cmo/DEMO-002');
for (const width of [1440,390]) {
 await page.setViewportSize({width,height:1000});
 for (const hash of ['#panel/poblacional','#panel/cohorte','#panel/paciente/DEMO-001','#panel/cmo/DEMO-001']) {
  await go(hash);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${width} ${hash}`);
  await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(()=>document.activeElement!==document.body));
 }
}
await go('#panel/cohorte');
await page.locator('#desk-buscar').fill('<img src=x onerror=alert(1)>');
assert.equal(await page.locator('#desk-tabla img').count(),0);
assert.match(await page.locator('#desk-tabla').textContent(),/No hay casos/);
await page.locator('#desk-buscar').fill('');
await page.locator('#desk-filtro').selectOption('senales');
assert.equal(await page.locator('#desk-tabla tbody tr').count(),1);
await page.screenshot({path:'/tmp/vih-stitch-mobile.png',fullPage:true});
await go('#panel/paciente/NO-EXISTE');
await page.getByRole('heading',{name:'Vista no encontrada'}).waitFor();
assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
console.log('Desktop: rutas, filtros, CMO persistente, escape de búsqueda, teclado, 1440/390px y ausencia de solicitudes externas: OK');
} finally { await browser.close(); }
