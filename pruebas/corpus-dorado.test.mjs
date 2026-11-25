import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearPaciente, vacio, anexar } from '../src/almacen.js';
import { cobertura, alertas, episodios, importarCSV, REGLAS } from '../src/motor.js';
import { normalizarFicha, modalidadTar } from '../src/cima.js';
import { fichaPrueba } from './fixtures-cima.js';

/**
 * A04 · Corpus dorado de PDC. Los resultados esperados están en pruebas/corpus-dorado/pdc.json,
 * deducidos a mano de la definición operativa. Aquí solo se ejecutan:
 *  1) el motor real sobre el flujo completo de comandos (anexar, importarCSV, correcciones);
 *  2) un oráculo secundario automático con OTRO algoritmo (simulación de stock día a día);
 *  3) variantes ingenuas deliberadamente erróneas, para demostrar que el corpus discrimina.
 * El oráculo secundario lo escribió la misma persona que auditó el motor: NO sustituye la revisión
 * independiente por un segundo profesional (véase pruebas/corpus-dorado/README.md).
 */
const corpus = JSON.parse(readFileSync(new URL('./corpus-dorado/pdc.json', import.meta.url), 'utf8'));
const FAMILIAS = ['aritmetica_basica', 'multicomponente', 'cambio_tar', 'ventana', 'datos_sucios', 'calendario', 'casos_vacios'];
const CAT = { TAR_A: ['A'], TAR_B: ['B'], TAR_CD: ['C', 'D'] };
const ID = 'DEMO-001';

const medicamento = (id) => {
  const { presentaciones, ...m } = normalizarFicha({
    ...fichaPrueba, nregistro: id, nombre: 'TAR SINTÉTICO ' + id,
    viasAdministracion: [{ nombre: 'VÍA INTRAMUSCULAR' }],
  });
  return { ...m, cn: id, presentacion: presentaciones[0].nombre };
};

function construir(caso) {
  let db = crearPaciente(vacio());
  const importaciones = [];
  const paciente = () => db.pacientes[0];
  const ep = (i) => episodios(paciente())[i].id;
  for (const paso of caso.pasos) {
    if (paso.tipo === 'tratamiento') {
      db = anexar(db, ID, { tipo: 'tratamiento', fecha: paso.fecha, tar: paso.tar });
    } else if (paso.tipo === 'tratamiento_inyectable') {
      const ms = [medicamento('999993'), medicamento('999994')];
      db = anexar(db, ID, { tipo: 'tratamiento', fecha: paso.fecha, tar: 'CIMA', medicamentos: ms, modalidad: modalidadTar(ms), confirmado: true });
    } else if (paso.tipo === 'importacion') {
      const csv = 'fecha;episodio;componente;dias\n' + paso.filas.map(f => `${f.fecha};${ep(f.ep)};${f.componente};${f.dias}`).join('\n');
      db = anexar(db, ID, { tipo: 'importacion', fuente: 'Corpus dorado', ...importarCSV(paciente(), csv) });
      importaciones.push(paciente().eventos.at(-1).id);
    } else if (paso.tipo === 'correccion') {
      const s = paso.sustitucion;
      db = anexar(db, ID, {
        tipo: 'correccion_dispensacion', referencia: `${importaciones[paso.importacion]}:${paso.fila}`, motivo: paso.motivo,
        sustitucion: s ? { fecha: s.fecha, episodio: ep(s.ep), componente: s.componente, dias: s.dias } : null,
        coincidencia_confirmada: false,
      });
    } else throw Error('Paso desconocido: ' + paso.tipo);
  }
  return paciente();
}

const dia = (s) => Date.parse(s + 'T00:00:00Z') / 86400000;

