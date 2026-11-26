import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFileSync, readdirSync } from 'node:fs';
import http from 'node:http';

/**
 * A10 · Controles de seguridad de la superficie actual (docs/strategy/THREAT_MODEL.md §6).
 * Alcance: servidor estático de demostración y código del navegador. NO sustituye una prueba de penetración ni una
 * revisión de seguridad; solo evita que se deteriore lo que hoy se sabe que funciona.
 */
const RAIZ = new URL('../', import.meta.url);
const leer = (f) => readFileSync(new URL(f, RAIZ), 'utf8');
const libre = () => new Promise((ok) => { const s = createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const pedir = (puerto, ruta) => new Promise((ok, ko) => {
  const r = http.request({ host: '127.0.0.1', port: puerto, path: ruta, method: 'GET' }, (res) => { res.resume(); res.on('end', () => ok(res)); });
  r.on('error', ko); r.end();
});
async function conServidor(fn) {
  const puerto = await libre();
  const hijo = spawn(process.execPath, ['servidor.mjs'], { cwd: new URL('.', RAIZ).pathname, env: { ...process.env, PORT: String(puerto) }, stdio: ['ignore', 'pipe', 'ignore'] });
  try {
    await new Promise((ok, ko) => { hijo.stdout.once('data', ok); hijo.once('error', ko); setTimeout(() => ko(Error('el servidor no arrancó')), 8000); });
    return await fn(puerto);
  } finally { hijo.kill(); }
}
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const fuentes = readdirSync(new URL('src/', RAIZ)).filter((f) => f.endsWith('.js')).map((f) => [f, sinComentarios(leer('src/' + f))]);

test('El servidor solo sirve la lista blanca: ni recorridos de ruta, ni código fuente del servidor, pruebas, .git o documentación Markdown', async () => {
  await conServidor(async (p) => {
    for (const ruta of ['/src/../package.json', '/%2e%2e/package.json', '/src/%2e%2e/servidor.mjs', '/servidor.mjs', '/package.json', '/pruebas/motor.test.mjs', '/.git/config', '/docs/PILOTO.md', '/src/app.js/../../package.json', '/src//app.js%00.txt'])
      assert.equal((await pedir(p, ruta)).statusCode, 404, ruta);
    for (const ruta of ['/', '/src/motor.js', '/datos/guia-vih.json', '/docs/manual-uso.pdf']) assert.equal((await pedir(p, ruta)).statusCode, 200, ruta);
  });
});

test('Cada respuesta lleva una CSP estricta, nosniff y no se cachea', async () => {
  await conServidor(async (p) => {
    for (const ruta of ['/', '/src/app.js', '/datos/guia-vih.json']) {
      const h = (await pedir(p, ruta)).headers, csp = h['content-security-policy'];
      for (const d of ["default-src 'self'", "script-src 'self'", "style-src 'self'", "object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'"]) assert.ok(csp.includes(d), `${ruta}: falta ${d}`);
      assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|\*|data:|blob:/, ruta);
      assert.equal(h['x-content-type-options'], 'nosniff');
      assert.equal(h['cache-control'], 'no-store');
    }
  });
});

test('La CSP solo permite conectar al propio origen y a cima.aemps.es, y la del HTML no es más laxa que la del servidor', async () => {
  const meta = leer('index.html').match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1];
  assert.ok(meta, 'index.html debe declarar su CSP');
  assert.match(meta, /connect-src 'self' https:\/\/cima\.aemps\.es(;|$)/);
  assert.doesNotMatch(meta, /unsafe-inline|unsafe-eval|\*/);
  await conServidor(async (p) => {
    const csp = (await pedir(p, '/')).headers['content-security-policy'];
    for (const d of meta.split(';').map((x) => x.trim()).filter(Boolean)) assert.ok(csp.includes(d), `la CSP del servidor no incluye «${d}» del HTML`);
  });
});

test('El código del navegador no usa APIs de ejecución dinámica ni de inyección de HTML sin escapar', () => {
  for (const [f, t] of fuentes) {
    assert.doesNotMatch(t, /\beval\s*\(|new Function\s*\(|document\.write\s*\(|insertAdjacentHTML|outerHTML\s*=/, `${f} usa una API peligrosa`);
    assert.doesNotMatch(t, /setTimeout\s*\(\s*['"`]|setInterval\s*\(\s*['"`]/, `${f} evalúa una cadena`);
  }
});

test('Las asignaciones a innerHTML no aumentan sin revisión (límite revisado: 25 hoy); cada subida exige revisar el escape y actualizar este número', () => {
  const n = fuentes.reduce((a, [, t]) => a + (t.match(/innerHTML\s*=/g) || []).length, 0);
  assert.ok(n <= 25, `hay ${n} asignaciones a innerHTML (límite revisado: 25). Revise el escape de cada dato interpolado y actualice el límite`);
});

test('Todo fetch del navegador va a datos/ del propio origen o al catálogo CIMA; no hay URL http:// ni destinos nuevos', () => {
  for (const [f, t] of fuentes) {
    assert.doesNotMatch(t, /['"`]http:\/\/(?!localhost|127\.0\.0\.1)/, `${f} usa http://`);
    for (const m of t.matchAll(/\bfetch\s*\(\s*([^,)]+)/g)) assert.match(m[1], /^`datos\/\$\{n\}\.json`$/, `${f}: fetch a ${m[1]}`);
  }
  const cima = sinComentarios(leer('src/cima.js'));
  assert.match(cima, /CIMA_BASE = "https:\/\/cima\.aemps\.es\/cima\/rest"/);
  assert.match(cima, /credentials: "omit"/);
  assert.match(cima, /referrerPolicy: "no-referrer"/);
  assert.match(cima, /AbortSignal\.timeout/);
});

test('Todo enlace que abre otra pestaña lleva noopener noreferrer', () => {
  for (const [f, t] of [...fuentes, ['index.html', leer('index.html')]])
    for (const m of t.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) assert.match(m[0], /rel="noopener noreferrer"/, `${f}: ${m[0].slice(0, 80)}`);
});

test('La aplicación no guarda credenciales ni claves: ningún módulo escribe contraseñas o tokens en almacenamiento', () => {
  for (const [f, t] of fuentes) assert.doesNotMatch(t, /(setItem\s*\([^)]*(password|contrase|token|secret|apikey))/i, `${f} guarda un secreto`);
});
