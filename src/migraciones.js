/**
 * Formato de la base y migraciones (actuación A08; docs/ESQUEMAS_EVENTOS.md).
 *
 * Reglas:
 *  - Una migración nunca modifica, reordena ni elimina eventos: solo añade metadatos de formato.
 *  - Leer no escribe: la base migrada vive en memoria hasta la primera escritura.
 *  - Un formato desconocido (p. ej. de una versión posterior) no se toca ni se reinterpreta: se informa.
 *  - El diagnóstico de eventos no conformes informa, no descarta.
 */
import { diagnosticarEvento } from "./esquemas-eventos.js";

export const FORMATO_ANTERIOR = "vihconectados/demo@1";
/** v2: los eventos nuevos se validan con esquemas cerrados antes de guardarse. Los antiguos se conservan intactos. */
export const FORMATO_ACTUAL = "vihconectados/demo@2";
export const ESQUEMA_EVENTOS = 1;

const PASOS = Object.freeze({
  [FORMATO_ANTERIOR]: (db) => {
    const x = structuredClone(db);
    x.formato = FORMATO_ACTUAL;
    x.esquema_eventos = ESQUEMA_EVENTOS;
    x.migracion = { desde: FORMATO_ANTERIOR };
    return x;
  },
});

const incompatible = (motivo) =>
  Error(`Almacenamiento incompatible: ${motivo} No se ha modificado ni borrado nada; conserve una copia antes de continuar.`);

/** Lleva una base al formato actual encadenando migraciones. Devuelve la misma base si ya lo es. */
export function migrarBase(db) {
  if (!db || typeof db !== "object" || !Array.isArray(db.pacientes))
    throw incompatible("no tiene la estructura de una base de vihconectados.");
  let x = db;
  while (x.formato !== FORMATO_ACTUAL) {
    const paso = PASOS[x.formato];
    if (!paso) throw incompatible(`el formato «${x.formato}» no está soportado por esta versión.`);
    x = paso(x);
  }
  return x;
}

/** Revisa cada evento almacenado contra los esquemas. Solo informa; no modifica la base. */
export function diagnosticarBase(db) {
  const no_conformes = [];
  let eventos = 0;
  for (const p of db.pacientes || []) {
    for (const e of Array.isArray(p?.eventos) ? p.eventos : []) {
      eventos++;
      const motivo = diagnosticarEvento(e);
      if (motivo) no_conformes.push({ paciente: p.id ?? null, evento: e?.id ?? null, tipo: e?.tipo ?? null, motivo });
    }
  }
  return { eventos, no_conformes };
}
