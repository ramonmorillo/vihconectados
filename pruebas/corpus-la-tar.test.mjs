import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * A13 · Coherencia del corpus propuesto de LA-TAR (pruebas/corpus-dorado/la-tar.json).
 * NO ejecuta ningún módulo de LA-TAR: no existe (backlog B08). Comprueba que los resultados esperados, calculados a
 * mano a partir de las fichas técnicas, coinciden con una aritmética de calendario independiente y que cada caso
 * cita su fuente. Cuando exista el módulo, el mismo fichero será el corpus contra el que se ejecute.
 */
const corpus = JSON.parse(readFileSync(new URL('./corpus-dorado/la-tar.json', import.meta.url), 'utf8'));
const dia = (s) => Date.parse(s + 'T00:00:00Z') / 86400000;
const iso = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
/** n meses calendario después; si el día no existe en el mes de destino, el último día (propuesta D-02). */
function sumarMeses(s, n) {
  const [y, m, d] = s.split('-').map(Number);
  const destino = new Date(Date.UTC(y, m - 1 + n, 1));
  const ultimo = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate();
  destino.setUTCDate(Math.min(d, ultimo));
  return destino.toISOString().slice(0, 10);
}
const ventana = (diana) => [iso(dia(diana) - 7), iso(dia(diana) + 7)];
const kMeses = (c) => (c.regimen === 'mensual' || c.numero_inyeccion === 2 ? 2 : 3);

test('Corpus LA-TAR: estructura, identificadores únicos, fuentes citadas y decisiones pendientes sin esperado', () => {
  assert.equal(corpus.formato, 'vihconectados/corpus-dorado-la-tar@1');
  assert.match(corpus.estado_revision, /SIN EJECUTOR/);
  const grupos = ['ventana_y_tiempo_desde_ultima', 'puente_oral', 'cambio_de_pauta', 'interrupcion'];
  const ids = grupos.flatMap((g) => corpus[g].map((c) => c.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 20);
  for (const g of grupos) for (const c of corpus[g]) {
    assert.ok(Array.isArray(c.fuente) && c.fuente.length > 0 && c.fuente.every((f) => /Vocabria|Rekambys/.test(f)), `${c.id}: debe citar la ficha técnica`);
    assert.ok(c.esperado && c.descripcion.length > 15, c.id);
  }
  for (const p of corpus.casos_pendientes_de_decision) {
    assert.ok(/^D-\d+$/.test(p.depende_de[0]) && !('esperado' in p), `${p.id}: un caso que depende de una decisión no puede tener esperado`);
  }
});

test('Corpus LA-TAR: ventana de ±7 días, estado y tiempo desde la última inyección coinciden con la aritmética independiente', () => {
  for (const c of corpus.ventana_y_tiempo_desde_ultima) {
    const [ini, fin] = ventana(c.diana), e = c.esperado;
    assert.deepEqual(e.ventana, [ini, fin], `${c.id}: ventana`);
    const estado = dia(c.corte) < dia(ini) ? 'al_dia' : dia(c.corte) <= dia(fin) ? 'en_ventana' : 'retrasada';
    assert.equal(e.estado, estado, `${c.id}: estado`);
    assert.equal(e.dias_desde_diana, dia(c.corte) - dia(c.diana), `${c.id}: días desde la diana`);
    const k = kMeses(c), limite = sumarMeses(c.ultima_inyeccion, k);
    assert.equal(e.fila_tabla, estado === 'retrasada' ? `${dia(c.corte) <= dia(limite) ? '≤' : '>'}${k} meses` : null, `${c.id}: fila de tabla`);
  }
});

test('Corpus LA-TAR: la diana de cada caso es la que fija la ficha técnica a partir de la última inyección', () => {
  for (const c of corpus.ventana_y_tiempo_desde_ultima) {
    const meses = c.regimen === 'mensual' ? 1 : (c.numero_inyeccion === 2 ? 1 : 2);
    assert.equal(c.diana, sumarMeses(c.ultima_inyeccion, meses), `${c.id}: diana = última inyección + ${meses} mes(es)`);
  }
});

test('Corpus LA-TAR: puente oral (primera dosis a 1 o 2 meses ± 7 días; más de 2 meses exige alternativa) y cambios de pauta', () => {
  for (const c of corpus.puente_oral) {
    const previsto = sumarMeses(c.ultima_inyeccion, c.regimen === 'mensual' ? 1 : 2), e = c.esperado;
    const [ini, fin] = ventana(previsto);
    assert.deepEqual(e.ventana_primera_dosis, [ini, fin], `${c.id}: ventana de la primera dosis oral`);
    assert.equal(e.inicio_en_ventana, dia(c.inicio_oral) >= dia(ini) && dia(c.inicio_oral) <= dia(fin), `${c.id}: inicio en ventana`);
    assert.equal(e.excede_2_meses, dia(c.fin_oral) > dia(sumarMeses(c.inicio_oral, 2)), `${c.id}: duración del puente`);
  }
  for (const c of corpus.cambio_de_pauta) {
    const primero = c.desde === 'mensual' ? 1 : 2, luego = c.hasta === 'mensual' ? 1 : 2;
    const proxima = sumarMeses(c.ultima_continuacion, primero);
    assert.equal(c.esperado.proxima_inyeccion, proxima, `${c.id}: próxima inyección`);
    assert.equal(c.esperado.siguiente, sumarMeses(proxima, luego), `${c.id}: siguiente`);
  }
});

test('Corpus LA-TAR: límite para el régimen alternativo tras interrumpir (1 mes en pauta mensual, 2 meses en pauta cada 2 meses)', () => {
  for (const c of corpus.interrupcion) {
    const limite = sumarMeses(c.ultima_inyeccion, c.regimen === 'mensual' ? 1 : 2);
    assert.equal(c.esperado.limite_regimen_alternativo, limite, c.id);
    assert.equal(c.esperado.vencido, dia(c.corte) > dia(limite), c.id);
  }
});
