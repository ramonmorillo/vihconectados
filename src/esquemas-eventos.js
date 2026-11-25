/**
 * Esquemas cerrados de los eventos (actuación A08; docs/ESQUEMAS_EVENTOS.md).
 * Módulo de datos y funciones puras, sin dependencias.
 *
 * Qué validan: la FORMA del evento (tipo conocido, campos permitidos, campos obligatorios y tipo de dato).
 * Qué NO validan: los valores ni las fechas; eso sigue siendo responsabilidad de las reglas de negocio de
 * `anexar` (así se conservan sus mensajes). Dos modos:
 *  - entrada (`validarEvento`): lo que un llamador envía a `anexar`. Rechaza `id` y `registrado`, que asigna el sistema.
 *  - almacenado (`diagnosticarEvento`): lo que ya hay guardado. Admite `id`, `registrado` y los campos derivados
 *    que añade `anexar`. Nunca borra ni rechaza datos: solo informa.
 */
const O = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const S = (v) => typeof v === "string";
const S0 = (v) => v === null || typeof v === "string";
const N0 = (v) => v === null || (typeof v === "number" && Number.isFinite(v));
const I = (v) => Number.isInteger(v);
const B = (v) => typeof v === "boolean";
const OBJ = O;
const OBJ0 = (v) => v === null || O(v);
const ARR = (v) => Array.isArray(v);

/** Comprueba un valor con su validador; un validador puede devolver false o lanzar su propio error. */
function comprobar(ruta, valor, validador) {
  if (validador(valor, ruta) !== true) throw Error(`${ruta} no válido`);
}
const objetoCerrado = (campos, requeridos = []) => (v, ruta) => {
  if (!O(v)) return false;
  for (const k of Object.keys(v)) if (!(k in campos)) throw Error(`Campo no permitido en ${ruta}: ${k}`);
  for (const k of requeridos) if (!(k in v) || v[k] === undefined) throw Error(`Falta ${k} en ${ruta}`);
  for (const [k, x] of Object.entries(v)) comprobar(`${ruta}.${k}`, x, campos[k]);
  return true;
};
const listaDe = (item) => (v, ruta) => {
  if (!ARR(v)) return false;
  v.forEach((x, i) => comprobar(`${ruta}[${i}]`, x, item));
  return true;
};

const FILA = objetoCerrado(
  { fecha: S, episodio: S, componente: S, dias: I, linea: I, origen: S, id_origen: S },
  ["fecha", "episodio", "componente", "dias"],
);
const EXPERIENCIA = objetoCerrado({ barrera: S, dificultad: S, efecto: S, carga: S, preferencia: S });
const INFORME = {
  temporal: S, fecha: S, formato: S, version: S, aviso: S, autor: S, destino: S, paciente: S, nivel: S,
  cobertura: OBJ, reglas_aplicadas: ARR, alertas: ARR, informes_previos: ARR, eventos: ARR,
};

/**
 * `campos`: campos de entrada permitidos. `requeridos`: lista o función del evento.
 * `derivados`: campos que añade `anexar` y que solo existen en eventos ya almacenados.
 */
