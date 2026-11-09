import { vacio, crearPaciente, anexar } from "./almacen.js";
import { importarCSV, fecha, iso, alertas, REGLAS } from "./motor.js";
import { informe } from "./informes.js";
export const VERSION_COHORTE = "cohorte-2026-11-v2";
export const ESCENARIOS = Object.freeze([
  {
    id: "acceso",
    titulo: "Barreras de acceso y recogidas",
    descripcion:
      "Nivel 1 asignado en simulación. Huecos de cobertura, dos visitas y coordinación pendiente.",
    nivel: "1",
  },
  {
    id: "cambio",
    titulo: "Cambio de TAR y coordinación",
    descripcion:
      "Nivel 2 asignado en simulación. Dos episodios independientes y comunicación valorada.",
    nivel: "2",
  },
  {
    id: "continuidad",
    titulo: "Continuidad con varios componentes",
    descripcion:
      "Nivel 3 asignado en simulación. Cobertura simultánea de C y D y actuaciones realizadas.",
    nivel: "3",
  },
]);
const experiencia = (overrides = {}) => ({
  barrera: "Sin barreras referidas",
  dificultad: "Sin dificultad referida",
  efecto: "Sin efectos referidos",
  carga: "Baja",
  preferencia: "Consulta presencial",
  ...overrides,
});
/** Añade un caso nuevo, sin reescribir ninguno existente. Los catálogos A/B/C/D son ficticios. */
export function crearCasoEscenario(db, clave) {
  const escenario = ESCENARIOS.find((e) => e.id === clave);
  if (!escenario) throw Error("Escenario sintético desconocido");
  let next = crearPaciente(db, escenario.nivel, "2026-05-01"),
    id = next.pacientes.at(-1).id;
  next.pacientes.at(-1).escenario = { ...escenario, version: VERSION_COHORTE };
  const add = (e) => {
    next = anexar(next, id, e);
  };
  const p = () => next.pacientes.find((p) => p.id === id);
  const tar = (f, t) => {
    add({ tipo: "tratamiento", fecha: f, tar: t });
    return p().eventos.at(-1).id;
  };
  const lote = (ep, rows) =>
    add({
      tipo: "importacion",
      fuente: `Cohorte sintética ${VERSION_COHORTE}`,
      ...importarCSV(
        p(),
        "fecha;episodio;componente;dias\n" +
          rows.map(([f, c, d]) => `${f};${ep};${c};${d}`).join("\n"),
      ),
    });
  const actuacion = (texto, hecha = false) => {
    add({
      tipo: "actuacion",
      fecha: "2026-11-08",
      texto,
      estado: "pendiente",
      fuente: "Biblioteca CMO-VIH · preparadorconsulta 42402cb",
    });
    if (hecha)
      add({
        tipo: "estado_actuacion",
        fecha: "2026-11-08",
        actuacion: p().eventos.at(-1).id,
        estado: "realizada",
      });
  };
  if (clave === "acceso") {
    const ep = tar("2026-05-01", "TAR_A");
    lote(ep, [
      ["2026-05-01", "A", 30],
      ["2026-06-15", "A", 60],
      ["2026-08-20", "A", 60],
      ["2026-10-25", "A", 30],
    ]);
    add({
      tipo: "visita",
      fecha: "2026-07-01",
      experiencia: experiencia({
        barrera: "Acceso a la dispensación",
        dificultad: "Horario",
        carga: "Alta",
      }),
    });
    add({
      tipo: "visita",
      fecha: "2026-11-08",
      experiencia: experiencia({
        barrera: "Acceso a la dispensación",
        carga: "Moderada",
        preferencia: "Seguimiento telefónico simulado",
      }),
    });
    actuacion("Abordar barreras de adherencia y necesidades educativas.", true);
    actuacion(
      "Coordinar revisión multidisciplinar ante alertas de alto riesgo.",
    );
    add(informe(p(), "2026-11-08"));
    const inf = p().eventos.at(-1).id;
    for (const estado of ["comunicado", "recibido"])
      add({ tipo: "estado_comunicacion", fecha: "2026-11-08", informe: inf, estado });
  } else if (clave === "cambio") {
    const ep1 = tar("2026-05-01", "TAR_A");
    lote(ep1, [
      ["2026-05-01", "A", 90],
      ["2026-08-01", "A", 90],
    ]);
    add({
      tipo: "visita",
      fecha: "2026-09-20",
      experiencia: experiencia({
        efecto: "Molestias digestivas",
        carga: "Moderada",
      }),
    });
    const ep2 = tar("2026-10-01", "TAR_B");
    lote(ep2, [
      ["2026-10-01", "B", 30],
      ["2026-11-01", "B", 30],
    ]);
    add({
      tipo: "visita",
      fecha: "2026-11-08",
      experiencia: experiencia({ carga: "Moderada" }),
    });
    actuacion("Revisar efectividad y tolerabilidad del tratamiento.", true);
    add({
      tipo: "revision_alertas",
      fecha: "2026-11-08",
      resultado: "Requiere exploración",
      alertas: alertas(p(), "2026-11-08"),
      reglas: { ...REGLAS },
    });
    add(informe(p(), "2026-11-08"));
    const inf = p().eventos.at(-1).id;
    for (const estado of ["comunicado", "recibido", "valorado"])
      add({ tipo: "estado_comunicacion", fecha: "2026-11-08", informe: inf, estado });
  } else {
    const ep = tar("2026-05-01", "TAR_CD");
    lote(
      ep,
      [0, 60, 120, 180].flatMap((offset) =>
        ["C", "D"].map((c) => [iso(fecha("2026-05-01") + offset), c, 60]),
      ),
    );
    for (const f of ["2026-08-01", "2026-11-08"])
      add({ tipo: "visita", fecha: f, experiencia: experiencia() });
    actuacion("Mantener el seguimiento farmacéutico rutinario del VIH.", true);
    actuacion("Reforzar autocuidado y hábitos de adherencia.", true);
  }
  return next;
}
/** Incorpora solamente perfiles que todavía no existen en esta versión de cohorte. */
export function incorporarCohorte(db) {
  let next = structuredClone(db);
  for (const e of ESCENARIOS)
    if (
      !next.pacientes.some(
        (p) =>
          p.escenario?.id === e.id && p.escenario?.version === VERSION_COHORTE,
      )
    )
      next = crearCasoEscenario(next, e.id);
  return next;
}
export function demo() {
  return incorporarCohorte(vacio());
}
