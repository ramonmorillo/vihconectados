/**
 * Esquema de «afirmación» del modelo de evidencia (actuación A15; docs/strategy/EVIDENCE_TRIANGULATION_SPEC.md).
 *
 * Una afirmación es lo que UNA fuente dice, con su fecha efectiva, su procedencia y su confianza. No contiene
 * interpretación ni recomendación: la interpretación (acuerdo o desacuerdo entre fuentes) se deriva de varias
 * afirmaciones por reglas aprobadas.
 *
 * NO está conectado a la aplicación: no se guarda ni se calcula nada con él todavía (backlog B09). Módulo de
 * datos y validación pura, sin dependencias. Todos los valores son códigos o números: no admite texto libre.
 */
const O = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const CODIGO = /^[A-Za-z0-9_.:-]{1,80}$/;
const cod = (v) => typeof v === "string" && CODIGO.test(v);
const en = (lista) => (v) => lista.includes(v);
const dias = (v) => Number.isInteger(v) && v >= 1 && v <= 400;
const num0 = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;
const pct0 = (v) => v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100);
function esFecha(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const n = Date.parse(s + "T00:00:00Z");
  return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === s;
}
const esMomento = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(s) && Number.isFinite(Date.parse(s));

export const FUENTES = Object.freeze([
  "dispensacion_hospitalaria", "dispensacion_externa", "administracion_registrada", "cita",
  "autoinforme", "valoracion_profesional", "analitica", "contexto_clinico",
]);
export const NIVELES_CONFIANZA = Object.freeze(["alta", "media", "baja", "desconocida"]);
export const MOTIVOS_CONFIANZA = Object.freeze([
  "fuente_primaria", "importacion_validada", "captura_manual", "sin_identidad_de_origen", "dato_incompleto",
  "dato_antiguo", "corregido", "autoinforme", "valoracion_profesional", "sistema_externo_no_verificado",
]);
/** Motivos que impiden una confianza alta: la fuente es manual, incompleta, antigua o no identificable. */
const INCOMPATIBLES_CON_ALTA = Object.freeze(["captura_manual", "sin_identidad_de_origen", "dato_incompleto", "dato_antiguo", "sistema_externo_no_verificado"]);
export const METODOS_CAPTURA = Object.freeze(["manual", "importacion_csv", "interfaz_externa", "cuestionario", "entrevista", "calculo_del_sistema"]);
export const FUNCIONES = Object.freeze(["Farmacia Hospitalaria", "Infecciosas", "Enfermería", "Paciente", "Sistema"]);
export const MOTIVOS_CORRECCION = Object.freeze(["error_de_captura", "dato_duplicado", "fecha_incorrecta", "fuente_corregida", "otro_codificado"]);
const RESULTADOS_ADHERENCIA = ["No concluyente", "Sin dificultades referidas", "Dificultades referidas"];

/** Cada fuente solo puede aportar sus magnitudes. */
export const MAGNITUDES = Object.freeze({
  dispensacion_hospitalaria: Object.freeze(["dias_suministro"]),
  dispensacion_externa: Object.freeze(["dias_suministro"]),
  administracion_registrada: Object.freeze(["administracion_la"]),
  cita: Object.freeze(["asistencia"]),
  autoinforme: Object.freeze(["dificultad_referida", "valoracion_adherencia"]),
  valoracion_profesional: Object.freeze(["nivel_cmo"]),
  analitica: Object.freeze(["carga_viral"]),
  contexto_clinico: Object.freeze([
    "ingreso_hospitalario", "suspension_prescrita", "suministro_viaje", "perdida_o_sustitucion",
    "fin_de_seguimiento", "stock_inicial", "transicion_con_solapamiento",
  ]),
});
/** Estructura cerrada del valor de cada magnitud; `intervalo: true` obliga a indicar fin de la fecha efectiva. */
const VALORES = Object.freeze({
  dias_suministro: { campos: { componente: cod, dias, episodio: cod }, req: ["componente", "dias"] },
  administracion_la: { campos: { farmaco: cod, tipo: en(["inicio", "continuacion", "reinicio"]) }, req: ["farmaco", "tipo"] },
  asistencia: { campos: { resultado: en(["asistida", "no_asistida", "reprogramada"]) }, req: ["resultado"] },
  dificultad_referida: { campos: { dominio: en(["barrera", "dificultad", "efecto"]), resultado: en(["si", "no", "no_explorado"]) }, req: ["dominio", "resultado"] },
  valoracion_adherencia: { campos: { resultado: en(RESULTADOS_ADHERENCIA), porcentaje: pct0 }, req: ["resultado"] },
  nivel_cmo: { campos: { nivel: en(["1", "2", "3"]) }, req: ["nivel"] },
  carga_viral: { campos: { copias_ml: num0 }, req: ["copias_ml"] },
  ingreso_hospitalario: { campos: {}, req: [], intervalo: true },
  suspension_prescrita: { campos: { motivo_codigo: cod }, req: [], intervalo: true },
  suministro_viaje: { campos: { dias }, req: ["dias"] },
  perdida_o_sustitucion: { campos: { componente: cod }, req: [] },
  fin_de_seguimiento: { campos: { motivo: en(["fallecimiento", "traslado", "perdida_de_seguimiento", "alta"]) }, req: ["motivo"] },
  stock_inicial: { campos: { componente: cod, dias }, req: ["componente", "dias"] },
  transicion_con_solapamiento: { campos: {}, req: [], intervalo: true },
});

