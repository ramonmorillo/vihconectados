/**
 * Registro versionado de reglas clínicas (actuación A03; docs/REGISTRO_REGLAS.md).
 * Módulo de datos y funciones puras, sin dependencias: lo importan el motor, los informes y la interfaz.
 *
 * Principios:
 *  - Toda regla del motor tiene ficha: versión, fuente, parámetros con unidades y rangos, estado de validación.
 *  - Una ficha NO se edita para cambiar un parámetro: se cierra (vigente_hasta) y se añade una versión nueva.
 *  - Ninguna ficha puede declarar un estado de validación superior al pendiente sin aprobación documentada.
 *  - Este registro describe el estado real: hoy ninguna regla está validada.
 */
export const ESTADO_PENDIENTE = "Pendiente de validación profesional";
export const ESTADO_MODIFICADO = "Parámetros modificados por el usuario; sin validación";
/** De menor a mayor grado de validación. */
export const ESTADOS_VALIDACION = Object.freeze([
  ESTADO_PENDIENTE,
  "Validación analítica completada",
  "Validación clínica en curso",
  "Validada para el uso definido",
]);
const SIN_FICHA = "Sin ficha de regla; no validada";
const SIN_APROBAR = Object.freeze({ comite: null, revisor_independiente: null, fecha: null, acta: null });
const ORIGEN_PARAMETROS =
  "Parámetros heredados de preparadorconsulta (commit 42402cb, datos/reglas v0.2.0; ver docs/AUDITORIA.md). No existe justificación clínica de su valor en este repositorio [REQUIERE REFERENCIA].";

function congelar(o) {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) congelar(v);
  }
  return o;
}
const ficha = (f) => ({
  vigente_desde: "2026-11-08",
  vigente_hasta: null,
  estado_validacion: ESTADO_PENDIENTE,
  aprobacion: { ...SIN_APROBAR },
  ...f,
});

