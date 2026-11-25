/**
 * Esquema de cuestionario declarativo y reglas de escalado (actuación A14; docs/strategy/QUESTIONNAIRE_SPEC.md).
 *
 * Un cuestionario es DATO, no código: preguntas cerradas, ramificación mediante condiciones de un lenguaje cerrado y
 * reglas de escalado que apuntan a un protocolo. No hay IA, ni expresiones, ni scripts, ni texto libre del paciente,
 * ni puntuaciones. La ramificación solo puede avanzar (sin ciclos): cada recorrido termina y es determinista.
 *
 * NO es un motor: no envía, no programa ni guarda nada (backlog B12). Módulo de DOMINIO, puro y sin dependencias.
 */
const O = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const ID = /^[a-z][a-z0-9_]{0,39}$/;
const CODIGO = /^[a-z0-9_]{1,40}$/;
const REF = /^[A-Z][A-Z0-9-]{2,40}$/;
const texto = (max) => (v) => typeof v === "string" && v.trim().length > 0 && v.length <= max && !/[<>]/.test(v);
const en = (lista) => (v) => lista.includes(v);

export const TIPOS_ITEM = Object.freeze(["si_no", "opcion_unica", "opcion_multiple"]);
export const OPERADORES = Object.freeze(["es", "no_es", "incluye", "no_incluye", "respondido", "no_respondido"]);
export const CANALES = Object.freeze(["web_autenticado", "sms_institucional", "voz_tercero", "entrevista_profesional"]);
export const ESTADOS_CUESTIONARIO = Object.freeze(["borrador", "revisado", "aprobado"]);
export const MOTIVOS_ESCALADO = Object.freeze(["dificultad_referida", "efecto_referido", "barrera_de_acceso", "cita_no_confirmada", "no_acudira_a_cita", "solicita_contacto"]);
export const PRIORIDADES = Object.freeze(["alta", "media", "baja"]);
export const RESPONSABLES = Object.freeze(["Farmacia Hospitalaria", "Infecciosas", "Enfermería"]);
export const UNIDADES_PLAZO = Object.freeze(["horas", "dias_habiles"]);
const DOMINIOS = ["barrera", "dificultad", "efecto"];
const MAX_ITEMS = 20, MAX_OPCIONES = 8, MAX_PROFUNDIDAD = 2;

/** Objeto cerrado: rechaza campos no previstos, exige los obligatorios y valida cada campo con su validador. */
function cerrado(obj, campos, requeridos, ruta) {
  if (!O(obj)) throw Error(`${ruta} no válido`);
  const presentes = Object.keys(obj).filter((k) => obj[k] !== undefined);
  for (const k of presentes) if (!(k in campos)) throw Error(`Campo no permitido en ${ruta}: ${k}`);
  for (const k of requeridos) if (obj[k] === undefined) throw Error(`Falta ${k} en ${ruta}`);
  for (const k of presentes) if (campos[k](obj[k], `${ruta}.${k}`) !== true) throw Error(`${ruta}.${k} no válido`);
}
const objeto = (campos, requeridos = []) => (v, ruta) => { cerrado(v, campos, requeridos, ruta); return true; };
const lista = (item, min, max) => (v, ruta) => {
  if (!Array.isArray(v) || v.length < min || v.length > max) return false;
  v.forEach((x, i) => { if (item(x, `${ruta}[${i}]`) !== true) throw Error(`${ruta}[${i}] no válido`); });
  return true;
};

/* ---------- condiciones: lenguaje cerrado (sin expresiones ni código) ---------- */
function condicion(v, ruta) {
  if (!O(v)) return false;
  if ("todas" in v || "alguna" in v) {
    cerrado(v, { todas: lista(condicion, 1, 8), alguna: lista(condicion, 1, 8) }, [], ruta);
    if (("todas" in v) === ("alguna" in v)) throw Error(`${ruta}: use «todas» o «alguna», no ambas ni ninguna`);
    return true;
  }
  cerrado(v, { item: (x) => typeof x === "string" && ID.test(x), op: en(OPERADORES), valor: (x) => typeof x === "string" && CODIGO.test(x) }, ["item", "op"], ruta);
  const sinValor = v.op === "respondido" || v.op === "no_respondido";
  if (sinValor && v.valor !== undefined) throw Error(`${ruta}: ${v.op} no lleva valor`);
  if (!sinValor && v.valor === undefined) throw Error(`Falta valor en ${ruta}`);
  return true;
}
const profundidad = (c) => ("todas" in c || "alguna" in c ? 1 + Math.max(...(c.todas || c.alguna).map(profundidad)) : 0);
const hojas = (c) => ("todas" in c || "alguna" in c ? (c.todas || c.alguna).flatMap(hojas) : [c]);

