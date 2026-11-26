import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FUENTES, MAGNITUDES, NIVELES_CONFIANZA, MOTIVOS_CONFIANZA, METODOS_CAPTURA, FUNCIONES, validarAfirmacion } from '../src/esquema-evidencia.js';
import { crearPaciente, vacio, anexar } from '../src/almacen.js';
import { cobertura, importarCSV, REGLAS } from '../src/motor.js';

/**
 * A15 · Modelo de evidencia, procedencia y triangulación (docs/strategy/EVIDENCE_TRIANGULATION_SPEC.md).
 * El esquema de afirmación es ejecutable; la matriz de triangulación es una PROPUESTA sin aprobar y aquí solo se
 * comprueba su coherencia interna, sus invariantes de seguridad y que los ejemplos escritos a mano la cumplen.
 * No existe motor de triangulación (backlog B09): el «oráculo» de este fichero vive solo en la prueba.
 */
const leer = (f) => JSON.parse(readFileSync(new URL('./evidencia/' + f, import.meta.url), 'utf8'));
const matriz = leer('triangulacion.json'), ejemplos = leer('ejemplos-triangulacion.json'), muestras = leer('afirmaciones-ejemplo.json');
const entrada = (a) => { const { id, conocida_en, estado, ...resto } = a; return resto; };
const clon = (o) => structuredClone(o);
const base = () => clon(muestras.afirmaciones[0]);

/* ---------- esquema de afirmación ---------- */
test('Esquema: cada pareja fuente–magnitud tiene al menos un ejemplo válido, en formato almacenado y de entrada', () => {
  const vistas = new Set();
  for (const a of muestras.afirmaciones) {
    assert.doesNotThrow(() => validarAfirmacion(a, { almacenada: true }), a.id);
    assert.doesNotThrow(() => validarAfirmacion(entrada(a)), a.id + ' (entrada)');
    vistas.add(`${a.fuente}/${a.magnitud}`);
  }
  const esperadas = Object.entries(MAGNITUDES).flatMap(([f, ms]) => ms.map((m) => `${f}/${m}`));
  assert.deepEqual([...vistas].sort(), esperadas.sort());
  assert.deepEqual([...FUENTES].sort(), Object.keys(MAGNITUDES).sort());
});

test('Esquema cerrado: campos no previstos, obligatorios ausentes y vocabularios desconocidos se rechazan en todos los niveles', () => {
  const casos = [
    [(a) => { a.extra = 1; }, /no permitido/],
    [(a) => { a.valor.extra = 1; }, /no permitido/],
    [(a) => { a.procedencia.nombre_paciente = 'x'; }, /no permitido/],
    [(a) => { a.procedencia.actor.dni = 'x'; }, /no permitido/],
    [(a) => { a.confianza.extra = 1; }, /no permitido/],
    [(a) => { a.fecha_efectiva.extra = 1; }, /no permitido/],
    [(a) => { delete a.fuente; }, /Falta/],
    [(a) => { delete a.procedencia.sistema_origen; }, /Falta/],
    [(a) => { delete a.confianza.motivos; }, /Falta/],
    [(a) => { delete a.valor.dias; }, /Falta/],
    [(a) => { a.fuente = 'rumor'; }, /fuente/],
    [(a) => { a.magnitud = 'carga_viral'; }, /no corresponde/],
    [(a) => { a.procedencia.metodo_captura = 'telepatia'; }, /metodo_captura/],
    [(a) => { a.procedencia.actor.funcion = 'Paciente VIP'; }, /funcion/],
    [(a) => { a.confianza.nivel = 'segura'; }, /nivel/],
    [(a) => { a.confianza.motivos = ['porque_si']; }, /motivos/],
    [(a) => { a.valor.dias = '30'; }, /dias/],
    [(a) => { a.valor.dias = 0; }, /dias/],
  ];
  for (const [mutar, patron] of casos) { const a = entrada(base()); mutar(a); assert.throws(() => validarAfirmacion(a), patron, String(mutar)); }
});

