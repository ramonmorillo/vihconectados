import { chromium } from "playwright";
import assert from "node:assert/strict";
import { demo } from "../src/demo.js";
const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const pagina = await navegador.newPage({
    locale: "es-ES",
    viewport: { width: 1440, height: 1000 },
  }),
  errores = [],
  externas = [];
pagina.on("pageerror", (e) => errores.push(e.message));
pagina.on("console", (m) => {
  if (m.type() === "error") errores.push(m.text());
});
pagina.on("request", (r) => {
  if (!r.url().startsWith("http://127.0.0.1:5173")) externas.push(r.url());
});
await pagina.goto("http://127.0.0.1:5173/");
await pagina
  .getByRole("heading", {
    name: "Un seguimiento conectado. Una atención más cercana.",
  })
  .waitFor();
await pagina.screenshot({ path: "/tmp/vih-landing.png", fullPage: true });
await pagina
  .getByRole("link", { name: "Futuro acceso de hospitales →", exact: true })
  .click();
await pagina
  .getByRole("heading", { name: "Hospitales y acceso individual", exact: true })
  .waitFor();
assert.equal(
  await pagina
    .locator("input[type=password],input[name=usuario],input[type=email]")
    .count(),
  0,
);
await pagina
  .getByRole("link", {
    name: "Continuar sin registro en la demo →",
    exact: true,
  })
  .click();
await pagina
  .getByRole("heading", { name: "Seguimiento de casos", exact: true })
  .waitFor();
for (const [id, titulo] of [
  ["autoria", "Autoría y reconocimiento"],
  ["condiciones", "Condiciones de uso"],
  ["privacidad", "Privacidad y almacenamiento"],
  ["aviso", "Aviso legal"],
  ["fuentes", "Fuentes y cómo citar"],
  ["accesibilidad", "Accesibilidad"],
]) {
  await pagina
    .getByRole("navigation", { name: "Información legal" })
    .getByRole("link", { name: titulo, exact: true })
    .click();
  await pagina.getByRole("heading", { name: titulo, exact: true }).waitFor();
  assert.ok((await pagina.locator(".legal-prose").innerText()).length > 500);
}
await pagina.screenshot({ path: "/tmp/vih-legal.png", fullPage: true });
// Simular almacenamiento de una versión antigua, sin metadatos de cohorte. No se modifica su histórico.
const antiguos = demo();
for (const p of antiguos.pacientes) delete p.escenario;
await pagina.evaluate(
  (d) => localStorage.setItem("vihconectados.demo.v1", JSON.stringify(d)),
  antiguos,
);
await pagina.goto("http://127.0.0.1:5173/#pacientes");
await pagina.reload();
await pagina
  .getByRole("button", { name: "Añadir casos actualizados", exact: true })
  .click();
const actualizados = await pagina.evaluate(() =>
  JSON.parse(localStorage.getItem("vihconectados.demo.v1")),
);
assert.equal(actualizados.pacientes.length, 6);
assert.deepEqual(actualizados.pacientes.slice(0, 3), antiguos.pacientes);
assert.equal(
  await pagina
    .getByRole("button", { name: "Añadir casos actualizados", exact: true })
    .count(),
  0,
);
await pagina
  .getByRole("button", { name: "+ Nuevo caso sintético", exact: true })
  .click();
await pagina.locator("[name=perfil]").selectOption("continuidad");
assert.equal(await pagina.locator("[name=nivel]").isDisabled(), true);
await pagina
  .getByRole("button", { name: "Guardar registro", exact: true })
  .click();
await pagina.getByRole("heading", { name: "DEMO-007", exact: true }).waitFor();
const nuevo = await pagina.evaluate(() =>
  JSON.parse(localStorage.getItem("vihconectados.demo.v1")).pacientes.at(-1),
);
assert.equal(nuevo.escenario.id, "continuidad");
assert.equal(nuevo.eventos.filter((e) => e.tipo === "visita").length, 2);
await pagina.setViewportSize({ width: 390, height: 844 });
for (const ruta of ["inicio", "hospitales", "legal/privacidad"]) {
  await pagina.goto("http://127.0.0.1:5173/#" + ruta);
  await pagina.waitForTimeout(100);
  assert.equal(
    await pagina.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Sin desbordamiento global en " + ruta,
  );
}
await pagina.goto("http://127.0.0.1:5173/#inicio");
await pagina.screenshot({ path: "/tmp/vih-landing-movil.png", fullPage: true });
assert.deepEqual(externas, []);
assert.deepEqual(errores, []);
console.log(
  "Portada, demo sin credenciales, 6 apartados legales, actualización aditiva y escenarios: comprobados. Sin solicitudes externas ni errores.",
);
await navegador.close();
