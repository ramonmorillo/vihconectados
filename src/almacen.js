import { validarConsulta, validarSeguimiento, contextoConsulta } from "./consulta.js";
import { fechaEfectiva } from "./temporal.js";
import { historialDispensaciones, planificarDispensaciones, mismaClave } from "./dispensaciones.js";
import { validarGestionSenal } from "./senales.js";
import { validarEvaluacionAdherencia } from "./adherencia.js";
import { validarMedicamentos } from "./cima.js";
import {
  CATALOGOS,
  EXPERIENCIA,
  fecha,
  episodios,
  ESTADOS,
  estadoComunicacion,
  transicion,
  prepararDispensacionManual,
  validarDispensacion,
  REGLAS,
} from "./motor.js";
const copia = (x) => structuredClone(x);
export const vacio = () => ({ formato: "vihconectados/demo@1", pacientes: [] });
export function crearPaciente(db, nivel = "3", fechaNivel) {
  if (fechaNivel) fecha(fechaNivel);
  if (!["1", "2", "3"].includes(nivel)) throw Error("Nivel CMO inválido");
  const n = db.pacientes.length + 1,
    id = `DEMO-${String(n).padStart(3, "0")}`;
  return {
    ...copia(db),
    pacientes: [
      ...copia(db.pacientes),
      {
        id,
        sintetico: true,
        eventos: [
          {
            id: crypto.randomUUID(),
            tipo: "nivel",
            ...(fechaNivel ? {fecha:fechaNivel} : {}),
            nivel,
            registrado: new Date().toISOString(),
          },
        ],
      },
    ],
  };
}
/** Puerto de repositorio: leer() y guardar(db). Un backend futuro debe validar y autorizar cada comando. */
export class RepositorioDemo {
  constructor(storage) {
    this.storage = storage;
    this.key = "vihconectados.demo.v1";
  }
  leer() {
    const raw = this.storage.getItem(this.key);
    if (!raw) return vacio();
    const db = JSON.parse(raw);
    if (db.formato !== "vihconectados/demo@1" || !Array.isArray(db.pacientes))
      throw Error("Almacenamiento incompatible");
    return copia(db);
  }
  guardar(db) {
    this.storage.setItem(this.key, JSON.stringify(db));
  }
}
export function anexar(db, id, evento) {
  const next = copia(db),
    p = next.pacientes.find((p) => p.id === id);
  if (!p) throw Error("Caso inexistente");
  const e = copia(evento);
  if (e.fecha) fecha(e.fecha);
  if (e.tipo === "tratamiento") {
    if (e.tar !== "CIMA" && e.modalidad && e.modalidad !== "oral") throw Error("La modalidad intramuscular requiere medicamentos seleccionados desde CIMA.");
    if (
      (!CATALOGOS[e.tar] && e.tar !== "CIMA") ||
      !e.fecha ||
      episodios(p).some((x) => x.fecha >= e.fecha)
    )
      throw Error("Añada el TAR después del último inicio registrado");
    if (e.tar === "CIMA") {
      validarMedicamentos(e.medicamentos, e.modalidad || "oral");
      if (e.confirmado !== true)
        throw Error("Confirme la revisión del TAR completo.");
    }
  } else if (e.tipo === "visita") {
    if (
      !e.fecha ||
      Object.entries(EXPERIENCIA).some(
        ([k, v]) => !v.includes(e.experiencia?.[k]),
      )
    )
      throw Error("Experiencia no válida");
    if (p.eventos.some((x) => x.tipo === "visita" && x.fecha > e.fecha))
      throw Error("Fecha anterior a la última visita");
  } else if (e.tipo === "consulta") {
    validarConsulta(p,e);
    e.objetivo=e.objetivo.trim();
    e.contexto=contextoConsulta(p,e.fecha,e.reglas || REGLAS);
  } else if (e.tipo === "seguimiento_consulta") {
    validarSeguimiento(p,e);
    e.observaciones=e.observaciones.trim();
  } else if (e.tipo === "gestion_senal") {
    if (!e.fecha) throw Error("Indique fecha efectiva de gestión.");
    validarGestionSenal(p,e,e.reglas || REGLAS);
    e.motivo=e.motivo.trim();
  } else if (e.tipo === "correccion_dispensacion") {
    const original=historialDispensaciones(p).find(f=>f.referencia===e.referencia);
    if (!original || original.estado!=="vigente") throw Error("Solo se puede corregir una dispensación vigente.");
    if (typeof e.motivo!=="string" || !e.motivo.trim() || e.motivo.length>300) throw Error("Indique motivo sintético (1–300 caracteres).");
    e.motivo=e.motivo.trim();
    e.fecha=original.fecha;
    e.fecha_original=original.fecha;
    if (e.sustitucion) {
      validarDispensacion(p,e.sustitucion);
      if (e.sustitucion.fecha<e.fecha) e.fecha=e.sustitucion.fecha;
      const otras=historialDispensaciones(p).filter(f=>f.estado==='vigente' && f.referencia!==e.referencia);
      if (otras.some(f=>e.sustitucion.id_origen && f.origen===e.sustitucion.origen && f.id_origen===e.sustitucion.id_origen)) throw Error("Identificador de origen ya usado por otra dispensación.");
      if (otras.some(f=>mismaClave(f,e.sustitucion)) && e.coincidencia_confirmada!==true) throw Error("La sustitución coincide con otra dispensación. Confirme explícitamente que son independientes.");
      if ((e.sustitucion.origen || '')!==(original.origen || '') || (e.sustitucion.id_origen || '')!==(original.id_origen || '')) throw Error("La corrección debe conservar la identidad de origen.");
    } else e.sustitucion=null;
  } else if (e.tipo === "importacion" && e.conciliada === true) {
    if (!Array.isArray(e.entradas) || !e.entradas.length || e.entradas.length>1000) throw Error("Entrada de dispensaciones no válida.");
    if (new Set(e.entradas.map(f=>f.linea)).size!==e.entradas.length || e.entradas.some(f=>!Number.isInteger(f.linea) || f.linea<2 || f.linea>1001)) throw Error("Las filas deben tener referencias de línea únicas y válidas.");
    e.entradas.forEach(f=>validarDispensacion(p,f));
    const plan=planificarDispensaciones(p,e.entradas,{resoluciones:e.resoluciones,huella:e.huella});
    if (plan.conflictos.length) throw Error("Hay dispensaciones pendientes de conciliación.");
    e.filas=plan.filas;e.duplicadas=plan.duplicadas;e.decisiones=plan.decisiones;
    e.reimportacion=plan.reimportacion || null;
    // Un evento de conciliación puede no añadir suministro, pero conserva las decisiones.
    if (!e.filas.length && !e.decisiones.length) throw Error("Reimportación ya registrada; no se añaden eventos vacíos.");
  } else if (e.tipo === "evaluacion_adherencia") {
    validarEvaluacionAdherencia(e);
  } else if (e.tipo === "importacion" && e.fuente === "Entrada manual") {
    const filas = e.filas || [];
    if (!filas.length || filas.some(f => f.fecha !== filas[0].fecha || f.episodio !== filas[0].episodio))
      throw Error("Registro manual vacío o incompatible.");
    const validado = prepararDispensacionManual(p, { fecha: filas[0].fecha, episodio: filas[0].episodio, suministros: filas });
    if (!validado.filas.length) throw Error("La dispensación ya está registrada; no se añade un duplicado.");
    e.filas = validado.filas;
    e.duplicadas = (e.duplicadas || []).filter(n => Number.isInteger(n) && n >= 2);
    e.fecha = filas[0].fecha;
  } else if (e.tipo === "nivel") {
    if (!["1", "2", "3"].includes(e.nivel)) throw Error("Nivel inválido");
  } else if (e.tipo === "actuacion") {
    if (!e.texto || !["pendiente", "realizada"].includes(e.estado))
      throw Error("Actuación no válida");
  } else if (e.tipo === "estado_actuacion") {
    const original=p.eventos.find(x=>x.id===e.actuacion && x.tipo==='actuacion');
    if (e.fecha && original && fechaEfectiva(original) && e.fecha<fechaEfectiva(original)) throw Error("El estado no puede ser anterior a la actuación.");
    if (
      !p.eventos.some((x) => x.id === e.actuacion && x.tipo === "actuacion") ||
      e.estado !== "realizada"
    )
      throw Error("Actuación inexistente");
  } else if (e.tipo === "estado_comunicacion") {
    const antecedentes=p.eventos.filter(x=>(x.tipo==='informe' && x.id===e.informe) || (x.tipo==='estado_comunicacion' && x.informe===e.informe));
    if (e.fecha && antecedentes.some(x=>fechaEfectiva(x) && e.fecha<fechaEfectiva(x))) throw Error("La transición no puede ser anterior al informe ni al último estado conocido.");
    if (!p.eventos.some((x) => x.id === e.informe && x.tipo === "informe"))
      throw Error("Informe inexistente");
    transicion(estadoComunicacion(p, e.informe), e.estado);
  } else if (
    ![
      "importacion",
      "informe",
      "informe_paciente",
      "revision_alertas",
      "configuracion",
    ].includes(e.tipo)
  )
    throw Error("Tipo de evento desconocido");
  e.id = crypto.randomUUID();
  e.registrado = new Date().toISOString();
  p.eventos.push(e);
  return next;
}
