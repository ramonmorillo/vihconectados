import { VERSION, REGLAS, cobertura, alertas, nivel } from "./motor.js";
export function informe(p, fin, r = REGLAS) {
  return structuredClone({
    tipo: "informe",
    fecha: fin,
    formato: "vihconectados/informe@1",
    version: VERSION,
    aviso: "SIMULACIÓN · Datos sintéticos · No validado para uso clínico",
    autor: "Dr. Ramón Morillo Verdugo",
    destino: "Infecciosas (simulado)",
    paciente: p.id,
    nivel: nivel(p),
    cobertura: cobertura(p, fin, r),
    alertas: alertas(p, fin, r),
    informes_previos: p.eventos
      .filter((e) => e.tipo === "informe")
      .map((e) => e.id),
    eventos: p.eventos.filter((e) => e.tipo !== "informe"),
  });
}
export function textoInforme(i) {
  return [
    i.aviso,
    `vihconectados · ${i.paciente} · ${i.fecha}`,
    `Autor: ${i.autor}`,
    `Destino: ${i.destino}`,
    `CMO ${i.nivel}`,
    `Cobertura: ${i.cobertura.cubiertos}/${i.cobertura.total} días`,
    ...i.alertas.map((a) => `${a.texto} (${a.estado})`),
    "Registro y trazabilidad:",
    JSON.stringify(i.eventos, null, 2),
  ].join("\n");
}
