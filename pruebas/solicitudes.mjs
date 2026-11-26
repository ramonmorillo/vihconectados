import { chromium } from 'playwright';
import assert from 'node:assert/strict';

/** Solicitudes de valoración entre perfiles: ciclo completo en el navegador (prototipo local, perfil declarado). */
const URL_BASE = process.env.URL_BASE || 'http://127.0.0.1:5173/';
const F = 'Farmacia Hospitalaria', I = 'Infecciosas';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  const ctx = await browser.newContext({ locale: 'es-ES', viewport: { width: 1440, height: 1000 } }), page = await ctx.newPage();
  const errores = [], externas = [];
  page.on('pageerror', (e) => errores.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('request', (r) => { if (!r.url().startsWith(URL_BASE)) externas.push(r.url()); });
  const seccion = (titulo) => page.locator('section.card', { has: page.getByRole('heading', { name: titulo, exact: true }) });
  const perfil = async (p) => { await page.locator('#perfilTrabajo').selectOption(p); await page.locator('#perfilTrabajo').waitFor(); };

  // 1. Farmacia solicita desde la ficha del caso; el motivo con HTML se muestra como texto.
  await page.goto(URL_BASE + '#caso/DEMO-001'); await page.getByRole('button', { name: 'Solicitar valoración', exact: true }).click();
  await page.locator('textarea[name=motivo]').fill('<b id="inyectado">Valorar</b> la cobertura del caso sintético');
  await page.getByRole('button', { name: 'Guardar registro', exact: true }).click();
  const tarjeta = page.locator('article.solicitud').first(); await tarjeta.waitFor();
  assert.match(await tarjeta.textContent(), /Farmacia Hospitalaria → Infecciosas/); assert.match(await tarjeta.textContent(), /Enviada/);
  assert.match(await tarjeta.textContent(), /<b id="inyectado">Valorar<\/b>/, 'el HTML se ve como texto');
  assert.equal(await page.locator('#inyectado').count(), 0, 'no se interpreta como HTML');
  assert.equal(await tarjeta.getByRole('button').count(), 0, 'el origen no puede dar el paso del destino');

  // 2. Infecciosas la ve en «Me toca», acusa recibo y responde.
  await page.goto(URL_BASE + '#solicitudes'); await perfil(I);
  assert.equal(await seccion('Me toca').locator('article.solicitud').count(), 1);
  assert.equal(await seccion('Esperando a la otra parte').locator('article.solicitud').count(), 0);
  await seccion('Me toca').getByRole('button', { name: 'Marcar recibida', exact: true }).click();
  await seccion('Me toca').getByRole('button', { name: 'Responder', exact: true }).click();
  await page.locator('textarea[name=respuesta]').fill('Respuesta sintética: comprobar la recogida.');
  await page.getByRole('button', { name: 'Guardar registro', exact: true }).click();
  await seccion('Esperando a la otra parte').locator('article.solicitud').waitFor();
  assert.match(await seccion('Esperando a la otra parte').textContent(), /Respondida/);
  assert.match(await seccion('Esperando a la otra parte').textContent(), /Respuesta sintética: comprobar la recogida\./);

  // 3. Farmacia la cierra.
  await perfil(F);
  assert.equal(await seccion('Me toca').locator('article.solicitud').count(), 1);
  await seccion('Me toca').getByRole('button', { name: 'Cerrar solicitud', exact: true }).click();
  await seccion('Cerradas').locator('article.solicitud').waitFor();
  assert.equal(await seccion('Me toca').locator('article.solicitud').count(), 0);
  const hist = await seccion('Cerradas').locator('details').textContent();
  assert.match(hist, /Enviada · Farmacia Hospitalaria/); assert.match(hist, /Recibida · Infecciosas/); assert.match(hist, /Respondida · Infecciosas/); assert.match(hist, /Cerrada · Farmacia Hospitalaria/);

  // 4. Persiste al recargar y respeta la fecha de corte (antes del envío no existe).
  await page.reload(); await page.locator('#perfilTrabajo').waitFor();
  assert.equal(await seccion('Cerradas').locator('article.solicitud').count(), 1);
  await page.locator('#corte').fill('2026-11-07');
  await page.getByText('Aún no hay solicitudes cerradas.').waitFor();
  assert.equal(await page.locator('article.solicitud').count(), 0);

  assert.deepEqual(errores, [], errores.join('\n')); assert.deepEqual(externas, []);
  console.log('Solicitudes: envío desde el caso, bandeja por perfil, acuse, respuesta, cierre, historial, persistencia, corte temporal y escape de HTML: OK');
} finally { await browser.close(); }
