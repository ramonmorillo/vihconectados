import { resumenInforme, ETIQUETAS } from "./informes.js";
import { nombreTar } from "./motor.js";
import { ADHEFAR } from "./recursos.js";
export const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const dia = (s) =>
  s
    ? new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(s + "T12:00:00Z"))
    : "Pendiente de acordar";
function medicacion(ep) {
  if (!ep)
    return '<p class="doc-empty">No se ha registrado un TAR para esta fecha. Debe confirmarse con el equipo asistencial.</p>';
  if (!ep.medicamentos?.length)
    return `<p>${esc(nombreTar(ep))} <span class="doc-subtle">· etiqueta ficticia de demostración</span></p>`;
  return `<div class="doc-medicamentos">${ep.medicamentos.map((m) => `<div class="doc-medicamento"><strong>${esc(m.nombre)}</strong><p>${esc(m.principios)}</p><p class="doc-subtle">${esc(m.presentacion)} · CN ${esc(m.cn)} · CIMA ${esc(m.nregistro)}</p></div>`).join("")}</div>`;
}
function cabecera(i, paciente) {
  return `<div class="doc-top"><div class="doc-logo">vih<span>conectados</span><small>FARMACIA HOSPITALARIA · CONTINUIDAD ASISTENCIAL</small></div><span class="doc-type">${paciente ? "HOJA PERSONAL DE APOYO" : "INFORME DE SEGUIMIENTO"}</span></div><div class="doc-demo">SIMULACIÓN · CASO FICTICIO · NO VÁLIDO COMO PRESCRIPCIÓN</div><div class="doc-title"><p>${paciente ? "ACUERDOS E INSTRUCCIONES" : "FARMACIA → INFECCIOSAS"}</p><h1>${paciente ? "Tu plan, paso a paso" : "Seguimiento farmacoterapéutico"}</h1><div>${paciente ? "Lo que hemos acordado para acompañarte hasta la próxima visita." : "Síntesis de cobertura, experiencia y actuaciones para valoración compartida."}</div></div><div class="doc-meta"><div><span>CASO DE DEMOSTRACIÓN</span><strong>${esc(i.paciente)}</strong></div><div><span>FECHA DE ${paciente ? "LA HOJA" : "CORTE"}</span><strong>${dia(i.fecha)}</strong></div><div><span>${paciente ? "PRÓXIMA CITA" : "NIVEL CMO ASIGNADO"}</span><strong>${paciente ? dia(i.plan?.proxima_cita) : "Nivel " + esc(i.nivel)}</strong></div></div>`;
}
function pie(i) {
  return `<div class="doc-footer"><div><strong>Dr. Ramón Morillo Verdugo</strong><br>Autor de vihconectados<br>Modelo CMO-MAPEX · Adaptaciones CMO: SEFH</div><div>vihconectados ${esc(i.version)}<br>Documento ${esc(i.id || "Vista previa")}<br>Datos sintéticos · Uso demostrativo</div></div>`;
}
export function vistaInforme(i) {
  const s = resumenInforme(i),
    c = i.cobertura,
    paciente = i.tipo === "informe_paciente";
  if (paciente)
    return `<article class="documento documento-paciente">${cabecera(i, true)}<section class="doc-section"><h2><span>01</span> Tu medicación registrada</h2>${medicacion(s.tratamiento)}<p class="doc-subtle">Listado de referencia. Sigue únicamente la pauta confirmada por tu equipo. Esta hoja no cambia ni prescribe tu tratamiento.</p></section><section class="doc-section"><h2><span>02</span> Lo que hemos acordado</h2><div class="doc-instrucciones">${esc(i.plan.instrucciones)}</div><p class="doc-subtle">Instrucciones redactadas y revisadas por el profesional en este caso sintético. No se generan automáticamente a partir de CIMA.</p></section><section class="doc-section doc-next"><h2><span>03</span> Tu siguiente paso</h2><p><strong>Próxima cita:</strong> ${dia(i.plan.proxima_cita)}</p><p>Si tienes dudas sobre las instrucciones, coméntalas con tu equipo de Farmacia. No cambies ni suspendas tu tratamiento por lo que aparezca en esta demostración.</p></section>${i.plan.incluir_recurso ? `<section class="doc-section doc-resource"><h2>Un recurso para acompañarte</h2><p><strong>${ADHEFAR.nombre}</strong> · Espacio para pacientes y cuidadores.</p><a href="${ADHEFAR.pacientes}" target="_blank" rel="noopener noreferrer">${ADHEFAR.pacientes}</a><p class="doc-subtle">Material complementario; revísalo con tu equipo. No sustituye tus instrucciones individuales.</p></section>` : ""}${pie(i)}</article>`;
  return `<article class="documento">${cabecera(i, false)}<div class="doc-summary"><div class="doc-kpi"><span>COBERTURA DE DISPENSACIÓN</span><strong>${c.pdc === null ? "—" : (c.pdc * 100).toFixed(1).replace(".", ",") + " %"}</strong><p>${c.cubiertos} días cubiertos / ${c.total} días evaluables</p></div><div><strong>Lectura profesional</strong><p>${c.pdc === null ? "Sin intervalo evaluable." : `Periodo desde ${dia(c.inicio)} hasta ${dia(c.fin_exclusivo)} (final excluido).`}</p><p>Disponibilidad teórica registrada; no demuestra toma ni permite valorar control virológico.</p></div></div><section class="doc-section"><h2><span>01</span> Tratamiento y continuidad</h2>${medicacion(s.tratamiento)}${c.detalle.length > 1 ? `<table class="doc-table"><thead><tr><th>Episodio</th><th>Periodo [inicio, fin)</th><th>Cobertura</th></tr></thead><tbody>${c.detalle.map((d) => `<tr><td>${esc(d.tar)}</td><td>${esc(d.inicio)} → ${esc(d.fin_exclusivo)}</td><td>${d.cubiertos}/${d.total} días</td></tr>`).join("")}</tbody></table>` : ""}</section><section class="doc-section"><h2><span>02</span> Señales para valoración</h2>${i.alertas.length ? i.alertas.map((a) => `<div class="doc-signal"><p>${esc(a.texto)}</p><small>${esc(a.estado)} · ${esc(a.regla)} · ${esc(a.version)}</small></div>`).join("") : "<p>Sin señales con estos parámetros. Esto no excluye problemas clínicos.</p>"}</section><section class="doc-section"><h2><span>03</span> Experiencia y actuaciones</h2>${
    s.visita
      ? `<p class="doc-subtle">Experiencia registrada el ${dia(s.visita.fecha)}</p><dl class="doc-experiencia">${Object.entries(
          s.visita.experiencia,
        )
          .map(
            ([k, v]) =>
              `<div><dt>${esc(ETIQUETAS[k] || k)}</dt><dd>${esc(v)}</dd></div>`,
          )
          .join("")}</dl>`
      : "<p>No hay una experiencia registrada para esta fecha.</p>"
  }${s.actuaciones.length ? `<ul class="doc-list">${s.actuaciones.map((a) => `<li><span class="doc-status">${esc(a.estado)}</span>${esc(a.texto)}</li>`).join("")}</ul>` : "<p>No hay actuaciones registradas.</p>"}</section><section class="doc-section"><h2><span>04</span> Revisión y comunicación</h2>${s.revisiones.length ? s.revisiones.map((r) => `<p>${dia(r.fecha)} · ${esc(r.resultado)}</p>`).join("") : "<p>Revisión profesional simulada pendiente. Las señales no se han confirmado clínicamente.</p>"}<p>Documento para ${esc(i.destino)}. Su generación no acredita envío, recepción ni resolución.</p></section><div class="doc-method"><strong>Método y límites</strong><p>Reglas ${esc(c.reglas.version)} · Ventana ${c.reglas.ventana} días · Parámetro demostrativo ${Math.round(c.reglas.umbral * 100)} %. Criterios pendientes de validación clínica. Intersección del TAR completo; sin arrastre entre episodios. Las fuentes CIMA son una instantánea del catálogo, no una validación del régimen.</p><p>Informe fijo: los registros posteriores no alteran su contenido. Trazabilidad completa disponible en la exportación JSON.</p></div>${pie(i)}</article>`;
}