test('Esquema: fechas reales, intervalo [inicio, fin) coherente y texto libre acotado', () => {
  const con = (f) => { const a = entrada(base()); Object.assign(a.fecha_efectiva, f); return a; };
  assert.throws(() => validarAfirmacion(con({ inicio: '2027-02-30' })), /fecha/i);
  assert.throws(() => validarAfirmacion(con({ inicio: '2027-02-10', fin: '2027-02-10' })), /fin/);
  assert.throws(() => validarAfirmacion(con({ inicio: '2027-02-10', fin: '2027-02-01' })), /fin/);
  assert.doesNotThrow(() => validarAfirmacion(con({ inicio: '2027-02-10', fin: '2027-02-11' })));
  const larga = entrada(base()); larga.procedencia.sistema_origen = 'x'.repeat(200);
  assert.throws(() => validarAfirmacion(larga), /sistema_origen/);
});

test('Confianza: nivel y motivos son coherentes entre sí (una confianza alta no admite datos incompletos, antiguos o sin identidad)', () => {
  const con = (nivel, motivos) => { const a = entrada(base()); a.confianza = { nivel, motivos }; return a; };
  assert.doesNotThrow(() => validarAfirmacion(con('alta', ['fuente_primaria'])));
  for (const m of ['dato_incompleto', 'dato_antiguo', 'sin_identidad_de_origen', 'captura_manual', 'sistema_externo_no_verificado'])
    assert.throws(() => validarAfirmacion(con('alta', ['fuente_primaria', m])), /alta/, m);
  assert.throws(() => validarAfirmacion(con('baja', [])), /motivo/);
  assert.throws(() => validarAfirmacion(con('desconocida', [])), /motivo/);
  assert.doesNotThrow(() => validarAfirmacion(con('baja', ['dato_incompleto'])));
  assert.deepEqual([...NIVELES_CONFIANZA], ['alta', 'media', 'baja', 'desconocida']);
  assert.ok(MOTIVOS_CONFIANZA.length >= 8 && METODOS_CAPTURA.length >= 5 && FUNCIONES.includes('Enfermería'));
});

test('Modo entrada vs almacenado: id y conocida_en los asigna el sistema; una corrección referencia a otra afirmación', () => {
  const a = base();
  assert.throws(() => validarAfirmacion(a), /reservado/);
  assert.throws(() => validarAfirmacion(entrada(a), { almacenada: true }), /Falta/);
  const c = entrada(a); c.corrige = { afirmacion_id: 'af-001', motivo: 'error_de_captura' };
  assert.doesNotThrow(() => validarAfirmacion(c));
  c.corrige = { afirmacion_id: 'af-001' };
  assert.throws(() => validarAfirmacion(c), /Falta/);
  c.corrige = { afirmacion_id: 'af-001', motivo: 'texto libre con datos personales' };
  assert.throws(() => validarAfirmacion(c), /motivo/);
});

/* ---------- matriz de triangulación ---------- */
const POL = (dim, nivel) => matriz.dimensiones[dim].niveles[nivel];
test('Matriz: todas las combinaciones de niveles de cada par se resuelven y el resultado nunca queda sin definir', () => {
  assert.equal(matriz.pares.length, 5);
  for (const par of matriz.pares) {
    const [d1, d2] = par.split('×');
    assert.ok(matriz.dimensiones[d1] && matriz.dimensiones[d2], par);
    for (const n1 of Object.keys(matriz.dimensiones[d1].niveles)) for (const n2 of Object.keys(matriz.dimensiones[d2].niveles)) {
      const r = resolver(par, n1, n2);
      assert.ok(matriz.resultados.includes(r.resultado), `${par} ${n1}/${n2}`);
      assert.ok(matriz.acciones[r.accion], `${par} ${n1}/${n2}: acción`);
      for (const h of r.hipotesis) assert.ok(matriz.hipotesis[h], `hipótesis ${h}`);
    }
  }
});
function resolver(par, n1, n2) {
  const [d1, d2] = par.split('×'), p1 = POL(d1, n1), p2 = POL(d2, n2);
  if (p1 === 'insuficiente' || p2 === 'insuficiente') return matriz.regla_insuficiente;
  if (p1 === 'no_comparable' || p2 === 'no_comparable') return matriz.regla_no_comparable;
  return matriz.celdas[par][`${p1}|${p2}`];
}

