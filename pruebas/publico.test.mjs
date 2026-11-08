import test from "node:test";
import assert from "node:assert/strict";
import {
  demo,
  incorporarCohorte,
  crearCasoEscenario,
  ESCENARIOS,
  VERSION_COHORTE,
} from "../src/demo.js";
import { crearPaciente, vacio } from "../src/almacen.js";
import { cobertura, episodios, estadoComunicacion } from "../src/motor.js";
import { AccesoDemostracion } from "../src/acceso.js";
import { paginaLegal, enlacesLegales, AUTORIA } from "../src/legal.js";
test("Cohorte renovada: escenarios diferenciados, visitas longitudinales y sin datos identificativos", () => {
  const d = demo();
  assert.equal(d.pacientes.length, 3);
  assert.deepEqual(
    d.pacientes.map((p) => p.escenario.id),
    ESCENARIOS.map((e) => e.id),
  );
  for (const p of d.pacientes) {
    assert.equal(p.sintetico, true);
    assert.equal(p.escenario.version, VERSION_COHORTE);
    assert.ok(p.eventos.filter((e) => e.tipo === "visita").length >= 2);
    assert.ok(!("nombre" in p));
    assert.ok(p.id.startsWith("DEMO-"));
  }
  assert.equal(episodios(d.pacientes[1]).length, 2);
  assert.equal(cobertura(d.pacientes[2], "2026-11-08").pdc, 1);
  const inf = d.pacientes[1].eventos.find((e) => e.tipo === "informe");
  assert.equal(estadoComunicacion(d.pacientes[1], inf.id), "valorado");
});
test("Incorporar cohorte es aditivo e idempotente; no altera casos o informes anteriores", () => {
  const original = crearPaciente(vacio(), "2"),
    antes = JSON.stringify(original);
  const nuevo = incorporarCohorte(original);
  assert.equal(JSON.stringify(original), antes);
  assert.deepEqual(nuevo.pacientes[0], original.pacientes[0]);
  assert.equal(nuevo.pacientes.length, 4);
  assert.deepEqual(incorporarCohorte(nuevo), nuevo);
  assert.equal(new Set(nuevo.pacientes.map((p) => p.id)).size, 4);
  const copia = crearCasoEscenario(nuevo, "continuidad");
  assert.equal(copia.pacientes.length, 5);
  assert.deepEqual(copia.pacientes.slice(0, 4), nuevo.pacientes);
  assert.throws(() => crearCasoEscenario(nuevo, "inventado"));
});
test("Acceso actual sin identidad ni credenciales y con login institucional cerrado", async () => {
  const a = new AccesoDemostracion(),
    ctx = await a.obtenerContexto();
  assert.equal(ctx.modo, "demostracion");
  assert.equal(ctx.autenticado, false);
  assert.equal(ctx.usuarioId, null);
  assert.equal(ctx.hospitalId, null);
  assert.deepEqual(ctx.roles, []);
  await assert.rejects(() => a.iniciarSesion(), /no habilitado/);
  assert.deepEqual(await a.cerrarSesion(), ctx);
});
test("Apartados legales accesibles, atribución y límites explícitos", () => {
  assert.equal(AUTORIA.autor, "Dr. Ramón Morillo Verdugo");
  for (const id of [
    "autoria",
    "condiciones",
    "privacidad",
    "aviso",
    "fuentes",
    "accesibilidad",
  ]) {
    assert.match(enlacesLegales(), new RegExp("#legal/" + id));
    assert.ok(paginaLegal(id).includes("legal-prose"));
  }
  assert.match(paginaLegal("privacidad"), /vihconectados.demo.v1/);
  assert.match(
    paginaLegal("autoria"),
    /No se afirma que exista una cesión formal/,
  );
  assert.match(
    paginaLegal("accesibilidad"),
    /No se declara conformidad formal/,
  );
});
