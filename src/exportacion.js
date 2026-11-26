/**
 * Manifiesto y minimización de exportaciones (actuación A09; docs/VALIDACION.md).
 * Módulo de dominio puro, sin dependencias: usa `crypto.subtle` (Web Crypto), disponible en navegadores (contexto
 * seguro, incluido localhost) y en Node.
 *
 * Qué aporta el hash: permite detectar una alteración o corrupción ACCIDENTAL del contenido. Qué NO aporta: no es una
 * firma ni acredita autor ni origen, porque cualquiera puede recalcularlo tras modificar el contenido.
 */
export const ESQUEMA_EXPORTACION = "vihconectados/exportacion@1";
export const MODOS = Object.freeze(["completo", "minimo"]);
export const TIPOS = Object.freeze(["informe", "informe_paciente", "base"]);

const AVISO_HASH = "El hash detecta alteraciones accidentales del contenido; no es una firma ni acredita autor ni origen.";
const AVISOS = Object.freeze({
  completo: `Contiene el historial completo del paciente (todos los eventos). Úselo solo si necesita reproducir el cálculo. ${AVISO_HASH}`,
  minimo: `Sin la lista de eventos: no permite reproducir ni verificar el cálculo a partir de este fichero. ${AVISO_HASH}`,
});

/** JSON canónico: claves ordenadas, listas en su orden, `undefined` omitido (como al guardar). Rechaza valores no finitos. */
export function canonico(v) {
  if (typeof v === "number" && !Number.isFinite(v)) throw Error("Valor numérico no finito en la exportación");
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? "null" : canonico(x))).join(",")}]`;
  return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonico(v[k])}`).join(",")}}`;
}

export async function sha256(texto) {
  const b = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
function fechaValida(s) {
  const m = FECHA.exec(String(s));
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export async function empaquetar({ tipo, contenido, exportado, version, modo }) {
  if (!TIPOS.includes(tipo)) throw Error("Tipo de exportación no válido");
  if (!MODOS.includes(modo)) throw Error("Modo de exportación no válido");
  if (!fechaValida(exportado)) throw Error("Fecha de exportación no válida");
  return {
    esquema: ESQUEMA_EXPORTACION,
    tipo,
    version: String(version),
    exportado,
    modo,
    aviso: AVISOS[modo],
    contenido_hash: "sha256:" + (await sha256(canonico(contenido))),
    contenido,
  };
}

/** Comprueba un paquete leído de un fichero. Nunca lanza: devuelve `{ok}` o `{ok:false, motivo}`. */
export async function verificar(p) {
  try {
    if (p === null || typeof p !== "object" || Array.isArray(p)) return { ok: false, motivo: "No es un paquete de exportación" };
    if (p.esquema !== ESQUEMA_EXPORTACION) return { ok: false, motivo: `Esquema no reconocido: ${p.esquema}` };
    if (typeof p.contenido_hash !== "string" || !/^sha256:[0-9a-f]{64}$/.test(p.contenido_hash)) return { ok: false, motivo: "Hash ausente o malformado" };
    if (p.contenido === undefined) return { ok: false, motivo: "Sin contenido" };
    const h = "sha256:" + (await sha256(canonico(p.contenido)));
    return h === p.contenido_hash ? { ok: true } : { ok: false, motivo: "El hash no coincide: el contenido ha cambiado" };
  } catch (e) {
    return { ok: false, motivo: e.message };
  }
}

/** Informe sin la lista de eventos embebida (minimización). No modifica el original. */
export function informeMinimo(i) {
  const { eventos, ...resto } = structuredClone(i);
  return { ...resto, eventos_omitidos: Array.isArray(eventos) ? eventos.length : 0 };
}