test('Matriz: coherencia de cada celda (discordancias con hipótesis y acción, coincidencias desfavorables a revisión, favorables sin acción)', () => {
  for (const [par, celdas] of Object.entries(matriz.celdas)) {
    assert.deepEqual(Object.keys(celdas).sort(), ['desfavorable|desfavorable', 'desfavorable|favorable', 'favorable|desfavorable', 'favorable|favorable'], par);
    for (const [clave, c] of Object.entries(celdas)) {
      const [a, b] = clave.split('|');
      const esperado = a === b ? (a === 'favorable' ? 'coherente_favorable' : 'coherente_desfavorable') : 'discordante';
      assert.equal(c.resultado, esperado, `${par} ${clave}: el resultado sale de la polaridad, no de una opinión`);
      if (c.resultado === 'discordante') { assert.ok(c.hipotesis.length >= 2 && c.accion !== 'ninguna', `${par} ${clave}`); }
      if (c.resultado === 'coherente_favorable') assert.deepEqual([c.accion, c.hipotesis], ['ninguna', []]);
      if (c.resultado === 'coherente_desfavorable') assert.deepEqual([c.accion, c.hipotesis], ['revision_profesional', []]);
      // Si la disponibilidad es la fuente desfavorable frente a otra favorable, primero se verifican los datos.
      if (par.startsWith('DISP×') && clave === 'desfavorable|favorable') assert.equal(c.accion, 'verificar_calidad_de_datos', `${par}`);
    }
  }
});

test('Invariante de seguridad: ningún texto del modelo califica la conducta del paciente, afirma causas ni propone tratamiento', () => {
  const textos = [...Object.values(matriz.hipotesis), ...Object.values(matriz.acciones), ...Object.values(matriz.efectos_suministro), ...matriz.principios,
    ...Object.values(matriz.dimensiones).map((d) => d.nombre), ...matriz.eventos_suministro.map((e) => e.definicion)];
  const prohibidos = [/no adheren/i, /incumpl/i, /mala adherencia/i, /baja adherencia/i, /falta de adherencia/i, /abandon/i, /cumplimiento/i, /negligen/i,
    /debido a/i, /a causa de/i, /causad[oa] por/i, /provoc/i, /demuestra/i, /confirma/i, /\bprueba que\b/i, /\breinici\w*/i, /\bdosis\b/i, /\bprescrib\w*/i, /\b(suspenda|aumente|reduzca|cambie)\b/i];
  for (const t of textos) for (const p of prohibidos) assert.doesNotMatch(t, p, t);
  assert.ok(textos.length > 25);
});

test('Invariante de seguridad: no existe puntuación, índice ni nivel de adherencia compuesto en ningún nivel del modelo', () => {
  const claves = new Set();
  (function recorrer(o) { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { claves.add(k.toLowerCase()); recorrer(v); } })([matriz, ejemplos]);
  for (const k of claves) assert.doesNotMatch(k, /puntuaci|score|indice|índice|riesgo_global|adherencia_global/);
  assert.match(matriz.principios.join(' '), /No se calcula ninguna puntuación/);
});

/* ---------- ejemplos de triangulación escritos a mano ---------- */
const [VINI, VFIN] = ejemplos.contexto_comun.ventana;
const dia = (s) => Date.parse(s + 'T00:00:00Z') / 86400000;
const construir = (e) => {
  const lista = [];
  const comun = { procedencia: { sistema_origen: 'SINTETICO', metodo_captura: 'manual', actor: { funcion: 'Sistema' } }, confianza: { nivel: 'media', motivos: ['captura_manual'] } };
  if (e.auto) lista.push({ ...clon(comun), fuente: 'autoinforme', magnitud: 'dificultad_referida', valor: { dominio: 'dificultad', resultado: e.auto }, fecha_efectiva: { inicio: '2027-03-01', fin: null } });
  if (e.vir) lista.push({ ...clon(comun), fuente: 'analitica', magnitud: 'carga_viral', valor: { copias_ml: e.vir.copias }, fecha_efectiva: { inicio: e.vir.fecha, fin: null } });
  if (e.asis) lista.push({ ...clon(comun), fuente: 'cita', magnitud: 'asistencia', valor: { resultado: e.asis }, fecha_efectiva: { inicio: '2027-02-15', fin: null } });
  return lista;
};
function niveles(e, afirmaciones) {
  const { umbral_pdc, umbral_carga_viral_copias_ml: umbralCV } = ejemplos.contexto_comun;
  const disp = !e.pdc || e.pdc[1] === 0 ? 'no_evaluable' : e.pdc[0] / e.pdc[1] >= umbral_pdc ? 'alta' : 'baja';
  const auto = afirmaciones.filter((a) => a.magnitud === 'dificultad_referida').map((a) => a.valor.resultado);
  const nAuto = auto.includes('si') ? 'con_dificultades' : auto.includes('no') ? 'sin_dificultades' : 'no_explorado';
  const v = afirmaciones.find((a) => a.magnitud === 'carga_viral');
  const nVir = !v ? 'ausente' : !(dia(v.fecha_efectiva.inicio) >= dia(VINI) && dia(v.fecha_efectiva.inicio) < dia(VFIN)) ? 'no_comparable' : v.valor.copias_ml < umbralCV ? 'suprimida' : 'no_suprimida';
  const c = afirmaciones.filter((a) => a.magnitud === 'asistencia').map((a) => a.valor.resultado);
  const nAsis = !c.length ? 'ausente' : c.includes('no_asistida') ? 'no_asistida' : 'asistida';
  return { DISP: disp, AUTO: nAuto, VIR: nVir, ASIS: nAsis };
}

