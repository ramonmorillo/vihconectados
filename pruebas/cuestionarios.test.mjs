import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TIPOS_ITEM, OPERADORES, CANALES, MOTIVOS_ESCALADO, ESTADOS_CUESTIONARIO,
  validarCuestionario, validarProtocolos, esActivable, evaluarCondicion, siguienteItem,
} from '../src/esquema-cuestionario.js';
import { validarAfirmacion } from '../src/esquema-evidencia.js';

/**
 * A14 · Cuestionarios declarativos y reglas de escalado (docs/strategy/QUESTIONNAIRE_SPEC.md).
 * El esquema y la semántica de las condiciones son ejecutables; los cuestionarios y los protocolos son EJEMPLOS y
 * PROPUESTAS sin aprobar. El recorrido de caminos de este fichero es un oráculo de prueba: el motor de ejecución no
 * existe (backlog B12). Los valores de protocolo de las pruebas de activación son datos sintéticos de prueba, no propuestas.
 */
const leer = (f) => JSON.parse(readFileSync(new URL('./cuestionarios/' + f, import.meta.url), 'utf8'));
const ejemplos = leer('ejemplos.json').cuestionarios, protocolos = leer('protocolos.json');
const clon = (o) => structuredClone(o);
const base = () => clon(ejemplos[0]);

/* ---------- esquema ---------- */
test('Los tres cuestionarios de ejemplo y el registro de protocolos son válidos', () => {
  assert.equal(ejemplos.length, 3);
  assert.doesNotThrow(() => validarProtocolos(protocolos));
  for (const q of ejemplos) assert.doesNotThrow(() => validarCuestionario(q, protocolos), q.id);
  assert.deepEqual([...TIPOS_ITEM], ['si_no', 'opcion_unica', 'opcion_multiple']);
  assert.ok(OPERADORES.length === 6 && CANALES.length === 4 && ESTADOS_CUESTIONARIO.length === 3 && MOTIVOS_ESCALADO.length >= 6);
});

test('Esquema cerrado en todos los niveles: campos no previstos, obligatorios ausentes, tipos y vocabularios desconocidos se rechazan', () => {
  const casos = [
    [(q) => { q.extra = 1; }, /no permitido/], [(q) => { q.items[0].extra = 1; }, /no permitido/],
    [(q) => { q.items[1].opciones[0].extra = 1; }, /no permitido/], [(q) => { q.items[0].siguiente[0].extra = 1; }, /no permitido/],
    [(q) => { q.items[0].siguiente[0].cuando.extra = 1; }, /no permitido/], [(q) => { q.escalado[0].extra = 1; }, /no permitido/],
    [(q) => { q.items[0].registro.extra = 1; }, /no permitido/], [(q) => { q.instrumento.extra = 1; }, /no permitido/],
    [(q) => { q.items[0].tipo = 'texto_libre'; }, /tipo/], [(q) => { delete q.titulo; }, /Falta titulo/], [(q) => { delete q.items; }, /Falta items/],
    [(q) => { delete q.inicio; }, /Falta inicio/], [(q) => { delete q.items[0].por_defecto; }, /Falta por_defecto/],
    [(q) => { q.items[0].id = 'Mal Id'; }, /id/], [(q) => { q.items[0].texto = 'Hola <b>'; }, /texto/], [(q) => { q.items[0].texto = 'x'.repeat(300); }, /texto/],
    [(q) => { q.estado = 'publicado'; }, /estado/], [(q) => { q.canales = ['telegrama']; }, /canales/], [(q) => { q.escalado[0].motivo = 'inventado'; }, /motivo/],
    [(q) => { q.version = '1'; }, /version/], [(q) => { q.formato = 'otro'; }, /formato/],
  ];
  for (const [mutar, patron] of casos) { const q = base(); mutar(q); assert.throws(() => validarCuestionario(q, protocolos), patron, String(mutar)); }
});

