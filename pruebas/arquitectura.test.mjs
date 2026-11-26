import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

/**
 * A07 · Separación de dominio e interfaz (docs/ARQUITECTURA.md).
 * Una regla por defecto: todo módulo de `src/` es de DOMINIO salvo que figure en la lista de interfaz. Así un módulo
 * nuevo nace obligado a no tocar el navegador. Se analiza el texto fuente, sin comentarios.
 */
const SRC = new URL('../src/', import.meta.url);
const modulos = readdirSync(SRC).filter((f) => f.endsWith('.js')).sort();
const INTERFAZ = new Set(['app.js', 'desktop.js', 'legal.js', 'portada.js', 'vista-consulta.js', 'vista-informes.js', 'vista-solicitudes.js', 'medicacion.js', 'registro-manual.js', 'revision-datos.js']);
const dominio = modulos.filter((m) => !INTERFAZ.has(m));
const fuente = (f) => readFileSync(new URL(f, SRC), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n');
const importaciones = (f) => [...sinComentarios(fuente(f)).matchAll(/import\s+(?:([\s\S]*?)\s+from\s+)?['"]([^'"]+)['"]/g)].map((m) => ({
  nombres: (m[1] || '').replace(/[{}\n]/g, ' ').split(',').map((x) => x.trim().split(/\s+as\s+/)[0]).filter(Boolean),
  ruta: m[2].replace(/^\.\//, ''),
}));
const nombresImportados = (f) => importaciones(f).flatMap((i) => i.nombres);
const GLOBALES = /\b(document|window|localStorage|sessionStorage|location|navigator)\b/;

test('La lista de módulos de interfaz está al día y los módulos de dominio nuevos existen', () => {
  for (const m of INTERFAZ) assert.ok(modulos.includes(m), `${m} figura como interfaz pero no existe`);
  for (const m of ['conciliacion.js', 'eventos-formulario.js', 'seleccion-tar.js', 'comandos.js', 'repositorio.js'])
    assert.ok(dominio.includes(m), `${m} debe existir y ser de dominio`);
  assert.ok(dominio.length >= 20);
});

test('Ningún módulo de dominio referencia document, window, localStorage, sessionStorage, location ni navigator', () => {
  for (const m of dominio) assert.doesNotMatch(sinComentarios(fuente(m)), GLOBALES, `${m} usa un global del navegador`);
});

test('La dependencia va de la interfaz al dominio, nunca al revés', () => {
  for (const m of dominio) for (const i of importaciones(m)) assert.ok(!INTERFAZ.has(i.ruta.split('/').pop()), `${m} importa el módulo de interfaz ${i.ruta}`);
});

test('revision-datos, registro-manual y medicacion no contienen decisiones de dominio: delegan en los módulos puros', () => {
  const PROHIBIDOS = ['anexar', 'planificarDispensaciones', 'validarDispensacion', 'prepararDispensacionManual', 'leerCSV', 'importarCSV', 'modalidadTar',
    'validarMedicamentos', 'validarEvaluacionAdherencia', 'validarGestionSenal', 'validarConsulta', 'validarSeguimiento'];
  const PUROS = ['conciliacion.js', 'eventos-formulario.js', 'seleccion-tar.js'];
  for (const m of ['revision-datos.js', 'registro-manual.js', 'medicacion.js']) {
    for (const n of nombresImportados(m)) assert.ok(!PROHIBIDOS.includes(n), `${m} importa ${n}: esa lógica debe estar en un módulo puro`);
    assert.ok(importaciones(m).some((i) => PUROS.includes(i.ruta)), `${m} no usa ningún módulo puro`);
  }
});

test('La interfaz escribe solo mediante comandos: app.js y vista-consulta.js no llaman a funciones de escritura ni al repositorio de bajo nivel', () => {
  const ESCRITURA = ['anexar', 'crearPaciente', 'crearCasoEscenario', 'incorporarCohorte', 'registrarConsulta', 'registrarSeguimiento', 'RepositorioDemo', 'demo'];
  for (const m of ['app.js', 'vista-consulta.js']) for (const n of nombresImportados(m)) assert.ok(!ESCRITURA.includes(n), `${m} importa ${n}`);
  const app = sinComentarios(fuente('app.js'));
  assert.doesNotMatch(app, /\brepo\.(guardar|leer)\(/, 'app.js no debe usar leer()/guardar(db)');
  assert.match(app, /repo\.ejecutar\(/);
  assert.ok(nombresImportados('app.js').includes('RepositorioLocal'));
});