const DATOS = {
  formato: "vihconectados/registro-reglas@1",
  conjunto: {
    id: "reglas-demo",
    version: "demo-1",
    /** Versión vigente de cada regla que compone este conjunto; debe coincidir con las fichas vigentes. */
    incluye: {
      pdc_oral: "demo-1",
      cobertura_demo: "demo-1",
      datos_fuera_episodio: "demo-1",
      experiencia_referida: "demo-1",
      sin_datos: "demo-1",
      tar_inyectable_no_evaluable: "demo-1",
    },
  },
  reglas: [
    ficha({
      id: "pdc_oral",
      version: "demo-1",
      tipo: "metrica",
      descripcion:
        "Cobertura de dispensación del TAR oral completo (PDC): días de la ventana con TODOS los componentes cubiertos entre los días de la ventana que caen en episodios de TAR oral. Intervalos UTC [inicio, fin); arrastre de sobrante dentro de cada componente y episodio; cada cambio de TAR cierra el episodio anterior.",
      fuente: ORIGEN_PARAMETROS,
      parametros: { ventana: { valor: 180, unidad: "días", min: 1, max: 730 } },
      poblacion: "Casos con al menos un episodio de TAR oral registrado.",
      exclusiones: [
        "Episodios de TAR intramuscular (fuera del numerador y del denominador).",
        "No modelados: ingresos, interrupciones, fallecimiento, pérdidas, farmacia externa, stock inicial y solapamientos de transición.",
      ],
      riesgos: [
        "Falsos positivos por ingreso, suspensión o dispensación en otro centro.",
        "Falsos negativos por acumulación de suministro.",
        "La disponibilidad de medicación no demuestra la toma.",
      ],
    }),
    ficha({
      id: "cobertura_demo",
      version: "demo-1",
      tipo: "senal",
      descripcion:
        "Señal de revisión cuando el PDC (regla pdc_oral) es inferior al umbral demostrativo. No acredita falta de toma.",
      fuente: ORIGEN_PARAMETROS,
      parametros: { umbral: { valor: 0.9, unidad: "proporción 0–1", min: 0, max: 1 } },
      poblacion: "Casos con PDC calculable (días evaluables > 0).",
      exclusiones: ["PDC nulo (sin días evaluables) no genera esta señal.", "Episodios de TAR intramuscular."],
      riesgos: [
        "Umbral único para todas las pautas y regímenes, sin justificación clínica documentada.",
        "Sobrecarga de señales (fatiga de alertas) si el umbral es alto.",
      ],
    }),
    ficha({
      id: "datos_fuera_episodio",
      version: "demo-1",
      tipo: "senal",
      descripcion:
        "Señal de calidad de datos: dispensaciones vigentes anteriores al corte que quedan fuera de su episodio tras un cambio de TAR registrado después. Se conservan y no aportan cobertura.",
      fuente: "Diseño propio de vihconectados (docs/CONFIANZA_DATOS.md). Sin criterio clínico externo.",
      parametros: {},
      poblacion: "Casos con dispensaciones vigentes y más de un episodio o episodio posterior.",
      exclusiones: [],
      riesgos: ["Requiere conciliación profesional; un cambio de TAR mal fechado produce falsas señales de datos."],
    }),
    ficha({
      id: "experiencia_referida",
      version: "demo-1",
      tipo: "senal",
      descripcion:
        "Señal si la última visita aplicable al corte registra una barrera, dificultad o efecto referido distinto de «No explorada/o» o «Sin … referida/os». No intervienen la carga percibida ni la preferencia de seguimiento.",
      fuente:
        "Diseño propio de vihconectados sobre listas cerradas de EXPERIENCIA (src/motor.js). No es un PROM/PREM validado.",
      parametros: {},
      poblacion: "Casos con al menos una visita registrada hasta el corte.",
      exclusiones: ["Visitas posteriores al corte.", "Dominios no explorados no generan señal."],
      riesgos: [
        "Baja sensibilidad: lo no explorado no genera señal.",
        "Vocabulario reducido; no sustituye una entrevista clínica.",
      ],
    }),
    ficha({
      id: "sin_datos",
      version: "demo-1",
      tipo: "senal",
      descripcion:
        "Aviso metodológico: no hay intervalo oral evaluable ni periodos intramusculares; la cobertura no se calcula (PDC nulo, no cero).",
      fuente: "Diseño propio de vihconectados (docs/CONFIANZA_DATOS.md).",
      parametros: {},
      poblacion: "Casos sin TAR registrado, o cuyo TAR empieza en el corte.",
      exclusiones: ["Casos con periodos de TAR intramuscular (regla tar_inyectable_no_evaluable)."],
      riesgos: ["Un aviso metodológico no es una señal asistencial; no debe interpretarse como ausencia de problema."],
    }),
    ficha({
      id: "tar_inyectable_no_evaluable",
      version: "demo-1",
      tipo: "senal",
      descripcion:
        "Episodio de TAR intramuscular: el PDC oral no aplica y no se evalúan asistencia, administración ni ventanas. Se emite como señal pendiente «NO MONITORIZADO» (categoría no_monitorizado) hasta que un profesional la gestiona; la condición se sigue calculando.",
      fuente:
        "Decisión de seguridad de la actuación A06 (docs/strategy/PRIORITIZED_BACKLOG.md, 2026-11-25), tomada por el auditor a falta del comité clínico. A confirmar por el CCR. No detecta administraciones perdidas.",
      parametros: {},
      poblacion: "Casos con episodios de TAR intramuscular registrados.",
      exclusiones: [],
      riesgos: [
        "No detecta administraciones perdidas o retrasadas (requiere la especificación clínica LA-TAR, A13).",
        "Una gestión «cerrada» podría interpretarse como monitorización activa.",
      ],
    }),
  ],
};

export function validarRegistro(reg) {
  if (reg?.formato !== "vihconectados/registro-reglas@1" || !Array.isArray(reg.reglas) || !reg.conjunto)
    throw Error("Registro de reglas no válido.");
  const vistas = new Set();
  for (const f of reg.reglas) {
    const clave = `${f.id}@${f.version}`;
    if (!f.id || !f.version) throw Error("Ficha sin identificador o versión.");
    if (vistas.has(clave)) throw Error(`Ficha duplicada: ${clave}`);
    vistas.add(clave);
    if (!ESTADOS_VALIDACION.includes(f.estado_validacion)) throw Error(`${clave}: estado de validación desconocido.`);
    const ap = f.aprobacion || {};
    if (f.estado_validacion !== ESTADO_PENDIENTE && ["comite", "revisor_independiente", "fecha", "acta"].some((k) => !ap[k]))
      throw Error(`${clave}: estado de validación sin aprobación documentada (comité, revisor independiente, fecha y acta).`);
    for (const [nombre, p] of Object.entries(f.parametros || {}))
      if (!Number.isFinite(p.valor) || p.valor < p.min || p.valor > p.max)
        throw Error(`${clave}: parámetro ${nombre} fuera de rango.`);
  }
  const vigentes = {};
  for (const f of reg.reglas) if (f.vigente_hasta === null) (vigentes[f.id] ||= []).push(f.version);
  for (const id of new Set(reg.reglas.map((f) => f.id)))
    if ((vigentes[id] || []).length !== 1) throw Error(`${id}: debe haber una única versión vigente.`);
  const inc = reg.conjunto.incluye || {};
  const ids = Object.keys(vigentes);
  if (ids.length !== Object.keys(inc).length || ids.some((id) => inc[id] !== vigentes[id][0]))
    throw Error("Conjunto desactualizado: sus versiones deben coincidir con las fichas vigentes.");
  return true;
}

