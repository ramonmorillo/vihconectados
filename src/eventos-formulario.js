/**
 * Construcción de eventos a partir de los valores de un formulario (actuación A07; docs/ARQUITECTURA.md).
 * Módulo de DOMINIO: funciones puras, sin acceso al navegador. No validan el contenido: lo hace `anexar`
 * (esquemas cerrados y reglas de negocio) al recibir el evento.
 */

/** Corrección de una dispensación vigente: sustituirla o anularla, conservando su identidad de origen. */
export function construirCorreccion(original, v) {
  const sustitucion =
    v.operacion === "anular"
      ? null
      : {
          fecha: v.fecha,
          episodio: v.episodio,
          componente: v.componente,
          dias: Number(v.dias),
          ...(original.id_origen ? { origen: original.origen, id_origen: original.id_origen } : {}),
        };
  return {
    tipo: "correccion_dispensacion",
    referencia: original.referencia,
    motivo: v.motivo,
    sustitucion,
    coincidencia_confirmada: v.coincidencia_confirmada === "on",
  };
}

/** Gestión de una señal: fija la evidencia calculada que se está gestionando y las reglas con las que se calculó. */
export function construirGestionSenal(senal, v, { fin, reglas }) {
  return {
    tipo: "gestion_senal",
    fecha: fin,
    regla: senal.regla,
    evidencia: senal.evidencia,
    estado: v.estado,
    motivo: v.motivo,
    actuacion: v.actuacion,
    reglas: { ...reglas },
  };
}

/** Valoración manual de adherencia: el porcentaje vacío es «sin estimar» (null), distinto de 0. */
export function construirEvaluacionManual(v) {
  return {
    tipo: "evaluacion_adherencia",
    fecha: v.fecha,
    periodo_inicio: v.periodo_inicio,
    periodo_fin: v.periodo_fin,
    metodo: v.metodo,
    resultado: v.resultado,
    porcentaje: v.porcentaje === "" ? null : Number(v.porcentaje),
  };
}

/** Solicitud de valoración entre perfiles (docs/strategy/COMUNICACION_PROFESIONALES.md). El perfil es una función declarada. */
export function construirSolicitud(v, { fin, perfil, destino }) {
  return {
    tipo: "solicitud_valoracion",
    fecha: fin,
    origen: perfil,
    destino,
    motivo: v.motivo,
    plazo: v.plazo,
    senal: v.senal ? v.senal : null,
  };
}

/** Paso del ciclo (recibida, respondida o cerrada). La respuesta solo existe en «respondida». */
export function construirPasoSolicitud({ solicitud, estado, perfil, fin, respuesta }) {
  return {
    tipo: "estado_solicitud",
    fecha: fin,
    solicitud,
    estado,
    perfil,
    ...(estado === "respondida" ? { respuesta } : {}),
  };
}
