/**
 * Interfaz de las solicitudes de valoración entre profesionales (docs/strategy/COMUNICACION_PROFESIONALES.md).
 * Módulo de INTERFAZ: pinta HTML y abre formularios; la lógica está en solicitudes.js y eventos-formulario.js.
 * Todo dato almacenado se escapa con `esc`. El perfil es una función declarada, no una identidad verificada.
 */
import { esc } from "./vista-informes.js";
import { PERFILES, MAX_MOTIVO, MAX_RESPUESTA, bandeja, solicitudesPaciente, accionesDisponibles } from "./solicitudes.js";
import { construirSolicitud, construirPasoSolicitud } from "./eventos-formulario.js";
import { evaluarSenales } from "./senales.js";

const ETIQUETA = { enviada: "Enviada", recibida: "Recibida", respondida: "Respondida", cerrada: "Cerrada" };
const VERBO = { recibida: "Marcar recibida", respondida: "Responder", cerrada: "Cerrar solicitud" };
const otro = (perfil) => PERFILES.find((x) => x !== perfil);

export function tarjetaSolicitud(s, perfil, { enlaceCaso = true } = {}) {
  const acciones = accionesDisponibles(s, perfil);
  return `<article class="item solicitud" data-estado="${esc(s.estado)}"><p><strong>${enlaceCaso ? `<a href="#caso/${esc(s.paciente)}">${esc(s.paciente)}</a> · ` : ""}${esc(s.origen)} → ${esc(s.destino)}</strong> <span class="badge ${s.vencida ? "warn" : ""}">${esc(ETIQUETA[s.estado])}${s.vencida ? " · plazo vencido" : ""}</span></p>`
    + `<p>${esc(s.motivo)}</p>`
    + `<p class="muted">Plazo: ${esc(s.plazo)}${s.senal ? ` · Señal vinculada: ${esc(s.senal)}` : ""}</p>`
    + (s.respuesta ? `<p><strong>Respuesta:</strong> ${esc(s.respuesta)}</p>` : "")
    + `<details><summary>Historial</summary>${s.historial.map((h) => `<p class="muted">${esc(h.fecha)} · ${esc(ETIQUETA[h.estado])} · ${esc(h.perfil)}</p>`).join("")}</details>`
    + (acciones.length ? `<div class="actions">${acciones.map((a) => `<button data-action="solicitud-paso" data-id="${esc(`${s.paciente}|${s.id}|${a}`)}">${esc(VERBO[a])}</button>`).join("")}</div>` : "")
    + `</article>`;
}

const seccion = (titulo, lista, perfil, vacio) =>
  `<section class="card"><div class="section-head"><h2>${esc(titulo)}</h2><span class="badge">${lista.length}</span></div>${lista.length ? lista.map((s) => tarjetaSolicitud(s, perfil)).join("") : `<p class="muted">${esc(vacio)}</p>`}</section>`;

export function vistaSolicitudes(pacientes, fin, perfil) {
  const b = bandeja(pacientes, fin, perfil);
  return `<p class="intro">Peticiones de valoración entre Farmacia Hospitalaria e Infecciosas, con acuse, respuesta y cierre. <strong>Prototipo local:</strong> no se envía nada a nadie; los dos perfiles trabajan sobre los mismos datos de este navegador para ensayar el flujo.</p>`
    + `<label class="no-print filtro">Trabajo como<select id="perfilTrabajo">${PERFILES.map((x) => `<option ${x === perfil ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></label>`
    + `<p class="muted">El perfil es una función que usted declara. No es una cuenta ni una identidad verificada.</p>`
    + seccion("Me toca", b.paraMi, perfil, "Nada pendiente de su acción en este corte.")
    + seccion("Esperando a la otra parte", b.esperando, perfil, "Nada en espera.")
    + seccion("Cerradas", b.cerradas, perfil, "Aún no hay solicitudes cerradas.");
}

/** Panel de la ficha del caso: botón para solicitar y solicitudes de este caso. */
export function panelSolicitudesCaso(p, fin, perfil) {
  const lista = solicitudesPaciente(p, fin);
  return `<h3>Solicitudes entre profesionales</h3>${lista.length ? lista.map((s) => tarjetaSolicitud(s, perfil, { enlaceCaso: false })).join("") : '<p class="muted">Sin solicitudes en este corte.</p>'}`;
}

export function conectarSolicitudes(alCambiarPerfil) {
  const sel = document.getElementById("perfilTrabajo");
  if (sel) sel.onchange = (ev) => alCambiarPerfil(ev.target.value);
}

export function abrirNuevaSolicitud({ p, fin, reglas, perfil, modal, guardar }) {
  const destino = otro(perfil);
  const senales = evaluarSenales(p, fin, reglas);
  modal("Solicitar valoración",
    `<p><strong>${esc(perfil)} → ${esc(destino)}</strong> · caso ${esc(p.id)}</p>`
    + `<label>Señal vinculada (opcional)<select name="senal"><option value="">Sin señal</option>${senales.map((s) => `<option value="${esc(s.regla)}">${esc(s.regla)} · ${esc(s.texto.slice(0, 70))}</option>`).join("")}</select></label>`
    + `<label>Motivo sintético<textarea name="motivo" maxlength="${MAX_MOTIVO}" rows="3" required></textarea></label>`
    + `<label>Plazo de respuesta<input name="plazo" type="date" min="${esc(fin)}" value="${esc(fin)}" required></label>`
    + `<p class="muted">El perfil de origen es el que usted declara en «Solicitudes». No se notifica a nadie.</p>`,
    (v) => { guardar(construirSolicitud(v, { fin, perfil, destino })); return "Solicitud registrada. Aparece en la bandeja del perfil destinatario."; });
}

export function abrirRespuesta({ s, perfil, fin, modal, guardar }) {
  modal("Responder solicitud",
    `<p><strong>${esc(s.origen)} → ${esc(s.destino)}</strong> · caso ${esc(s.paciente)}</p><p>${esc(s.motivo)}</p>`
    + `<label>Respuesta sintética<textarea name="respuesta" maxlength="${MAX_RESPUESTA}" rows="4" required></textarea></label>`,
    (v) => { guardar(construirPasoSolicitud({ solicitud: s.id, estado: "respondida", perfil, fin, respuesta: v.respuesta })); return "Respuesta registrada. Falta que el perfil de origen cierre la solicitud."; });
}
