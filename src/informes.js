import { consultasHasta, textoPlan } from "./consulta.js";
import { nivelHasta, eventosHasta, tratamientoHasta, ultimoEvento, aplicable } from "./temporal.js";
import { evaluarSenales } from "./senales.js";
import { ultimaEvaluacionAdherencia, textoEvaluacionAdherencia } from "./adherencia.js";
import {
  VERSION,
  REGLAS,
  cobertura,
  alertas,
  nivel,
  episodios,
  nombreTar,
  fecha,
} from "./motor.js";
import { ADHEFAR } from "./recursos.js";
const esInforme = (e) => ["informe", "informe_paciente"].includes(e.tipo);
export function informe(p, fin, r = REGLAS) {
  return structuredClone({
    tipo: "informe",
    temporal: "efectiva-v1",
    fecha: fin,
    formato: "vihconectados/informe@1",
    version: VERSION,
    aviso: "SIMULACIÓN · Datos sintéticos · No validado para uso clínico",
    autor: "Dr. Ramón Morillo Verdugo",
    destino: "Infecciosas (simulado)",
    paciente: p.id,
    nivel: nivelHasta(p,fin) || "Sin dato",
    cobertura: cobertura(p, fin, r),
    alertas: evaluarSenales(p, fin, r),
    informes_previos: p.eventos.filter(e=>esInforme(e) && aplicable(e,fin)).map((e) => e.id),
    eventos: p.eventos.filter((e) => !esInforme(e)),
  });
}
/** Hoja opcional. Nunca deduce instrucciones clínicas a partir de CIMA o de una señal. */
export function informePaciente(
  p,
  fin,
  {
    instrucciones,
    proxima_cita = "",
    incluir_recurso = false,
    revisado = false,
  },
  r = REGLAS,
) {
  const texto = String(instrucciones || "").trim();
  if (!texto || texto.length > 2000)
    throw Error(
      "Escriba instrucciones sintéticas revisadas (1–2000 caracteres).",
    );
  if (!revisado)
    throw Error(
      "Confirme que ha revisado las instrucciones y que son sintéticas.",
    );
  fecha(fin);
  if (proxima_cita && fecha(proxima_cita) < fecha(fin))
    throw Error("La próxima cita no puede ser anterior a la hoja.");
  const base = informe(p, fin, r);
  return {
    ...base,
    tipo: "informe_paciente",
    formato: "vihconectados/informe-paciente@1",
    destino: "Paciente (hoja de demostración)",
    plan: {
      instrucciones: texto,
      proxima_cita,
      incluir_recurso: !!incluir_recurso,
      revisado: true,
    },
    recurso: incluir_recurso ? { ...ADHEFAR } : null,
  };
}
export function resumenInforme(i) {
  const eventos = i.eventos || [],
    p = { eventos };
  const q = i.temporal === "efectiva-v1" ? {...p,eventos:eventosHasta(p,i.fecha)} : p;
  const tratamiento = episodios(q)
    .filter((e) => e.fecha <= i.fecha)
    .at(-1);
  const visita = q.eventos
    .filter((e) => e.tipo === "visita" && e.fecha <= i.fecha)
    .at(-1);
  const actuaciones = q.eventos
    .filter((e) => e.tipo === "actuacion" && (!e.fecha || e.fecha <= i.fecha))
    .map((a) => ({
      ...a,
      estado: q.eventos.some(
        (e) => e.tipo === "estado_actuacion" && e.actuacion === a.id,
      )
        ? "realizada"
        : a.estado,
    }));
  return {
    tratamiento,
    consultas: consultasHasta(p,i.fecha),
    evaluacion_adherencia: ultimaEvaluacionAdherencia(p, i.fecha),
    visita,
    actuaciones,
    revisiones: q.eventos.filter(
      (e) => e.tipo === "revision_alertas" && e.fecha <= i.fecha,
    ),
  };
}
export const ETIQUETAS = {
  barrera: "Barreras",
  dificultad: "Dificultad de toma",
  efecto: "Efectos adversos referidos",
  carga: "Carga terapéutica percibida",
  preferencia: "Preferencia de seguimiento",
};
/** Texto de comunicación legible para copiar, sin volcado técnico ni inferencias clínicas. */
export function textoInforme(i) {
  const s = resumenInforme(i),
    c = i.cobertura;
  return [
    i.aviso,
    `ATENCIÓN FARMACÉUTICA · ${i.paciente} · ${i.fecha}`,
    `Autor de la herramienta: ${i.autor}`,
    `Destino: ${i.destino}`,
    `Nivel CMO asignado: ${i.nivel}`,
    `TAR registrado a fecha de corte: ${nombreTar(s.tratamiento)}`,
    ...(s.tratamiento?.medicamentos || []).map(
      (m) =>
        `- ${m.nombre} · ${m.presentacion} · CN ${m.cn} · CIMA ${m.nregistro} (consulta ${m.consultado})`,
    ),
    `Cobertura registrada: ${c.total ? `${c.cubiertos}/${c.total} días (${(c.pdc * 100).toFixed(1).replace(".", ",")} %)` : "Sin intervalo evaluable"}. Periodo [${c.inicio}, ${c.fin_exclusivo}).`,
    "La disponibilidad calculada no demuestra toma ni permite valorar control virológico.",
    "SEÑALES PARA VALORACIÓN PROFESIONAL",
    ...i.alertas.map(
      (a) =>
        `- ${a.texto} (${a.estado}; regla ${a.regla}, versión ${a.version}${a.estado_gestion ? `; gestión ${a.estado_gestion}; ${a.categoria}` : ""})`,
    ),
    ...(!i.alertas.length
      ? [
          "Sin señales con los parámetros de esta evaluación; no excluye problemas.",
        ]
      : []),
    ...((c.excluidos || []).length ? ["TAR intramuscular: periodos excluidos del PDC oral. Sin evaluación de administración ni ventanas de inyección.", ...c.excluidos.map(e => `- ${e.inicio} → ${e.fin_exclusivo}: ${e.motivo}`)] : []),
    "VALORACIÓN MANUAL DE ADHERENCIA",
    textoEvaluacionAdherencia(s.evaluacion_adherencia),
    "EXPERIENCIA REGISTRADA",
    ...(s.visita
      ? Object.entries(s.visita.experiencia).map(
          ([k, v]) => `- ${ETIQUETAS[k] || k}: ${v}`,
        )
      : ["No explorada en registros disponibles."]),
    ...(s.consultas.length ? ["PLANES Y SEGUIMIENTO",...s.consultas.map(textoPlan)] : []),
    "ACTUACIONES",
    ...(s.actuaciones.length
      ? s.actuaciones.map((a) => `- [${a.estado}] ${a.texto}`)
      : ["Sin actuaciones registradas."]),
    "REVISIÓN",
    ...(s.revisiones.length
      ? s.revisiones.map((e) => `- ${e.fecha}: ${e.resultado}`)
      : ["Pendiente de revisión profesional simulada."]),
    ...(i.plan
      ? [
          "INSTRUCCIONES REVISADAS PARA LA HOJA DEL PACIENTE",
          i.plan.instrucciones,
          i.plan.proxima_cita
            ? `Próxima cita: ${i.plan.proxima_cita}`
            : "Próxima cita: pendiente de acordar.",
        ]
      : []),
    `Reglas: ${c.reglas.version} · Ventana ${c.reglas.ventana} días · Parámetro demostrativo ${Math.round(c.reglas.umbral * 100)} % · Pendiente de validación clínica.`,
    `Registro de informe: ${i.id || "Vista previa"} · Aplicación ${i.version}`,
  ].join("\n");
}