test('Ejemplos: las afirmaciones construidas son válidas y cada resultado esperado a mano coincide con la matriz', () => {
  assert.equal(ejemplos.triangulacion.length, 27);
  for (const e of ejemplos.triangulacion) {
    const afirmaciones = construir(e);
    for (const a of afirmaciones) assert.doesNotThrow(() => validarAfirmacion(a), e.id);
    const [d1, d2] = e.par.split('×'), n = niveles(e, afirmaciones);
    assert.deepEqual([n[d1], n[d2]], e.esperado.niveles, `${e.id}: niveles`);
    const r = resolver(e.par, n[d1], n[d2]);
    assert.deepEqual({ resultado: r.resultado, accion: r.accion, hipotesis: r.hipotesis }, { resultado: e.esperado.resultado, accion: e.esperado.accion, hipotesis: e.esperado.hipotesis }, `${e.id}: ${e.par}`);
  }
});

test('Ejemplos: cubren las cuatro combinaciones evaluables de cada par, el caso con datos insuficientes y la analítica no comparable', () => {
  for (const par of matriz.pares) {
    const del = ejemplos.triangulacion.filter((e) => e.par === par), [d1, d2] = par.split('×');
    const combos = new Set(del.filter((e) => ['coherente_favorable', 'coherente_desfavorable', 'discordante'].includes(e.esperado.resultado)).map((e) => `${POL(d1, e.esperado.niveles[0])}|${POL(d2, e.esperado.niveles[1])}`));
    assert.equal(combos.size, 4, `${par}: faltan combinaciones evaluables`);
    assert.ok(del.some((e) => e.esperado.resultado === 'insuficiente'), `${par}: sin ejemplo insuficiente`);
  }
  const noComparable = ejemplos.triangulacion.filter((e) => e.esperado.resultado === 'no_comparable').map((e) => e.par).sort();
  assert.deepEqual(noComparable, ['AUTO×VIR', 'DISP×VIR']);
  const ids = ejemplos.triangulacion.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
});

/* ---------- eventos que alteran la necesidad de suministro ---------- */
test('Eventos de suministro: cada magnitud del modelo tiene definición, efecto del vocabulario y su afirmación de ejemplo', () => {
  const de = Object.fromEntries(matriz.eventos_suministro.map((e) => [`${e.fuente}/${e.magnitud}`, e]));
  assert.equal(Object.keys(de).length, matriz.eventos_suministro.length);
  for (const ev of matriz.eventos_suministro) {
    assert.ok(matriz.efectos_suministro[ev.efecto], ev.magnitud);
    assert.ok(MAGNITUDES[ev.fuente].includes(ev.magnitud), ev.magnitud);
    assert.ok(muestras.afirmaciones.some((a) => a.fuente === ev.fuente && a.magnitud === ev.magnitud), `sin ejemplo: ${ev.magnitud}`);
  }
  const contexto = MAGNITUDES.contexto_clinico;
  for (const m of contexto) assert.ok(matriz.eventos_suministro.some((e) => e.magnitud === m && e.fuente === 'contexto_clinico'), `el contexto ${m} no tiene definición de efecto`);
  assert.ok(matriz.eventos_suministro.some((e) => e.fuente === 'dispensacion_externa'));
  assert.deepEqual(matriz.eventos_suministro.filter((e) => e.con_ejemplo_numerico).map((e) => e.magnitud).sort(),
    [...new Set(ejemplos.eventos_suministro.map((e) => e.magnitud))].sort());
});