/** Oráculo secundario: stock día a día por componente. Opciones para variantes erróneas. */
function oraculo(caso, { arrastre = true, interseccion = true, inclusivo = false } = {}) {
  const eps = caso.pasos.filter(p => p.tipo.startsWith('tratamiento'))
    .map(p => ({ inicio: dia(p.fecha), inyectable: p.tipo === 'tratamiento_inyectable', comps: p.tar ? CAT[p.tar] : [] }));
  const fin = dia(caso.corte) + (inclusivo ? 1 : 0);
  const ini = eps.length ? Math.max(fin - caso.ventana, eps[0].inicio) : fin;
  let cubiertos = 0, total = 0;
  const excluidos = [];
  eps.forEach((e, i) => {
    const a = Math.max(ini, e.inicio), b = Math.min(fin, i + 1 < eps.length ? eps[i + 1].inicio : fin);
    if (b <= a) return;
    if (e.inyectable) { excluidos.push(b - a); return; }
    const porComponente = e.comps.map((c) => {
      const entregas = caso.efectivas.filter(d => d.ep === i && d.componente === c && dia(d.fecha) < fin).map(d => ({ t: dia(d.fecha), n: d.dias }));
      const cubierto = new Set();
      if (!entregas.length) return cubierto;
      if (arrastre) {
        let stock = 0;
        for (let t = Math.min(...entregas.map(x => x.t)); t < b; t++) {
          stock += entregas.filter(x => x.t === t).reduce((s, x) => s + x.n, 0);
          if (stock > 0) { cubierto.add(t); stock--; }
        }
      } else {
        for (const x of entregas) for (let t = x.t; t < x.t + x.n && t < b; t++) cubierto.add(t);
      }
      return cubierto;
    });
    for (let t = a; t < b; t++) {
      total++;
      const ok = interseccion ? porComponente.every(s => s.has(t)) : porComponente.some(s => s.has(t));
      if (ok) cubiertos++;
    }
  });
  return { cubiertos, total, excluidos };
}

test('Corpus: estructura, identificadores únicos y familias del plan maestro cubiertas', () => {
  assert.equal(corpus.formato, 'vihconectados/corpus-dorado-pdc@1');
  const ids = corpus.casos.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const f of FAMILIAS) assert.ok(corpus.casos.some(c => c.familia === f), 'Falta la familia ' + f);
  assert.ok(corpus.familias_pendientes.some(x => /LA-TAR/.test(x)), 'LA-TAR debe constar como pendiente');
  for (const c of corpus.casos) {
    assert.ok(c.razonamiento && c.razonamiento.length > 20, c.id + ': falta razonamiento');
    assert.ok(Number.isInteger(c.esperado.cubiertos) && Number.isInteger(c.esperado.total) && Array.isArray(c.esperado.excluidos), c.id);
    assert.ok(Array.isArray(c.senales), c.id);
  }
});

for (const caso of corpus.casos) {
  test(`Corpus ${caso.id} · ${caso.descripcion}`, () => {
    const p = construir(caso), cfg = { ...REGLAS, ventana: caso.ventana }, e = caso.esperado;
    const c = cobertura(p, caso.corte, cfg);
    assert.deepEqual({ cubiertos: c.cubiertos, total: c.total }, { cubiertos: e.cubiertos, total: e.total }, 'motor');
    assert.equal(c.pdc, e.total ? e.cubiertos / e.total : null, 'PDC (null solo sin días evaluables)');
    assert.deepEqual(c.excluidos.map(x => x.total), e.excluidos, 'periodos excluidos');
    assert.deepEqual(alertas(p, caso.corte, cfg).map(a => a.regla), caso.senales, 'señales');
    assert.deepEqual(oraculo(caso), e, 'oráculo secundario (algoritmo distinto)');
  });
}

test('El corpus discrimina: tres implementaciones ingenuas fallan en al menos un caso cada una', () => {
  const variantes = { 'sin arrastre de sobrante': { arrastre: false }, 'suma en vez de intersección': { interseccion: false }, 'corte inclusivo': { inclusivo: true } };
  for (const [nombre, opciones] of Object.entries(variantes)) {
    const fallos = corpus.casos.filter(c => JSON.stringify(oraculo(c, opciones)) !== JSON.stringify(c.esperado)).map(c => c.id);
    assert.ok(fallos.length > 0, `La variante «${nombre}» no es detectada por ningún caso`);
  }
});