test('Grafo estático: solo hacia delante (sin ciclos), sin saltos a elementos inexistentes ni inalcanzables, condiciones sobre respuestas ya dadas', () => {
  const huerfano = { id: 'huerfano', tipo: 'si_no', texto: '¿Prueba?', obligatorio: true, registro: { tipo: 'respuesta' }, siguiente: [], por_defecto: 'FIN' };
  const hoja = { item: 'dificultad_toma', op: 'es', valor: 'si' };
  const casos = [
    [(q) => { q.items[2].por_defecto = 'dificultad_toma'; }, /posterior/],
    [(q) => { q.items[0].siguiente[0].ir_a = 'no_existe'; }, /no existe/],
    [(q) => { q.items.splice(4, 0, huerfano); }, /inalcanzable/],
    [(q) => { q.items[1].id = 'dificultad_toma'; }, /duplicad/],
    [(q) => { q.items[0].siguiente[0].cuando = { item: 'efectos', op: 'es', valor: 'si' }; }, /aún no se ha dado/],
    [(q) => { q.items[0].siguiente[0].cuando.valor = 'quizas'; }, /valor/],
    [(q) => { q.items[0].siguiente[0].cuando.op = 'incluye'; }, /incluye/],
    [(q) => { q.items[1].siguiente = [{ cuando: { item: 'tipo_dificultad', op: 'es', valor: 'olvidos' }, ir_a: 'efectos' }]; }, /es solo/],
    [(q) => { q.inicio = 'efectos'; }, /inicio/],
    [(q) => { q.items[0].siguiente[0].cuando = { todas: [{ alguna: [{ todas: [hoja] }] }] }; }, /profundidad/],
    [(q) => { q.escalado[0].protocolo = 'PR-NO-EXISTE'; }, /protocolo/],
    [(q) => { q.aviso_inicial = 'AVISO-X'; }, /aviso/],
    [(q) => { q.mensaje_cierre = 'CIERRE-X'; }, /aviso/],
    [(q) => { q.items[0].registro.positivas = ['quiza']; }, /positivas/],
    [(q) => { q.items[1].opciones[1].codigo = 'olvidos'; }, /duplicad/],
    [(q) => { q.escalado[0].cuando.item = 'nada'; }, /no existe/],
  ];
  for (const [mutar, patron] of casos) { const q = base(); mutar(q); assert.throws(() => validarCuestionario(q, protocolos), patron, String(mutar)); }
});

/* ---------- semántica de las condiciones ---------- */
test('Condiciones: operadores sobre respuestas únicas y múltiples; lo no respondido nunca cumple «es» ni «no es»', () => {
  const r = { a: 'si', b: ['x', 'y'], c: [] };
  const t = (cond) => evaluarCondicion(cond, r);
  assert.deepEqual([t({ item: 'a', op: 'es', valor: 'si' }), t({ item: 'a', op: 'es', valor: 'no' }), t({ item: 'a', op: 'no_es', valor: 'no' }), t({ item: 'a', op: 'no_es', valor: 'si' })], [true, false, true, false]);
  assert.deepEqual([t({ item: 'b', op: 'incluye', valor: 'x' }), t({ item: 'b', op: 'incluye', valor: 'z' }), t({ item: 'b', op: 'no_incluye', valor: 'z' }), t({ item: 'b', op: 'no_incluye', valor: 'x' })], [true, false, true, false]);
  assert.deepEqual([t({ item: 'zz', op: 'es', valor: 'si' }), t({ item: 'zz', op: 'no_es', valor: 'si' }), t({ item: 'zz', op: 'incluye', valor: 'x' }), t({ item: 'zz', op: 'no_incluye', valor: 'x' })], [false, false, false, false]);
  assert.deepEqual([t({ item: 'a', op: 'respondido' }), t({ item: 'zz', op: 'respondido' }), t({ item: 'c', op: 'respondido' }), t({ item: 'zz', op: 'no_respondido' }), t({ item: 'c', op: 'no_respondido' })], [true, false, false, true, true]);
  assert.equal(t({ todas: [{ item: 'a', op: 'es', valor: 'si' }, { item: 'b', op: 'incluye', valor: 'x' }] }), true);
  assert.equal(t({ todas: [{ item: 'a', op: 'es', valor: 'si' }, { item: 'b', op: 'incluye', valor: 'z' }] }), false);
  assert.equal(t({ alguna: [{ item: 'a', op: 'es', valor: 'no' }, { item: 'b', op: 'incluye', valor: 'y' }] }), true);
  assert.equal(t({ alguna: [{ item: 'a', op: 'es', valor: 'no' }] }), false);
});