export const ESQUEMAS = Object.freeze({
  nivel: { campos: { fecha: S, nivel: S }, requeridos: ["nivel"] },
  tratamiento: {
    campos: { fecha: S, tar: S, medicamentos: listaDe(OBJ), modalidad: S, confirmado: B },
    requeridos: ["fecha", "tar"],
  },
  visita: { campos: { fecha: S, experiencia: EXPERIENCIA }, requeridos: ["fecha", "experiencia"] },
  consulta: {
    campos: { fecha: S, problema: S, objetivo: S, responsable: S, revision: S, revisado: B, visita: S0, evaluacion: S0, actuacion: S, reglas: OBJ },
    requeridos: ["fecha", "problema", "objetivo", "responsable", "revision", "revisado", "actuacion"],
    derivados: { contexto: OBJ },
  },
  seguimiento_consulta: {
    campos: { consulta: S, fecha: S, estado: S, resultado: S, observaciones: S, responsable: S, revision: S },
    // Solo la identificación: `validarSeguimiento` comprueba antes el estado del plan («ya está cerrado») y da
    // un mensaje específico por cada campo restante, que el esquema no debe pre-empatar.
    requeridos: ["consulta", "fecha"],
  },
  gestion_senal: {
    campos: { fecha: S, regla: S, evidencia: S, estado: S, motivo: S, actuacion: S0, reglas: OBJ },
    requeridos: ["fecha", "regla", "evidencia", "estado", "motivo"],
  },
  correccion_dispensacion: {
    campos: { referencia: S, motivo: S, sustitucion: (v, r) => v === null || FILA(v, r), coincidencia_confirmada: B },
    requeridos: ["referencia", "motivo"],
    derivados: { fecha: S, fecha_original: S },
  },
  importacion: {
    campos: {
      conciliada: B, fuente: S, filas: listaDe(FILA), duplicadas: listaDe((v) => I(v)), entradas: listaDe(FILA),
      resoluciones: OBJ, huella: S, conflictos: ARR, decisiones: ARR, reimportacion: S0,
    },
    requeridos: (e) => (e.conciliada === true ? ["entradas"] : ["filas"]),
    derivados: { fecha: S },
  },
  evaluacion_adherencia: {
    campos: { fecha: S, periodo_inicio: S, periodo_fin: S, metodo: S, resultado: S, porcentaje: N0 },
    requeridos: ["fecha", "periodo_inicio", "periodo_fin", "metodo", "resultado"],
  },
  actuacion: { campos: { fecha: S, texto: S, estado: S, nivel: S, fuente: S }, requeridos: ["texto", "estado"] },
  estado_actuacion: { campos: { fecha: S, actuacion: S, estado: S }, requeridos: ["actuacion", "estado"] },
  estado_comunicacion: { campos: { fecha: S, informe: S, estado: S }, requeridos: ["informe", "estado"] },
  informe: { campos: INFORME, requeridos: ["fecha", "formato", "paciente", "cobertura", "alertas"] },
  informe_paciente: {
    campos: { ...INFORME, plan: OBJ, recurso: OBJ0 },
    requeridos: ["fecha", "formato", "paciente", "cobertura", "alertas", "plan"],
  },
  revision_alertas: { campos: { fecha: S, resultado: S, alertas: ARR, reglas: OBJ }, requeridos: ["resultado"] },
  /** Sin productor en la aplicación actual; se mantiene aceptado con un esquema mínimo. */
  configuracion: { campos: { fecha: S, reglas: OBJ }, requeridos: [] },
});
export const TIPOS_EVENTO = Object.freeze(Object.keys(ESQUEMAS));

export const camposRequeridos = (e) => {
  const r = ESQUEMAS[e?.tipo]?.requeridos;
  return typeof r === "function" ? r(e) : [...(r || [])];
};

function validar(e, almacenado) {
  if (!O(e)) throw Error("Evento no válido");
  const esq = Object.hasOwn(ESQUEMAS, e.tipo) ? ESQUEMAS[e.tipo] : null;
  if (!esq) throw Error("Tipo de evento desconocido");
  const permitidos = { ...esq.campos, ...(almacenado ? { ...(esq.derivados || {}), id: S, registrado: S } : {}) };
  // Una clave con valor undefined equivale a no estar presente (JSON.stringify la descarta al guardar).
  for (const k of Object.keys(e).filter((k) => e[k] !== undefined)) {
    if (k === "tipo") continue;
    if (!almacenado && (k === "id" || k === "registrado")) throw Error(`Campo reservado: ${k} (lo asigna el sistema)`);
    if (!(k in permitidos)) throw Error(`Campo no permitido en ${e.tipo}: ${k}`);
  }
  const requeridos = [...camposRequeridos(e), ...(almacenado ? ["id", "registrado"] : [])];
  for (const k of requeridos) if (!(k in e) || e[k] === undefined) throw Error(`Falta ${k} en ${e.tipo}`);
  for (const [k, v] of Object.entries(e)) if (k !== "tipo" && v !== undefined) comprobar(`${e.tipo}.${k}`, v, permitidos[k]);
  return true;
}
/** Valida un evento que un llamador envía a `anexar`. Lanza Error si no cumple su esquema. */
export const validarEvento = (e) => validar(e, false);
/** Diagnostica un evento ya almacenado: devuelve null si es conforme o el motivo, sin lanzar. */
export function diagnosticarEvento(e) {
  try {
    validar(e, true);
    return null;
  } catch (err) {
    return err.message;
  }
}
