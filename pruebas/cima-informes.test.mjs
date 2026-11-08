import test from "node:test";
import assert from "node:assert/strict";
import {
  buscar,
  ficha,
  normalizarFicha,
  validarMedicamentos,
  urlAemps,
  esTarOral,
} from "../src/cima.js";
import { crearPaciente, vacio, anexar } from "../src/almacen.js";
import { componentes, cobertura, importarCSV, REGLAS } from "../src/motor.js";
import {
  informe,
  informePaciente,
  resumenInforme,
  textoInforme,
} from "../src/informes.js";
import { vistaInforme } from "../src/vista-informes.js";
// Respuestas ficticias del contrato CIMA: no constituyen datos reales del catálogo.
import { fichaPrueba } from "./fixtures-cima.js";
const med = () => {
  const { presentaciones, ...m } = normalizarFicha(fichaPrueba);
  return { ...m, cn: "999999", presentacion: presentaciones[0].nombre };
};
const inicio = () => crearPaciente(vacio());
const cfg = { ...REGLAS, ventana: 30 };
test("CIMA: búsqueda solo envía texto, deduplica por registro y conserva consulta parcial", async () => {
  const urls = [],
    opts = [];
  let num = 0;
  const r = await buscar("TAR de prueba", async (u, o) => {
    urls.push(u);
    opts.push(o);
    num++;
    return {
      ok: true,
      json: async () => ({
        resultados: [
          { nregistro: "999999", nombre: "TAR DE PRUEBA ORAL", comerc: true },
        ],
      }),
    };
  });
  assert.equal(r.medicamentos.length, 1);
  assert.equal(r.parcial, false);
  assert.ok(
    urls.every((u) =>
      u.startsWith("https://cima.aemps.es/cima/rest/medicamentos?"),
    ),
  );
  assert.ok(
    opts.every(
      (o) => o.credentials === "omit" && o.referrerPolicy === "no-referrer",
    ),
  );
  const parcial = await buscar("prueba", async (u) => {
    if (u.includes("practiv1")) throw Error("red");
    return { ok: true, json: async () => ({ resultados: [] }) };
  });
  assert.equal(parcial.parcial, true);
  await assert.rejects(
    () =>
      buscar("prueba", async () => {
        throw Error("sin red");
      }),
    /No se pudo conectar/,
  );
  await assert.rejects(() => buscar("ab"), /3–100/);
});
test("CIMA: metadatos, ATC y vía; rechazo de inyectable, ruta desconocida y URL ajena", async () => {
  const m = await ficha("999999", async () => ({
    ok: true,
    json: async () => fichaPrueba,
  }));
  assert.equal(m.oral, true);
  assert.ok(m.consultado);
  assert.equal(m.fuente, "CIMA · AEMPS");
  assert.equal(m.presentaciones[0].cn, "999999");
  assert.equal(
    esTarOral(
      normalizarFicha({
        ...fichaPrueba,
        viasAdministracion: [{ nombre: "VÍA INTRAMUSCULAR" }],
      }),
    ),
    false,
  );
  await assert.rejects(
    () =>
      ficha("999999", async () => ({
        ok: true,
        json: async () => ({ ...fichaPrueba, viasAdministracion: [] }),
      })),
    /no permite confirmar/,
  );
  assert.equal(
    esTarOral(
      normalizarFicha({ ...fichaPrueba, atcs: [{ codigo: "J05AB01" }] }),
    ),
    false,
  );
  assert.equal(urlAemps("javascript:alert(1)"), "");
  assert.equal(urlAemps("https://otro.test/ficha"), "");
  assert.throws(() => validarMedicamentos([med(), med()]), /repetirse/);
});
test("TAR CIMA multimed: componentes independientes, intersección e histórico compatible", () => {
  let d = inicio();
  const m1 = med(),
    m2 = { ...med(), nregistro: "999998", nombre: "SEGUNDO TAR DE PRUEBA" };
  d = anexar(d, "DEMO-001", {
    tipo: "tratamiento",
    fecha: "2026-01-01",
    tar: "CIMA",
    medicamentos: [m1, m2],
    confirmado: true,
  });
  const p = d.pacientes[0],
    ep = p.eventos.at(-1);
  assert.deepEqual(componentes(ep), ["CIMA-999999", "CIMA-999998"]);
  const csv = `fecha;episodio;componente;dias\n2026-01-01;${ep.id};CIMA-999999;30\n2026-01-11;${ep.id};CIMA-999998;10`;
  d = anexar(d, p.id, { tipo: "importacion", ...importarCSV(p, csv) });
  assert.equal(cobertura(d.pacientes[0], "2026-01-31", cfg).cubiertos, 10);
  assert.throws(() =>
    anexar(inicio(), p.id, {
      tipo: "tratamiento",
      tar: "CIMA",
      fecha: "2026-01-01",
      medicamentos: [],
      confirmado: true,
    }),
  );
  assert.throws(
    () =>
      anexar(inicio(), p.id, {
        tipo: "tratamiento",
        tar: "CIMA",
        fecha: "2026-01-01",
        medicamentos: [med()],
        confirmado: false,
      }),
    /Confirme/,
  );
});
test("Hoja del paciente: instrucciones obligatorias revisadas, cita válida y sin inferencia automática", () => {
  const p = inicio().pacientes[0];
  assert.throws(() =>
    informePaciente(p, "2026-01-31", {
      instrucciones: "Caso ficticio",
      revisado: false,
    }),
  );
  assert.throws(() =>
    informePaciente(p, "2026-01-31", { instrucciones: "", revisado: true }),
  );
  assert.throws(() =>
    informePaciente(p, "2026-01-31", {
      instrucciones: "Caso ficticio",
      revisado: true,
      proxima_cita: "2026-01-01",
    }),
  );
  const i = informePaciente(p, "2026-01-31", {
    instrucciones: "Acuerdo sintético: preparar un recordatorio.",
    revisado: true,
    incluir_recurso: true,
  });
  assert.equal(i.tipo, "informe_paciente");
  assert.match(i.recurso.url, /adhefarmapexhub/);
  assert.match(vistaInforme(i), /preparar un recordatorio/);
  assert.doesNotMatch(vistaInforme(i), /COBERTURA DE DISPENSACIÓN/);
});
test("Informes: escape, hoja congelada, sin recursión y texto legible para historia", () => {
  let d = inicio();
  const p = d.pacientes[0];
  const hoja = informePaciente(p, "2026-01-31", {
    instrucciones: "Prueba <script>alert(1)</script>",
    revisado: true,
  });
  const html = vistaInforme(hoja);
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  d = anexar(d, p.id, hoja);
  const snapshot = JSON.stringify(d.pacientes[0].eventos.at(-1));
  d = anexar(d, p.id, { tipo: "nivel", nivel: "1" });
  assert.equal(JSON.stringify(d.pacientes[0].eventos.at(-2)), snapshot);
  const i = informe(d.pacientes[0], "2026-01-31");
  assert.equal(
    i.eventos.some((e) => e.tipo === "informe_paciente"),
    false,
  );
  assert.equal(i.informes_previos.length, 1);
  assert.match(textoInforme(i), /EXPERIENCIA REGISTRADA/);
  assert.doesNotMatch(textoInforme(i), /"eventos"|"tipo"/);
  assert.equal(resumenInforme(i).tratamiento, undefined);
  assert.throws(
    () =>
      anexar(d, p.id, {
        tipo: "estado_comunicacion",
        informe: d.pacientes[0].eventos.at(-2).id,
        estado: "comunicado",
      }),
    /Informe inexistente/,
  );
});

test("No se calcula una falsa cobertura completa si un episodio pierde sus componentes", () => {
  const p = {
    id: "DEMO-001",
    eventos: [
      { id: "x", tipo: "tratamiento", tar: "desconocido", fecha: "2026-01-01" },
    ],
  };
  assert.throws(() => cobertura(p, "2026-01-31", cfg), /sin componentes/);
});