function cerrado(obj, campos, requeridos, ruta) {
  if (!O(obj)) throw Error(`${ruta} no válido`);
  const presentes = Object.keys(obj).filter((k) => obj[k] !== undefined);
  for (const k of presentes) if (!(k in campos)) throw Error(`Campo no permitido en ${ruta}: ${k}`);
  for (const k of requeridos) if (obj[k] === undefined) throw Error(`Falta ${k} en ${ruta}`);
  for (const k of presentes) {
    const v = campos[k](obj[k], `${ruta}.${k}`);
    if (v !== true) throw Error(`${ruta}.${k} no válido`);
  }
}
const objeto = (campos, requeridos) => (v, ruta) => { cerrado(v, campos, requeridos, ruta); return true; };

const ACTOR = objeto({ usuario_id: cod, funcion: en(FUNCIONES) }, ["funcion"]);
const PROCEDENCIA = objeto(
  { sistema_origen: cod, id_origen: cod, lote_id: cod, huella: cod, metodo_captura: en(METODOS_CAPTURA), actor: ACTOR },
  ["sistema_origen", "metodo_captura", "actor"],
);
const CORRIGE = objeto({ afirmacion_id: cod, motivo: en(MOTIVOS_CORRECCION) }, ["afirmacion_id", "motivo"]);
function confianza(v, ruta) {
  cerrado(v, { nivel: en(NIVELES_CONFIANZA), motivos: (m) => Array.isArray(m) && m.every((x) => MOTIVOS_CONFIANZA.includes(x)) && new Set(m).size === m.length }, ["nivel", "motivos"], ruta);
  if (v.nivel === "alta" && v.motivos.some((m) => INCOMPATIBLES_CON_ALTA.includes(m)))
    throw Error(`${ruta}: una confianza alta no admite ${INCOMPATIBLES_CON_ALTA.filter((m) => v.motivos.includes(m)).join(", ")}`);
  if ((v.nivel === "baja" || v.nivel === "desconocida") && v.motivos.length === 0)
    throw Error(`${ruta}: una confianza ${v.nivel} requiere al menos un motivo`);
  return true;
}
function fechaEfectiva(v, ruta) {
  cerrado(v, { inicio: esFecha, fin: (f) => f === null || esFecha(f) }, ["inicio"], ruta);
  if (v.fin && Date.parse(v.fin) <= Date.parse(v.inicio)) throw Error(`${ruta}.fin debe ser posterior al inicio (intervalo [inicio, fin))`);
  return true;
}

/**
 * Valida una afirmación. Modo entrada: lo que envía un llamador (id y conocida_en son campos reservados que
 * asigna el sistema). Modo `almacenada`: los exige. Lanza Error si no cumple el esquema.
 */
export function validarAfirmacion(a, { almacenada = false } = {}) {
  if (!O(a)) throw Error("afirmacion no válida");
  if (!almacenada) for (const k of ["id", "conocida_en", "estado"]) if (a[k] !== undefined) throw Error(`Campo reservado: ${k} (lo asigna el sistema)`);
  const campos = {
    fuente: en(FUENTES), magnitud: (m) => typeof m === "string", valor: (v) => O(v), fecha_efectiva: fechaEfectiva,
    procedencia: PROCEDENCIA, confianza, corrige: CORRIGE,
    ...(almacenada ? { id: cod, conocida_en: esMomento, estado: en(["vigente", "corregida", "anulada"]) } : {}),
  };
  cerrado(a, campos, ["fuente", "magnitud", "valor", "fecha_efectiva", "procedencia", "confianza", ...(almacenada ? ["id", "conocida_en"] : [])], "afirmacion");
  if (!MAGNITUDES[a.fuente].includes(a.magnitud)) throw Error(`Magnitud ${a.magnitud} no corresponde a la fuente ${a.fuente}`);
  const esq = VALORES[a.magnitud];
  cerrado(a.valor, esq.campos, esq.req, `afirmacion.valor(${a.magnitud})`);
  if (esq.intervalo && !a.fecha_efectiva.fin) throw Error(`${a.magnitud} requiere un intervalo: afirmacion.fecha_efectiva.fin`);
  return true;
}
