/**
 * Comandos de escritura (actuación A07; docs/ARQUITECTURA.md).
 *
 * El puerto de repositorio ya no recibe «la base completa»: recibe una intención («anexar este evento a este
 * caso») y la aplica sobre el estado actual. Cada comando tiene un esquema cerrado y se aplica de forma pura:
 * si algo falla, no se escribe nada. Un servidor futuro implementará el mismo contrato; este módulo es la parte
 * que debe ejecutar igual en cliente y servidor. Módulo de DOMINIO: sin acceso al navegador.
 */
import { anexar, crearPaciente } from "./almacen.js";
import { demo, crearCasoEscenario, incorporarCohorte } from "./demo.js";
import { registrarConsulta, registrarSeguimiento } from "./comandos-consulta.js";

const O = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const S = (v) => typeof v === "string" && v.length > 0;
const S0 = (v) => v === null || typeof v === "string";

/** `requeridos`: campos obligatorios. Cualquier otro campo se rechaza. */
const COMANDOS = Object.freeze({
  sembrar_demo: { campos: {}, requeridos: [] },
  crear_caso: { campos: { nivel: S0, fecha_nivel: S }, requeridos: [] },
  crear_caso_escenario: { campos: { escenario: S }, requeridos: ["escenario"] },
  actualizar_cohorte: { campos: {}, requeridos: [] },
  anexar_evento: { campos: { paciente: S, evento: O }, requeridos: ["paciente", "evento"] },
  registrar_consulta: { campos: { paciente: S, datos: O, reglas: O }, requeridos: ["paciente", "datos", "reglas"] },
  registrar_seguimiento: { campos: { paciente: S, datos: O }, requeridos: ["paciente", "datos"] },
});
export const TIPOS_COMANDO = Object.freeze(Object.keys(COMANDOS));

/** Valida la forma de un comando. Los valores los validan las reglas de dominio al aplicarlo. */
export function validarComando(c) {
  if (!O(c)) throw Error("Comando no válido");
  if (!Object.hasOwn(COMANDOS, c.tipo)) throw Error("Comando desconocido");
  const esq = COMANDOS[c.tipo];
  const presentes = Object.keys(c).filter((k) => k !== "tipo" && c[k] !== undefined);
  for (const k of presentes) if (!(k in esq.campos)) throw Error(`Campo no permitido en comando ${c.tipo}: ${k}`);
  for (const k of esq.requeridos) if (c[k] === undefined) throw Error(`Falta ${k} en comando ${c.tipo}`);
  for (const k of presentes) if (esq.campos[k](c[k]) !== true) throw Error(`comando.${c.tipo}.${k} no válido`);
  return true;
}

const ultimo = (db, id) => db.pacientes.find((p) => p.id === id).eventos.at(-1).id;

/**
 * Aplica un comando sobre una base y devuelve `{db, resultado}` sin modificar la recibida. Lanza si el comando o
 * su contenido no son válidos: el llamador no debe persistir nada en ese caso.
 */
export function aplicarComando(db, c) {
  validarComando(c);
  switch (c.tipo) {
    case "sembrar_demo":
      return db.pacientes.length ? { db, resultado: { sembrado: false } } : { db: demo(), resultado: { sembrado: true } };
    case "crear_caso": {
      const next = crearPaciente(db, c.nivel ?? null, c.fecha_nivel);
      return { db: next, resultado: { paciente: next.pacientes.at(-1).id } };
    }
    case "crear_caso_escenario": {
      const next = crearCasoEscenario(db, c.escenario);
      return { db: next, resultado: { paciente: next.pacientes.at(-1).id } };
    }
    case "actualizar_cohorte": {
      const next = incorporarCohorte(db);
      return { db: next, resultado: { anadidos: next.pacientes.length - db.pacientes.length } };
    }
    case "anexar_evento": {
      const next = anexar(db, c.paciente, c.evento);
      return { db: next, resultado: { paciente: c.paciente, evento: ultimo(next, c.paciente) } };
    }
    case "registrar_consulta": {
      const next = registrarConsulta(db, c.paciente, c.datos, c.reglas);
      return { db: next, resultado: { paciente: c.paciente, evento: ultimo(next, c.paciente) } };
    }
    case "registrar_seguimiento": {
      const next = registrarSeguimiento(db, c.paciente, c.datos);
      return { db: next, resultado: { paciente: c.paciente, evento: ultimo(next, c.paciente) } };
    }
  }
}