/**
 * Evalúa una condición sobre las respuestas dadas: `{idPregunta: "codigo" | ["codigo", …]}`. Lo no respondido
 * (ausente o selección vacía) nunca cumple `es`, `no_es`, `incluye` ni `no_incluye`; solo cumple `no_respondido`.
 */
export function evaluarCondicion(c, respuestas) {
  if ("todas" in c) return c.todas.every((x) => evaluarCondicion(x, respuestas));
  if ("alguna" in c) return c.alguna.some((x) => evaluarCondicion(x, respuestas));
  const r = respuestas[c.item];
  const respondida = r !== undefined && !(Array.isArray(r) && r.length === 0);
  switch (c.op) {
    case "respondido": return respondida;
    case "no_respondido": return !respondida;
    case "es": return respondida && !Array.isArray(r) && r === c.valor;
    case "no_es": return respondida && !Array.isArray(r) && r !== c.valor;
    case "incluye": return respondida && Array.isArray(r) && r.includes(c.valor);
    case "no_incluye": return respondida && Array.isArray(r) && !r.includes(c.valor);
  }
  return false;
}

/** Siguiente pregunta tras responder `item`: la primera regla que se cumple y, si ninguna, `por_defecto`. */
export function siguienteItem(q, item, respuestas) {
  for (const regla of item.siguiente) if (evaluarCondicion(regla.cuando, respuestas)) return regla.ir_a;
  return item.por_defecto;
}

/* ---------- forma ---------- */
const OPCION = objeto({ codigo: (v) => typeof v === "string" && CODIGO.test(v), texto: texto(120) }, ["codigo", "texto"]);
const REGISTRO = (v, ruta) => {
  if (!O(v)) return false;
  if (v.tipo === "respuesta") { cerrado(v, { tipo: en(["respuesta"]) }, ["tipo"], ruta); return true; }
  cerrado(v, {
    tipo: en(["afirmacion"]), fuente: en(["autoinforme"]), magnitud: en(["dificultad_referida"]), dominio: en(DOMINIOS),
    positivas: lista((x) => typeof x === "string" && CODIGO.test(x), 1, MAX_OPCIONES),
  }, ["tipo", "fuente", "magnitud", "dominio", "positivas"], ruta);
  return true;
};
const REGLA_SIGUIENTE = objeto({ cuando: condicion, ir_a: (v) => v === "FIN" || ID.test(v) }, ["cuando", "ir_a"]);
const ITEM = objeto({
  id: (v) => typeof v === "string" && ID.test(v) && v !== "fin", tipo: en(TIPOS_ITEM), texto: texto(240), obligatorio: (v) => typeof v === "boolean",
  opciones: lista(OPCION, 2, MAX_OPCIONES), registro: REGISTRO, siguiente: lista(REGLA_SIGUIENTE, 0, 8), por_defecto: (v) => v === "FIN" || (typeof v === "string" && ID.test(v)),
}, ["id", "tipo", "texto", "obligatorio", "registro", "siguiente", "por_defecto"]);
const ESCALADO = objeto({ id: (v) => typeof v === "string" && /^[a-z][a-z0-9-]{0,40}$/.test(v), cuando: condicion, protocolo: (v) => typeof v === "string" && REF.test(v), motivo: en(MOTIVOS_ESCALADO) }, ["id", "cuando", "protocolo", "motivo"]);
const nulable = (v) => v === null || (typeof v === "string" && v.length > 0 && v.length <= 80);
const APROBACION = (v, ruta) => v === null || (cerrado(v, { comite: nulable, revisor_independiente: nulable, fecha: nulable, acta: nulable }, [], ruta), true);
const INSTRUMENTO = objeto({ origen: en(["propio", "licenciado"]), titular: (v) => typeof v === "string" && v.length > 0 && v.length <= 80, autorizacion: nulable }, ["origen"]);
const CAMPOS = {
  formato: (v) => v === "vihconectados/cuestionario@1", id: (v) => typeof v === "string" && /^[a-z][a-z0-9-]{2,60}$/.test(v),
  version: (v) => typeof v === "string" && /^\d+\.\d+\.\d+$/.test(v), estado: en(ESTADOS_CUESTIONARIO), aprobacion: APROBACION,
  titulo: texto(120), proposito: texto(240), poblacion: texto(240), instrumento: INSTRUMENTO,
  canales: (v) => Array.isArray(v) && v.length > 0 && new Set(v).size === v.length && v.every((c) => CANALES.includes(c)),
  aviso_inicial: (v) => typeof v === "string" && REF.test(v), mensaje_cierre: (v) => typeof v === "string" && REF.test(v),
  inicio: (v) => typeof v === "string" && ID.test(v), items: lista(ITEM, 1, MAX_ITEMS), escalado: lista(ESCALADO, 1, MAX_ITEMS),
};

