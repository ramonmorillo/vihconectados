import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { fichaPrueba } from "./fixtures-cima.js";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
  locale: "es-ES",
  viewport: { width: 1440, height: 1000 },
});
// Catálogo ficticio interceptado: estas pruebas NO verifican la disponibilidad real de CIMA.
await page.route("https://cima.aemps.es/cima/rest/**", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(
      route.request().url().includes("/medicamentos?")
        ? {
            resultados: [
              {
                nregistro: "999999",
                nombre: "TAR DE PRUEBA ORAL",
                comerc: true,
              },
            ],
          }
        : fichaPrueba,
    ),
  }),
);
await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://127.0.0.1:5173");
await page.getByRole("heading", { name: "Seguimiento de casos" }).waitFor();
await page.screenshot({ path: "/tmp/vih-panel.png", fullPage: true });
await page.getByRole("button", { name: "Ver caso" }).first().click();
await page.getByRole("button", { name: "Generar informe simulado" }).click();
for (const state of ["comunicado", "recibido", "valorado", "resuelto"])
  await page
    .getByRole("button", { name: "Simular: " + state, exact: true })
    .last()
    .click();
await page.getByRole("button", { name: "Experiencia", exact: true }).click();
await page.getByRole("button", { name: "Añadir visita" }).click();
await page.locator("select[name=barrera]").selectOption("Privacidad");
await page
  .getByRole("button", { name: "Guardar registro", exact: true })
  .click();
await page.getByText("barrera: Privacidad", { exact: false }).waitFor();
await page.getByRole("button", { name: "Cobertura TAR", exact: true }).click();
await page.getByRole("button", { name: "Importar CSV", exact: true }).click();
await page
  .locator("textarea[name=csv]")
  .fill("nombre;fecha\nNombre;2026-11-08");
await page
  .getByRole("button", { name: "Guardar registro", exact: true })
  .click();
await page.getByText("Cabecera requerida:", { exact: false }).waitFor();
await page.getByRole("button", { name: "Cerrar", exact: true }).click();
await page
  .getByRole("button", { name: "+ Nuevo caso sintético", exact: true })
  .click();
await page
  .getByRole("button", { name: "Guardar registro", exact: true })
  .click();
await page.getByRole("heading", { name: "DEMO-004", exact: true }).waitFor();
await page.reload();
await page.getByRole("heading", { name: "DEMO-004", exact: true }).waitFor();
await page
  .getByRole("button", { name: "Registrar cambio TAR", exact: true })
  .click();
await page.locator("input[name=fecha]").fill("2026-10-01");
await page
  .getByRole("textbox", { name: "Medicamento o principio activo" })
  .fill("TAR de prueba");
await page.getByRole("button", { name: "Buscar en CIMA", exact: true }).click();
await page
  .getByRole("button", { name: /TAR DE PRUEBA ORAL.*Registro/ })
  .click();
await page.getByRole("button", { name: "Añadir al TAR", exact: true }).click();
await page.locator("input[name=confirmado]").check();
await page
  .getByRole("button", { name: "Guardar registro", exact: true })
  .click();
await page.getByRole("button", { name: "Cobertura TAR", exact: true }).click();
const downloadPromise = page.waitForEvent("download");
await page
  .getByRole("button", { name: "Descargar CSV de ejemplo", exact: true })
  .click();
const download = await downloadPromise,
  csv = await readFile(await download.path(), "utf8");
for (const expected of [
  "1 filas incorporadas; 0 duplicadas omitidas.",
  "0 filas incorporadas; 1 duplicadas omitidas.",
]) {
  await page.getByRole("button", { name: "Importar CSV", exact: true }).click();
  await page.locator("textarea[name=csv]").fill(csv);
  await page
    .getByRole("button", { name: "Guardar registro", exact: true })
    .click();
  await page.getByRole("status").filter({ hasText: expected }).waitFor();
}
await page.getByRole("button", { name: "Resumen", exact: true }).click();
await page
  .getByRole("button", { name: "Generar informe simulado", exact: true })
  .click();
const jsonPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Descargar JSON", exact: true }).click();
const jsonDownload = await jsonPromise;
const report = JSON.parse(await readFile(await jsonDownload.path(), "utf8"));
assert.equal(report.formato, "vihconectados/informe@1");
assert.equal(report.paciente, "DEMO-004");
await page.getByRole("button", { name: "Ver e imprimir", exact: true }).click();
await page.evaluate(() => {
  window.print = () => {
    window.__impresion = document.getElementById("salidaInforme").textContent;
  };
});
await page.getByRole("button", { name: "Imprimir / PDF", exact: true }).click();
assert.match(await page.evaluate(() => window.__impresion), /SIMULACIÓN/);
assert.match(await page.evaluate(() => window.__impresion), /DEMO-004/);
await page.evaluate(
  () =>
    new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    ),
);
await page.pdf({
  path: "/tmp/vih-informe-profesional.pdf",
  preferCSSPageSize: true,
  printBackground: true,
});
assert.ok(
  (await readFile("/tmp/vih-informe-profesional.pdf")).byteLength > 10000,
);
await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
await page
  .getByRole("button", { name: "Copiar para historia clínica", exact: true })
  .last()
  .click();