/* ---------- ramificación determinista y terminación ---------- */
const respuestasPosibles = (it) => it.tipo === 'si_no' ? ['si', 'no']
  : it.tipo === 'opcion_unica' ? it.opciones.map((o) => o.codigo)
    : [...it.opciones.map((o) => [o.codigo]), it.opciones.map((o) => o.codigo)]; // sin dejar casillas vacías
function caminos(q) {
  const items = Object.fromEntries(q.items.map((i) => [i.id, i])), salida = [];
  (function recorrer(id, respuestas, pasos) {
    if (id === 'FIN') { salida.push({ respuestas, pasos }); return; }
    assert.ok(pasos.length < q.items.length, `${q.id}: el recorrido no termina`);
    assert.ok(!pasos.includes(id), `${q.id}: ${id} se repite`);
    for (const r of respuestasPosibles(items[id])) {
      const nuevas = { ...respuestas, [id]: r };
      recorrer(siguienteItem(q, items[id], nuevas), nuevas, [...pasos, id]);
    }
  })(q.inicio, {}, []);
  return salida;
}
const dispara = (q, respuestas) => q.escalado.filter((e) => evaluarCondicion(e.cuando, respuestas)).map((e) => e.id);

test('Ramificación determinista: todos los caminos terminan, no repiten preguntas y dan el mismo resultado cada vez', () => {
  for (const q of ejemplos) {
    const a = caminos(q), b = caminos(q);
    assert.equal(JSON.stringify(a), JSON.stringify(b), `${q.id}: no determinista`);
    assert.ok(a.length > 2, `${q.id}: debe ramificar`);
    assert.ok(new Set(a.map((c) => c.pasos.join('>'))).size >= 2, `${q.id}: debe haber al menos dos itinerarios distintos (si no, no ramifica)`);
    const visitados = new Set(a.flatMap((c) => c.pasos));
    assert.deepEqual([...visitados].sort(), q.items.map((i) => i.id).sort(), `${q.id}: hay preguntas a las que no se llega`);
    for (const c of a) { // el orden de las claves de las respuestas no influye
      const invertidas = Object.fromEntries(Object.entries(c.respuestas).reverse());
      assert.deepEqual(dispara(q, invertidas), dispara(q, c.respuestas));
    }
  }
});

test('Escalado: cada regla se dispara en algún camino y no en todos; solo crea trabajo para un protocolo', () => {
  for (const q of ejemplos) {
    const todos = caminos(q);
    for (const e of q.escalado) {
      const n = todos.filter((c) => dispara(q, c.respuestas).includes(e.id)).length;
      assert.ok(n > 0, `${q.id}/${e.id}: nunca se dispara`);
      assert.ok(n < todos.length, `${q.id}/${e.id}: se dispara siempre`);
      assert.ok(protocolos.protocolos.some((p) => p.id === e.protocolo), `${q.id}/${e.id}: protocolo sin definir`);
    }
    assert.ok(q.escalado.some((e) => e.motivo === 'solicita_contacto'), `${q.id}: el paciente debe poder pedir que le contacten`);
  }
});