validarRegistro(DATOS);
export const REGISTRO_REGLAS = congelar(DATOS);

const vigente = (registro, id) => registro.reglas.find((f) => f.id === id && f.vigente_hasta === null);
const vigentes = (registro) => registro.reglas.filter((f) => f.vigente_hasta === null);
const peorEstado = (fichas) =>
  ESTADOS_VALIDACION[Math.min(...fichas.map((f) => ESTADOS_VALIDACION.indexOf(f.estado_validacion)))];

/** Ficha de una regla; sin versión devuelve la vigente. */
export function fichaRegla(id, version, registro = REGISTRO_REGLAS) {
  return version === undefined
    ? vigente(registro, id)
    : registro.reglas.find((f) => f.id === id && f.version === version);
}
export function limitesParametros(registro = REGISTRO_REGLAS) {
  const v = vigente(registro, "pdc_oral").parametros.ventana;
  const u = vigente(registro, "cobertura_demo").parametros.umbral;
  return { ventana: { min: v.min, max: v.max }, umbral: { min: u.min, max: u.max } };
}
/**
 * Conjunto de parámetros vigentes con la forma histórica {version, ventana, umbral, validacion}.
 * No debe cambiar de forma: forma parte de la huella de evidencia de las señales gestionadas.
 */
export function reglasPorDefecto(registro = REGISTRO_REGLAS) {
  return Object.freeze({
    version: registro.conjunto.version,
    ventana: vigente(registro, "pdc_oral").parametros.ventana.valor,
    umbral: vigente(registro, "cobertura_demo").parametros.umbral.valor,
    validacion: peorEstado(vigentes(registro)),
  });
}
/**
 * Parámetros elegidos por el usuario. Iguales a los vigentes: el conjunto vigente. Distintos: una versión
 * nueva y determinista (no depende del reloj) y un estado que declara que no están validados.
 */
export function reglasConParametros(ventana, umbral, registro = REGISTRO_REGLAS) {
  const base = reglasPorDefecto(registro), lim = limitesParametros(registro);
  if (
    !Number.isInteger(ventana) || ventana < lim.ventana.min || ventana > lim.ventana.max ||
    !Number.isFinite(umbral) || umbral < lim.umbral.min || umbral > lim.umbral.max
  )
    throw Error("Parámetros fuera de rango");
  if (ventana === base.ventana && umbral === base.umbral) return base;
  return Object.freeze({
    version: `${base.version}+mod(ventana=${ventana};umbral=${umbral})`,
    ventana,
    umbral,
    validacion: ESTADO_MODIFICADO,
  });
}
const modificada = (f, r) => r?.validacion === ESTADO_MODIFICADO && Object.keys(f.parametros).length > 0;
/** Estado de validación efectivo de una regla para unos parámetros dados. */
export function estadoValidacionRegla(id, r = reglasPorDefecto(), registro = REGISTRO_REGLAS) {
  const f = fichaRegla(id, undefined, registro);
  if (!f) return SIN_FICHA;
  return modificada(f, r) ? ESTADO_MODIFICADO : f.estado_validacion;
}
/** Instantánea (copias) de las reglas vigentes aplicadas, para fijarla en un informe. */
export function fichasAplicadas(r = reglasPorDefecto(), registro = REGISTRO_REGLAS) {
  return structuredClone(
    vigentes(registro).map((f) => ({
      id: f.id,
      version: f.version,
      tipo: f.tipo,
      estado_validacion: modificada(f, r) ? ESTADO_MODIFICADO : f.estado_validacion,
      parametros_modificados: modificada(f, r),
    })),
  );
}
