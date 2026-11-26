/**
 * Solicitudes de valoración entre profesionales (docs/strategy/COMUNICACION_PROFESIONALES.md).
 * Módulo de DOMINIO puro: sin acceso al navegador.
 *
 * Ciclo (cada paso es un evento nuevo; nada se reescribe):
 *   enviada (crea `solicitud_valoracion`) → recibida (destino) → respondida (destino, con texto) → cerrada (origen).
 * El «perfil» es una función que declara quien usa la herramienta: NO es una cuenta ni una identidad verificada.
 * La vigencia («vencida») se deriva de la fecha de corte; no genera avisos ni mensajes reales.
 */
import { fecha } from "./motor.js";
import { aplicable } from "./temporal.js";

export const PERFILES = Object.freeze(["Farmacia Hospitalaria", "Infecciosas"]);
export const ESTADOS_SOLICITUD = Object.freeze(["enviada", "recibida", "respondida", "cerrada"]);
const SIGUIENTE = Object.freeze({ enviada: "recibida", recibida: "respondida", respondida: "cerrada" });
const ACTOR = Object.freeze({ recibida: "destino", respondida: "destino", cerrada: "origen" });
export const MAX_MOTIVO = 500, MAX_RESPUESTA = 1000, MAX_SENAL = 60;

const texto = (v, max) => typeof v === "string" && v.trim().length >= 1 && v.trim().length <= max;
const esCreacion = (e) => e.tipo === "solicitud_valoracion";

/** Reglas de negocio de una solicitud nueva (la forma la comprueba el esquema del evento). */
export function validarSolicitud(p, e) {
  if (!PERFILES.includes(e.origen) || !PERFILES.includes(e.destino)) throw Error("Perfil no válido: use Farmacia Hospitalaria o Infecciosas.");
  if (e.origen === e.destino) throw Error("Origen y destino deben ser distintos.");
  if (!texto(e.motivo, MAX_MOTIVO)) throw Error(`Indique el motivo (1–${MAX_MOTIVO} caracteres).`);
  if (fecha(e.plazo) < fecha(e.fecha)) throw Error("El plazo no puede ser anterior a la fecha de la solicitud.");
  if (e.senal !== undefined && e.senal !== null && (typeof e.senal !== "string" || !e.senal || e.senal.length > MAX_SENAL)) throw Error("Señal vinculada no válida.");
}

/** Estado más reciente registrado (sin filtrar por corte), para validar el siguiente paso. */
function estadoRegistrado(p, id) {
  const pasos = p.eventos.filter((e) => e.tipo === "estado_solicitud" && e.solicitud === id);
  return { estado: pasos.at(-1)?.estado ?? "enviada", fecha: pasos.at(-1)?.fecha ?? null };
}

/** Reglas de negocio de un paso del ciclo. */
export function validarEstadoSolicitud(p, e) {
  const creada = p.eventos.find((x) => x.id === e.solicitud && esCreacion(x));
  if (!creada) throw Error("Solicitud inexistente en este caso.");
  if (!Object.values(SIGUIENTE).includes(e.estado)) throw Error("Estado de solicitud no válido.");
  if (!PERFILES.includes(e.perfil)) throw Error("Perfil no válido: use Farmacia Hospitalaria o Infecciosas.");
  const actual = estadoRegistrado(p, e.solicitud);
  if (actual.estado === "cerrada") throw Error("La solicitud ya está cerrada.");
  if (SIGUIENTE[actual.estado] !== e.estado) throw Error(`Orden del ciclo: desde «${actual.estado}» solo se puede pasar a «${SIGUIENTE[actual.estado]}».`);
  const quien = creada[ACTOR[e.estado]];
  if (e.perfil !== quien) throw Error(`Solo el perfil de ${ACTOR[e.estado]} (${quien}) puede marcar «${e.estado}».`);
  if (e.estado === "respondida") {
    if (!texto(e.respuesta, MAX_RESPUESTA)) throw Error(`Escriba la respuesta (1–${MAX_RESPUESTA} caracteres).`);
  } else if (e.respuesta !== undefined && e.respuesta !== null) throw Error("Solo la respuesta lleva texto de respuesta.");
  const ultima = actual.fecha ?? creada.fecha;
  if (fecha(e.fecha) < fecha(ultima)) throw Error("La fecha no puede ser anterior al último paso de la solicitud.");
}

/** Estado de una solicitud a una fecha de corte; `null` si aún no existía. */
export function estadoSolicitud(p, id, fin) {
  const creada = p.eventos.find((e) => e.id === id && esCreacion(e));
  if (!creada || !aplicable(creada, fin)) return null;
  const pasos = p.eventos.filter((e) => e.tipo === "estado_solicitud" && e.solicitud === id && aplicable(e, fin));
  const estado = pasos.at(-1)?.estado ?? "enviada";
  return {
    id, paciente: p.id, origen: creada.origen, destino: creada.destino, motivo: creada.motivo, plazo: creada.plazo, senal: creada.senal ?? null,
    estado, vencida: !!fin && fin > creada.plazo && (estado === "enviada" || estado === "recibida"),
    respuesta: pasos.find((x) => x.estado === "respondida")?.respuesta ?? null,
    historial: [{ estado: "enviada", perfil: creada.origen, fecha: creada.fecha }, ...pasos.map((x) => ({ estado: x.estado, perfil: x.perfil, fecha: x.fecha }))],
  };
}

export const solicitudesPaciente = (p, fin) => p.eventos.filter(esCreacion).map((e) => estadoSolicitud(p, e.id, fin)).filter(Boolean);

/** Pasos que un perfil puede dar ahora sobre una solicitud. */
export function accionesDisponibles(sol, perfil) {
  if (!sol || sol.estado === "cerrada") return [];
  const siguiente = SIGUIENTE[sol.estado];
  return sol[ACTOR[siguiente]] === perfil ? [siguiente] : [];
}

/** Reparte las solicitudes de todos los casos: lo que toca a este perfil, lo que espera y lo cerrado. */
export function bandeja(pacientes, fin, perfil) {
  const todas = pacientes.flatMap((p) => solicitudesPaciente(p, fin));
  const orden = (a, b) => Number(b.vencida) - Number(a.vencida) || a.plazo.localeCompare(b.plazo) || a.id.localeCompare(b.id);
  const r = { paraMi: [], esperando: [], cerradas: [] };
  for (const s of todas) (s.estado === "cerrada" ? r.cerradas : accionesDisponibles(s, perfil).length ? r.paraMi : r.esperando).push(s);
  for (const k of Object.keys(r)) r[k].sort(orden);
  return r;
}
