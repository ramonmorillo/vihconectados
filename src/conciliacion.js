/**
 * Conciliación y entradas de dispensación (actuación A07; docs/ARQUITECTURA.md).
 * Lógica que antes vivía dentro de los formularios. Módulo de DOMINIO: sin acceso al navegador. La interfaz
 * (revision-datos.js, registro-manual.js) solo pinta lo que este módulo decide.
 */
import { planificarDispensaciones } from "./dispensaciones.js";
import { leerCSV, validarDispensacion, componentes } from "./motor.js";

/**
 * Sesión de conciliación de un formulario: conserva las decisiones del profesional mientras las entradas no
 * cambien. `evaluar` NO escribe nada: devuelve el estado y, si procede, el evento listo para anexar.
 *  - `conflictos`: hay coincidencias sin decidir; no se debe guardar ninguna fila.
 *  - `sin_cambios`: reimportación idéntica ya registrada; no se añaden eventos vacíos.
 *  - `listo`: `evento` es el evento de importación conciliada.
 */
export function crearSesionConciliacion(p) {
  let firma = "",
    resoluciones = {};
  return {
    evaluar(entradas, v, { huella = "", fuente = "Entrada manual" } = {}) {
      const actual = JSON.stringify(entradas);
      if (actual !== firma) {
        firma = actual;
        resoluciones = {};
      } else
        for (const f of entradas) {
          const eleccion = v["decision_" + f.linea];
          if (eleccion) {
            const [accion, referencia] = eleccion.split("|");
            resoluciones[f.linea] = { accion, referencia, motivo: v["motivo_" + f.linea] || "" };
          }
        }
      const plan = planificarDispensaciones(p, entradas, { huella, resoluciones });
      if (plan.conflictos.length)
        return {
          estado: "conflictos",
          conflictos: plan.conflictos,
          mensaje: "Hay coincidencias pendientes. Complete la conciliación y vuelva a guardar; todavía no se ha añadido ninguna fila.",
        };
      if (!plan.filas.length && !plan.decisiones.length)
        return {
          estado: "sin_cambios",
          mensaje: `${0} filas incorporadas; ${plan.duplicadas.length} duplicadas omitidas. Reimportación identificada; no se han añadido duplicados.`,
        };
      return {
        estado: "listo",
        evento: { tipo: "importacion", conciliada: true, fuente, entradas, resoluciones: { ...resoluciones }, huella, ...plan },
        mensaje: `${plan.filas.length} filas incorporadas; ${plan.duplicadas.length} duplicadas omitidas. Conciliación conservada.`,
      };
    },
  };
}

/** Entradas de una dispensación manual a partir de los valores del formulario; las valida antes de guardar nada. */
export function entradasManuales(p, ep, v) {
  const entradas = componentes(ep)
    .map((componente, i) => ({
      fecha: v.fecha,
      episodio: v.episodio,
      componente,
      linea: i + 2,
      dias: v["dias" + i] === "" ? null : Number(v["dias" + i]),
      ...(v["id_origen" + i] || v.origen ? { origen: v.origen, id_origen: v["id_origen" + i] } : {}),
    }))
    .filter((f) => f.dias !== null);
  if (!entradas.length) throw Error("Indique días para al menos un medicamento.");
  entradas.forEach((f) => validarDispensacion(p, f));
  return entradas;
}

/** Interpreta el texto de un CSV con la validación de dominio (esquema cerrado, episodios y fechas). */
export const entradasDesdeCSV = (p, texto) => leerCSV(p, texto);

/** Huella SHA-256 (hexadecimal) del contenido: identifica una reimportación exacta. */
export async function huellaTexto(texto) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}
