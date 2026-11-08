import { vacio, crearPaciente, anexar } from "./almacen.js";
import { importarCSV, EXPERIENCIA } from "./motor.js";
import { informe } from "./informes.js";
export function demo() {
  let db = vacio();
  for (const n of ["1", "2", "3"]) db = crearPaciente(db, n);
  for (let i = 0; i < 3; i++) {
    const id = db.pacientes[i].id;
    db = anexar(db, id, {
      tipo: "tratamiento",
      fecha: "2026-05-01",
      tar: "TAR_A",
    });
    let p = db.pacientes[i],
      ep = p.eventos.at(-1).id;
    const csv = `fecha;episodio;componente;dias\n2026-05-01;${ep};A;${i === 0 ? 30 : 90}\n2026-08-01;${ep};A;90`;
    db = anexar(db, id, {
      tipo: "importacion",
      fuente: "Lote sintético inicial",
      ...importarCSV(p, csv),
    });
    if (i === 1)
      db = anexar(db, id, {
        tipo: "tratamiento",
        fecha: "2026-10-01",
        tar: "TAR_B",
      });
    db = anexar(db, id, {
      tipo: "visita",
      fecha: "2026-11-08",
      experiencia: Object.fromEntries(
        Object.entries(EXPERIENCIA).map(([k, v]) => [k, v[i === 0 ? 2 : 1]]),
      ),
    });
    db = anexar(db, id, {
      tipo: "actuacion",
      texto: "Reforzar autocuidado y hábitos de adherencia.",
      estado: "pendiente",
      fuente: "CMO-VIH · preparadorconsulta",
    });
  }
  db = anexar(db, "DEMO-001", informe(db.pacientes[0], "2026-11-08"));
  return db;
}
