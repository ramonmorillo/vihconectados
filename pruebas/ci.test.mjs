import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * A05 · La integración continua cumple las restricciones del encargo: sin coste añadido, sin dependencias, sin secretos
 * y con los mínimos permisos. Se analiza el texto del flujo (sin dependencia de un intérprete de YAML).
 */
const leer = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const flujo = leer('.github/workflows/ci.yml').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
const paquete = JSON.parse(leer('package.json'));

test('El flujo de CI ejecuta las pruebas unitarias y la comprobación de sintaxis', () => {
  assert.match(flujo, /run: npm test\b/);
  assert.match(flujo, /run: npm run check\b/);
  assert.match(flujo, /node-version: 22/);
  assert.match(flujo, /timeout-minutes: \d+/);
});

test('El flujo no instala dependencias ni ejecuta el navegador (sin coste ni superficie añadidos)', () => {
  assert.doesNotMatch(flujo, /npm (ci|install|i)\b/);
  assert.doesNotMatch(flujo, /playwright|test:browser|chromium/i);
  assert.equal(paquete.dependencies, undefined, 'la aplicación no tiene dependencias de ejecución');
  assert.deepEqual(Object.keys(paquete.devDependencies), ['playwright']);
});

test('El flujo usa permisos de solo lectura, sin secretos ni disparadores peligrosos, y solo acciones oficiales', () => {
  assert.match(flujo, /permissions:\s*\n\s+contents: read/);
  assert.doesNotMatch(flujo, /secrets\./);
  assert.doesNotMatch(flujo, /pull_request_target|workflow_run|issue_comment/);
  assert.doesNotMatch(flujo, /write-all|contents: write|id-token/);
  const acciones = [...flujo.matchAll(/uses: ([^\s@]+)@/g)].map((m) => m[1]);
  assert.deepEqual(acciones.sort(), ['actions/checkout', 'actions/setup-node']);
});

test('Las pruebas unitarias se ejecutan con Node sin instalar nada: el guion test no depende de node_modules', () => {
  assert.match(paquete.scripts.test, /^node --test /);
  assert.doesNotMatch(paquete.scripts.test, /playwright/);
  assert.doesNotMatch(paquete.scripts.check, /playwright/);
});