const codigos = (it) => (it.tipo === "si_no" ? ["si", "no"] : it.opciones.map((o) => o.codigo));
function condicionSemantica(c, items, maxIdx, ruta) {
  if (profundidad(c) > MAX_PROFUNDIDAD) throw Error(`Condición demasiado profunda en ${ruta} (profundidad máxima ${MAX_PROFUNDIDAD})`);
  for (const h of hojas(c)) {
    const idx = items.findIndex((i) => i.id === h.item);
    if (idx < 0) throw Error(`Condición sobre «${h.item}»: la pregunta no existe`);
    if (idx > maxIdx) throw Error(`La condición de «${ruta}» usa una respuesta que aún no se ha dado (${h.item})`);
    const it = items[idx], unica = it.tipo !== "opcion_multiple";
    if ((h.op === "es" || h.op === "no_es") && !unica) throw Error(`El operador ${h.op} solo es válido en preguntas de respuesta única`);
    if ((h.op === "incluye" || h.op === "no_incluye") && unica) throw Error(`El operador ${h.op} solo es válido en opciones múltiples`);
    if (h.valor !== undefined && !codigos(it).includes(h.valor)) throw Error(`Condición sobre «${h.item}»: valor no válido (${h.valor})`);
  }
}

/**
 * Valida un cuestionario: forma cerrada y garantías estáticas (sin ciclos, todo alcanzable, condiciones sobre
 * respuestas ya dadas). Con `protocolos`, comprueba también que los protocolos y avisos referenciados existen.
 * Lanza Error si no es válido. Un cuestionario válido NO es necesariamente activable (véase `esActivable`).
 */
export function validarCuestionario(q, protocolos = null) {
  cerrado(q, CAMPOS, Object.keys(CAMPOS), "cuestionario");
  const { items } = q, ids = items.map((i) => i.id);
  const repetido = ids.find((id, i) => ids.indexOf(id) !== i);
  if (repetido) throw Error(`Identificador duplicado: ${repetido}`);
  if (q.inicio !== ids[0]) throw Error("inicio debe ser el primer elemento de items");
  items.forEach((it, i) => {
    if (it.tipo === "si_no" && it.opciones !== undefined) throw Error(`«${it.id}»: una pregunta si_no no lleva opciones`);
    if (it.tipo !== "si_no" && it.opciones === undefined) throw Error(`Falta opciones en cuestionario.items[${i}]`);
    const cods = codigos(it), dup = cods.find((c, k) => cods.indexOf(c) !== k);
    if (dup) throw Error(`Código de opción duplicado en «${it.id}»: ${dup}`);
    if (it.registro.tipo === "afirmacion" && !it.registro.positivas.every((p) => cods.includes(p)))
      throw Error(`registro.positivas de «${it.id}» debe ser un subconjunto de sus opciones`);
    const destino = (t) => {
      if (t === "FIN") return;
      const k = ids.indexOf(t);
      if (k < 0) throw Error(`ir_a de «${it.id}» apunta a un elemento que no existe: ${t}`);
      if (k <= i) throw Error(`ir_a de «${it.id}» debe apuntar a un elemento posterior`);
    };
    it.siguiente.forEach((r, k) => { condicionSemantica(r.cuando, items, i, `${it.id}.siguiente[${k}]`); destino(r.ir_a); });
    destino(it.por_defecto);
  });
  const alcanzados = new Set([q.inicio]);
  for (const it of items) if (alcanzados.has(it.id)) for (const t of [...it.siguiente.map((r) => r.ir_a), it.por_defecto]) if (t !== "FIN") alcanzados.add(t);
  const huerfano = ids.find((id) => !alcanzados.has(id));
  if (huerfano) throw Error(`Elemento inalcanzable desde inicio: ${huerfano}`);
  const eid = q.escalado.map((e) => e.id), erep = eid.find((id, i) => eid.indexOf(id) !== i);
  if (erep) throw Error(`Identificador de escalado duplicado: ${erep}`);
  q.escalado.forEach((e) => {
    condicionSemantica(e.cuando, items, items.length - 1, `escalado.${e.id}`);
    if (protocolos && !protocolos.protocolos.some((p) => p.id === e.protocolo)) throw Error(`Escalado «${e.id}»: el protocolo ${e.protocolo} no existe en el registro`);
  });
  if (protocolos) for (const a of [q.aviso_inicial, q.mensaje_cierre]) if (!protocolos.avisos.some((x) => x.id === a)) throw Error(`El aviso ${a} no existe en el registro`);
  if (q.instrumento.origen === "licenciado" && (!q.instrumento.titular || !q.instrumento.autorizacion))
    throw Error("Instrumento con licencia sin autorización documentada (titular y autorización)");
  if (q.estado === "aprobado") {
    const a = q.aprobacion;
    if (!a || !a.comite || !a.revisor_independiente || !a.fecha || !a.acta)
      throw Error("Un cuestionario aprobado requiere aprobación documentada (comité, revisor independiente, fecha y acta)");
  }
  return true;
}