assert.match(
  await page.evaluate(() => navigator.clipboard.readText()),
  /ATENCIÓN FARMACÉUTICA/,
);
await page.evaluate(() =>
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw Error("denegado");
      },
    },
  }),
);
await page
  .getByRole("button", { name: "Copiar para historia clínica", exact: true })
  .last()
  .click();
await page.locator("#textoHistoria").waitFor();
assert.match(
  await page.locator("#textoHistoria").inputValue(),
  /TAR DE PRUEBA ORAL/,
);
await page.getByRole("button", { name: "Cerrar", exact: true }).click();
await page
  .getByRole("button", { name: "Crear hoja para el paciente", exact: true })
  .click();
await page
  .locator("textarea[name=instrucciones]")
  .fill(
    "Caso ficticio: acordamos utilizar un recordatorio en el horario elegido.\nAnotar las dudas para la próxima visita.",
  );
await page.locator("input[name=proxima_cita]").fill("2026-12-08");
await page.locator("input[name=revisado]").check();
await page
  .getByRole("button", { name: "Guardar registro", exact: true })
  .click();
await page
  .getByRole("button", { name: "Ver e imprimir", exact: true })
  .last()
  .click();
await page.locator(".documento-paciente").waitFor();
assert.match(
  await page.locator(".documento-paciente").innerText(),
  /utilizar un recordatorio/,
);
await page.screenshot({ path: "/tmp/vih-hoja-preview.png", fullPage: true });
await page.getByRole("button", { name: "Imprimir / PDF", exact: true }).click();
await page.evaluate(
  () =>
    new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    ),
);
await page.pdf({
  path: "/tmp/vih-informe-paciente.pdf",
  preferCSSPageSize: true,
  printBackground: true,
});
assert.ok((await readFile("/tmp/vih-informe-paciente.pdf")).byteLength > 10000);
await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
await page.getByRole("button", { name: "Cerrar", exact: true }).click();
// Prueba de paginación con instrucciones extensas, siempre sintéticas.
await page
  .getByRole("button", { name: "Crear hoja para el paciente", exact: true })
  .click();
await page
  .locator("textarea[name=instrucciones]")
  .fill(
    "Acuerdo sintético: preparar las dudas para comentarlas en la próxima visita.\n".repeat(
      23,
    ) + "FIN DE INSTRUCCIONES SINTÉTICAS",
  );
await page.locator("input[name=revisado]").check();
await page
  .getByRole("button", { name: "Guardar registro", exact: true })
  .click();
await page
  .getByRole("button", { name: "Ver e imprimir", exact: true })
  .last()
  .click();
await page.getByRole("button", { name: "Imprimir / PDF", exact: true }).click();
await page.evaluate(
  () =>
    new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    ),
);
await page.pdf({
  path: "/tmp/vih-informe-paciente-extenso.pdf",
  preferCSSPageSize: true,
  printBackground: true,
});
await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
await page.getByRole("button", { name: "Cerrar", exact: true }).click();
await page.goto("http://127.0.0.1:5173/#recursos");
await page
  .getByRole("heading", { name: "MAPEX-ADHEFAR Hub", exact: true })
  .waitFor();
assert.equal(
  await page.getByRole("link", { name: "Abrir el hub ↗" }).getAttribute("href"),
  "https://ramonmorillo.es/adhefarmapexhub/",
);

await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:5173/#panel");
await page.getByRole("heading", { name: "Seguimiento de casos" }).waitFor();
await page.screenshot({ path: "/tmp/vih-mobile.png", fullPage: true });
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > innerWidth,
);
console.log(
  JSON.stringify({
    errors,
    overflow,
    circuito: "completado",
    persistencia: "verificada",
  }),
);
for (const ruta of [
  "/tmp/vih-informe-profesional.pdf",
  "/tmp/vih-informe-paciente.pdf",
]) {
  const pdf = await readFile(ruta);
  assert.equal(
    (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length,
    1,
    "Documento breve en una página A4",
  );
}
await browser.close();
if (errors.length || overflow) process.exitCode = 1;