/* ---------- sin texto libre, sin puntuación, sin consejo clínico, sin instrumentos con licencia ---------- */
const textos = (q) => [q.titulo, q.proposito, q.poblacion, ...q.items.flatMap((i) => [i.texto, ...(i.opciones || []).map((o) => o.texto)])];
test('Sin texto libre ni puntuaciones: solo respuestas cerradas y ninguna clave de puntuación', () => {
  const claves = new Set();
  (function ver(o) { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { claves.add(k.toLowerCase()); ver(v); } })(ejemplos);
  for (const k of claves) assert.doesNotMatch(k, /puntuaci|score|indice|índice|nivel_global|adherencia_global/);
  for (const q of ejemplos) for (const i of q.items) assert.ok(TIPOS_ITEM.includes(i.tipo), `${q.id}/${i.id}`);
  assert.equal(TIPOS_ITEM.some((t) => /libre|texto|abierta/.test(t)), false);
});

test('Los textos para el paciente no dan consejo clínico, no juzgan la conducta y no incluyen HTML ni enlaces', () => {
  const prohibidos = [/\bdosis\b/i, /\btome\b|\btomen\b/i, /deje de/i, /suspend/i, /aument/i, /reduz?ca/i, /no adheren/i, /incumpl/i, /cumplimiento/i, /abandon/i, /mala adherencia/i, /[<>]/, /https?:|www\./i, /\bdebe\b/i];
  for (const q of ejemplos) for (const t of textos(q)) for (const p of prohibidos) assert.doesNotMatch(t, p, t);
  for (const a of protocolos.avisos) for (const p of prohibidos) assert.doesNotMatch(a.texto, p, a.texto);
});

test('Instrumentos: los ejemplos son de diseño propio; uno con licencia exige titular y autorización; ningún texto nombra escalas conocidas', () => {
  for (const q of ejemplos) assert.equal(q.instrumento.origen, 'propio');
  const conocidas = /\b(SMAQ|PAM|ACTG|HIVTSQ|EQ-?5D|PHQ-?\d*|GAD-?\d*|WHOQOL|MOS-?HIV|SF-?36|CASE|VAS|MARS|BMQ|MMAS)\b/i;
  for (const q of ejemplos) for (const t of [...textos(q), q.id]) assert.doesNotMatch(t, conocidas, t);
  const con = (instrumento) => { const q = base(); q.instrumento = instrumento; return q; };
  assert.throws(() => validarCuestionario(con({ origen: 'licenciado', titular: 'Titular', autorizacion: null }), protocolos), /licencia/);
  assert.throws(() => validarCuestionario(con({ origen: 'licenciado' }), protocolos), /licencia/);
  assert.throws(() => validarCuestionario(con({ origen: 'licenciado', autorizacion: 'REF-1' }), protocolos), /licencia/);
  assert.doesNotThrow(() => validarCuestionario(con({ origen: 'licenciado', titular: 'Titular', autorizacion: 'REF-1' }), protocolos));
  assert.throws(() => validarCuestionario(con({ origen: 'inventado' }), protocolos), /origen/);
});

