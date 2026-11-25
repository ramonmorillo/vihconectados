/**
 * Selección de los medicamentos de un TAR desde fichas de CIMA (actuación A07; docs/ARQUITECTURA.md).
 * Módulo de DOMINIO: estado y reglas de la selección, sin acceso al navegador ni a la red. La búsqueda en CIMA
 * está en cima.js; la interfaz (medicacion.js) solo pinta la lista y los mensajes.
 */
import { modalidadTar } from "./cima.js";

export const MAX_MEDICAMENTOS = 8;

export function crearSeleccionTar() {
  const seleccion = [];
  return {
    lista: () => [...seleccion],
    /** Añade la presentación elegida de una ficha. No lanza: devuelve `{ok, mensaje}` para mostrarlo. */
    anadir(ficha, indicePresentacion) {
      if (seleccion.some((m) => m.nregistro === ficha.nregistro)) return { ok: false, mensaje: "Ese medicamento ya está seleccionado." };
      if (seleccion.length >= MAX_MEDICAMENTOS) return { ok: false, mensaje: `Máximo ${MAX_MEDICAMENTOS} medicamentos por episodio.` };
      const presentacion = ficha.presentaciones?.[indicePresentacion];
      if (!presentacion) return { ok: false, mensaje: "Seleccione una presentación comercializada." };
      const { presentaciones, ...resto } = ficha;
      const nuevo = { ...resto, cn: presentacion.cn, presentacion: presentacion.nombre };
      try {
        modalidadTar([...seleccion, nuevo]);
      } catch (e) {
        return { ok: false, mensaje: e.message };
      }
      seleccion.push(nuevo);
      return { ok: true, mensaje: "Medicamento añadido. Puede buscar otro o confirmar el TAR completo." };
    },
    quitar(i) {
      seleccion.splice(i, 1);
    },
    /** Evento de tratamiento con la selección completa; su validez la comprueba `anexar`. */
    eventoTratamiento({ fecha, confirmado }) {
      if (!seleccion.length) throw Error("Añada al menos un medicamento desde CIMA.");
      return { tipo: "tratamiento", fecha, tar: "CIMA", medicamentos: [...seleccion], modalidad: modalidadTar(seleccion), confirmado };
    },
  };
}