function pdcEngine(e, dispensaciones, ventana) {
  let d = anexar(crearPaciente(vacio()), 'DEMO-001', { tipo: 'tratamiento', fecha: e.episodio.fecha, tar: e.episodio.tar });
  const ep = d.pacientes[0].eventos.at(-1).id;
  const csv = 'fecha;episodio;componente;dias\n' + dispensaciones.map((x) => `${x.fecha};${ep};${x.componente};${x.dias}`).join('\n');
  d = anexar(d, 'DEMO-001', { tipo: 'importacion', fuente: 'Ejemplo A15', ...importarCSV(d.pacientes[0], csv) });
  const c = cobertura(d.pacientes[0], e.corte, { ...REGLAS, ventana });
  return [c.cubiertos, c.total];
}
/** Semántica PROPUESTA (no implementada en el motor): días excluidos fuera del numerador y del denominador. */
function pdcConExclusion(e) {
  const fin = dia(e.corte), ini = Math.max(fin - e.ventana, dia(e.episodio.fecha));
  const cubierto = new Set();
  let stock = 0;
  const entregas = e.dispensaciones.map((x) => ({ t: dia(x.fecha), n: x.dias }));
  for (let t = Math.min(...entregas.map((x) => x.t)); t < fin; t++) {
    stock += entregas.filter((x) => x.t === t).reduce((s, x) => s + x.n, 0);
    if (stock > 0) { cubierto.add(t); stock--; }
  }
  let total = 0, cub = 0;
  for (let t = ini; t < fin; t++) { if (t >= dia(e.intervalo[0]) && t < dia(e.intervalo[1])) continue; total++; if (cubierto.has(t)) cub++; }
  return [cub, total];
}

test('Eventos de suministro: el PDC sin el evento es el del motor actual; con el evento coincide con el cálculo propuesto', () => {
  assert.equal(ejemplos.eventos_suministro.length, 5);
  for (const e of ejemplos.eventos_suministro) {
    assert.deepEqual(pdcEngine(e, e.dispensaciones, e.ventana), e.esperado.sin_evento, `${e.id}: sin evento (motor real)`);
    if (e.efecto === 'excluye_del_denominador' || e.efecto === 'cierra_episodio')
      assert.deepEqual(pdcConExclusion(e), e.esperado.con_evento, `${e.id}: con evento (semántica propuesta)`);
    else if (e.efecto === 'aporta_cobertura')
      assert.deepEqual(pdcEngine(e, [...e.dispensaciones, e.evento_como_dispensacion], e.ventana), e.esperado.con_evento, `${e.id}: con evento como dispensación (motor real)`);
    else assert.fail(`${e.id}: efecto sin ejemplo definido`);
  }
});

test('Eventos de suministro: un evento nunca convierte por sí mismo una discordancia en coherencia; solo cambia la evaluabilidad o la cobertura', () => {
  for (const ev of matriz.eventos_suministro) assert.ok(Object.keys(matriz.efectos_suministro).includes(ev.efecto));
  const efectos = new Set(matriz.eventos_suministro.map((e) => e.efecto));
  assert.deepEqual([...efectos].sort(), ['aporta_cobertura', 'cierra_episodio', 'excluye_del_denominador', 'marca_incertidumbre']);
  // Ningún efecto del vocabulario es «adherente» o «cumplidor»: describen días evaluables o suministro.
  for (const [k, t] of Object.entries(matriz.efectos_suministro)) assert.match(t, /d[ií]as|dispensaci[oó]n|seguimiento|c[aá]lculo|periodo/i, k);
});

test('Esquema: ingreso, suspensión y solapamiento son intervalos [inicio, fin); el resto de eventos de contexto puede ser puntual', () => {
  const de = (magnitud) => entrada(muestras.afirmaciones.find((a) => a.magnitud === magnitud));
  for (const m of ['ingreso_hospitalario', 'suspension_prescrita', 'transicion_con_solapamiento']) {
    const a = de(m); assert.doesNotThrow(() => validarAfirmacion(a), m);
    a.fecha_efectiva.fin = null;
    assert.throws(() => validarAfirmacion(a), /requiere un intervalo/, m);
  }
  for (const m of ['stock_inicial', 'fin_de_seguimiento', 'suministro_viaje', 'perdida_o_sustitucion']) {
    const a = de(m); assert.equal(a.fecha_efectiva.fin, null, m); assert.doesNotThrow(() => validarAfirmacion(a), m);
  }
});