/* ---------- protocolos y activación ---------- */
const aprobar = (reg) => {
  const r = clon(reg);
  for (const p of r.protocolos) Object.assign(p, { responsable_funcion: 'Farmacia Hospitalaria', plazo: { valor: 2, unidad: 'dias_habiles' }, prioridad: 'media', aprobado: true, aprobacion: { comite: 'CCR', acta: 'ACTA-1', fecha: '2027-02-01' } });
  for (const a of r.avisos) a.aprobado = true;
  return r;
};
test('Protocolos: hoy todos están pendientes (sin responsable, plazo ni prioridad) y no se puede aprobar uno incompleto', () => {
  for (const p of protocolos.protocolos) assert.deepEqual([p.responsable_funcion, p.plazo, p.prioridad, p.aprobado], [null, null, null, false], p.id);
  for (const a of protocolos.avisos) assert.equal(a.aprobado, false);
  assert.match(protocolos.estado_revision, /DATO PENDIENTE/);
  const sin = (campo, valor) => { const r = aprobar(protocolos); r.protocolos[0][campo] = valor; return r; };
  assert.doesNotThrow(() => validarProtocolos(aprobar(protocolos)));
  assert.throws(() => validarProtocolos(sin('plazo', null)), /plazo/);
  assert.throws(() => validarProtocolos(sin('responsable_funcion', null)), /responsable/);
  assert.throws(() => validarProtocolos(sin('prioridad', null)), /prioridad/);
  assert.throws(() => validarProtocolos(sin('responsable_funcion', 'Cualquiera')), /responsable/);
  assert.throws(() => validarProtocolos(sin('plazo', { valor: 0, unidad: 'dias_habiles' })), /plazo/);
  assert.throws(() => validarProtocolos(sin('plazo', { valor: 2, unidad: 'meses' })), /plazo/);
  assert.throws(() => validarProtocolos(sin('aprobacion', { comite: null, acta: null, fecha: null })), /aprobación/);
});

test('Activación: ningún ejemplo es activable hoy; solo lo es uno aprobado cuyos protocolos y avisos también lo estén', () => {
  for (const q of ejemplos) {
    const r = esActivable(q, protocolos);
    assert.equal(r.activable, false);
    assert.ok(r.motivos.some((m) => /estado/.test(m)) && r.motivos.some((m) => /PR-/.test(m)) && r.motivos.some((m) => /AVISO-NO-URGENTE/.test(m)), q.id + ': ' + r.motivos.join(' | '));
  }
  const aprobado = (q) => Object.assign(q, { estado: 'aprobado', aprobacion: { comite: 'CCR', revisor_independiente: 'Revisor', fecha: '2027-02-01', acta: 'ACTA-2' } });
  const reg = aprobar(protocolos), q = aprobado(base());
  assert.deepEqual(esActivable(q, reg), { activable: true, motivos: [] });
  assert.equal(esActivable(q, protocolos).activable, false, 'aprobado, pero con protocolos pendientes');
  const parcial = aprobar(protocolos); parcial.protocolos.find((p) => p.id === 'PR-ACCESO').aprobado = false;
  assert.match(esActivable(q, parcial).motivos.join(' '), /PR-ACCESO/);
  const sinAviso = aprobar(protocolos); sinAviso.avisos[0].aprobado = false;
  assert.equal(esActivable(q, sinAviso).activable, false);
  const sinActa = base(); sinActa.estado = 'aprobado'; sinActa.aprobacion = null;
  assert.throws(() => validarCuestionario(sinActa, reg), /aprobación/);
});

/* ---------- integración con el modelo de evidencia (A15) ---------- */
test('Las respuestas se convierten en afirmaciones válidas del modelo de evidencia, sin inferir nada más', () => {
  let n = 0;
  for (const q of ejemplos) for (const it of q.items.filter((i) => i.registro.tipo === 'afirmacion')) {
    for (const r of respuestasPosibles(it)) {
      const codigos = Array.isArray(r) ? r : [r], positiva = codigos.some((c) => it.registro.positivas.includes(c));
      const a = {
        fuente: it.registro.fuente, magnitud: it.registro.magnitud, valor: { dominio: it.registro.dominio, resultado: positiva ? 'si' : 'no' },
        fecha_efectiva: { inicio: '2027-03-01', fin: null },
        procedencia: { sistema_origen: 'vihconectados', metodo_captura: 'cuestionario', actor: { funcion: 'Paciente' } },
        confianza: { nivel: 'media', motivos: ['autoinforme'] },
      };
      assert.doesNotThrow(() => validarAfirmacion(a), `${q.id}/${it.id}`);
      n++;
    }
  }
  assert.ok(n >= 8);
});