/* ---------- protocolos de escalado ---------- */
const PLAZO = (v, ruta) => v === null || (cerrado(v, { valor: (x) => Number.isInteger(x) && x >= 1 && x <= 999, unidad: en(UNIDADES_PLAZO) }, ["valor", "unidad"], ruta), true);
const PROTOCOLO = objeto({
  id: (v) => typeof v === "string" && REF.test(v), descripcion: texto(240), responsable_funcion: (v) => v === null || RESPONSABLES.includes(v), plazo: PLAZO,
  prioridad: (v) => v === null || PRIORIDADES.includes(v), aprobado: (v) => typeof v === "boolean",
  aprobacion: objeto({ comite: nulable, acta: nulable, fecha: nulable }, ["comite", "acta", "fecha"]),
}, ["id", "descripcion", "responsable_funcion", "plazo", "prioridad", "aprobado", "aprobacion"]);
const AVISO = objeto({ id: (v) => typeof v === "string" && REF.test(v), texto: texto(400), aprobado: (v) => typeof v === "boolean" }, ["id", "texto", "aprobado"]);

/**
 * Valida el registro de protocolos. Un protocolo puede estar PENDIENTE (todo nulo y sin aprobar), pero no puede
 * declararse aprobado sin responsable, plazo, prioridad y aprobación documentada: esos valores los fija el comité.
 */
export function validarProtocolos(reg) {
  cerrado(reg, { formato: (v) => v === "vihconectados/protocolos-escalado-propuesta@1", estado_revision: (v) => typeof v === "string", protocolos: lista(PROTOCOLO, 1, 40), avisos: lista(AVISO, 1, 40) }, ["formato", "protocolos", "avisos"], "protocolos");
  for (const [clave, elementos] of [["protocolo", reg.protocolos], ["aviso", reg.avisos]]) {
    const ids = elementos.map((e) => e.id), rep = ids.find((id, i) => ids.indexOf(id) !== i);
    if (rep) throw Error(`Identificador de ${clave} duplicado: ${rep}`);
  }
  for (const p of reg.protocolos) if (p.aprobado) {
    if (!p.responsable_funcion) throw Error(`${p.id}: un protocolo aprobado requiere responsable`);
    if (!p.plazo) throw Error(`${p.id}: un protocolo aprobado requiere plazo`);
    if (!p.prioridad) throw Error(`${p.id}: un protocolo aprobado requiere prioridad`);
    if (!p.aprobacion.comite || !p.aprobacion.acta || !p.aprobacion.fecha) throw Error(`${p.id}: un protocolo aprobado requiere aprobación documentada (comité, acta y fecha)`);
  }
  return true;
}

/**
 * ¿Puede activarse (enviarse a pacientes)? Solo si está aprobado y todos sus protocolos y avisos también.
 * No lanza: devuelve los motivos por los que no se puede.
 */
export function esActivable(q, protocolos) {
  const motivos = [];
  try { validarCuestionario(q, protocolos); } catch (e) { motivos.push(e.message); }
  if (q.estado !== "aprobado") motivos.push(`El estado es «${q.estado}»: se requiere «aprobado»`);
  for (const id of new Set(q.escalado.map((e) => e.protocolo))) {
    const p = protocolos.protocolos.find((x) => x.id === id);
    if (!p || !p.aprobado) motivos.push(`Protocolo ${id} sin aprobar: faltan responsable, plazo y prioridad definidos por el comité`);
  }
  for (const id of [q.aviso_inicial, q.mensaje_cierre]) {
    const a = protocolos.avisos.find((x) => x.id === id);
    if (!a || !a.aprobado) motivos.push(`Aviso ${id} sin aprobar`);
  }
  return { activable: motivos.length === 0, motivos };
}
