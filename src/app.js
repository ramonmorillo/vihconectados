import {
  REGLAS,
  componentes,
  nombreTar,
  EXPERIENCIA,
  ESTADOS,
  nivel,
  episodios,
  cobertura,
  alertas,
  importarCSV,
  estadoComunicacion,
  validarReglas,
} from "./motor.js";
import { RepositorioDemo, crearPaciente, anexar } from "./almacen.js";
import { demo } from "./demo.js";
import { informe, informePaciente, textoInforme } from "./informes.js";
import { vistaInforme } from "./vista-informes.js";
import { abrirSeleccionTar } from "./medicacion.js";
import { ADHEFAR } from "./recursos.js";
import { enlaceCima } from "./cima.js";
const tituloAplicacion = document.title;
const $ = (id) => document.getElementById(id),
  esc = (x) =>
    String(x ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const repo = new RepositorioDemo(localStorage);
let db,
  tab = "resumen",
  seleccion = "",
  reglas = { ...REGLAS },
  biblioteca,
  guia;
const hoy = () => new Date().toLocaleDateString("sv-SE");
const finDefault = "2026-11-08";
let fin = finDefault;
const badge = (t, w = false) =>
  `<span class="badge ${w ? "warn" : ""}">${esc(t)}</span>`;
const boton = (a, t, id = "") =>
  `<button data-action="${a}" data-id="${esc(id)}">${esc(t)}</button>`;
const pct = (c) =>
  c.pdc === null
    ? "Sin cálculo"
    : new Intl.NumberFormat("es", {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(c.pdc);
const campo = (n, t, html) =>
  `<label>${t}${html || `<input name="${n}" required>`}</label>`;
const select = (name, arr) =>
  `<select name="${name}">${arr.map((x) => `<option value="${esc(x)}">${esc(x.replaceAll("_", " "))}</option>`).join("")}</select>`;
const paciente = () => db.pacientes.find((p) => p.id === seleccion);
function guardar(next) {
  repo.guardar(next);
  db = next;
  render();
}
function add(e) {
  guardar(anexar(db, seleccion, e));
}
function flash(s) {
  $("mensaje").textContent = s;
  $("mensaje").className = "success";
}
function modal(t, body, fn) {
  $("modal").classList.remove("report-dialog");
  $("formulario").innerHTML =
    `<h2 id="modalTitle">${esc(t)}</h2><p class="muted">Simulación local. No introduzca información real ni identificable.</p><form>${body}<div id="errorForm" role="alert"></div><button class="primary">Guardar registro</button></form>`;
  $("modal").showModal();
  $("formulario").querySelector("form").onsubmit = async (ev) => {
    ev.preventDefault();
    try {
      const msg = await fn(Object.fromEntries(new FormData(ev.target)));
      $("modal").close();
      flash(
        typeof msg === "string"
          ? msg
          : "Registro guardado. El histórico anterior se conserva.",
      );
    } catch (e) {
      $("errorForm").textContent = e.message;
      $("errorForm").className = "error";
    }
  };
}
function descargar(data, name, tipo = "application/json") {
  const url = URL.createObjectURL(
    new Blob(
      [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
      { type: tipo },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function tabla(ps) {
  return `<div class="table-wrap"><table><thead><tr><th>CASO FICTICIO</th><th>CMO</th><th>COBERTURA</th><th>REVISIÓN</th><th></th></tr></thead><tbody>${
    ps
      .map((p) => {
        const c = cobertura(p, fin, reglas),
          a = alertas(p, fin, reglas);
        return `<tr><td><strong>${p.id}</strong><br><small class="muted">${esc(nombreTar(episodios(p).at(-1)))}</small></td><td>${badge("Nivel " + nivel(p))}</td><td>${pct(c)}<div class="bar"><div class="bar-fill" data-pct="${c.pdc === null ? 0 : c.pdc * 100}"></div></div></td><td>${badge(a.length ? a.length + " señales" : "Sin señales", !!a.length)}</td><td>${boton("abrir", "Ver caso", p.id)}</td></tr>`;
      })
      .join("") ||
    '<tr><td colspan="5">No hay casos. Cree un caso sintético para comenzar.</td></tr>'
  }</tbody></table></div>`;
}
function pendiente(p, a) {
  return (
    a.estado === "pendiente" &&
    !p.eventos.some(
      (e) => e.tipo === "estado_actuacion" && e.actuacion === a.id,
    )
  );
}
function panel() {
  const aa = db.pacientes.reduce(
      (n, p) => n + alertas(p, fin, reglas).length,
      0,
    ),
    ac = db.pacientes.reduce(
      (n, p) =>
        n +
        p.eventos.filter((e) => e.tipo === "actuacion" && pendiente(p, e))
          .length,
      0,
    ),
    co = db.pacientes.reduce(
      (n, p) =>
        n +
        p.eventos.filter(
          (e) =>
            e.tipo === "informe" && estadoComunicacion(p, e.id) !== "resuelto",
        ).length,
      0,
    );
  return `<p class="intro">Una visión compartida para acompañar cada trayectoria.<br>Revise la cobertura, explore la experiencia y coordine el siguiente paso.</p><div class="stats">${[
    ["Casos en seguimiento", db.pacientes.length, "Todos ficticios"],
    ["Señales para revisar", aa, "Sin validación clínica"],
    ["Actuaciones pendientes", ac, "Selección profesional"],
    ["Comunicaciones abiertas", co, "Circuito simulado"],
  ]
    .map(
      ([a, b, c]) =>
        `<div class="stat"><span>${a}</span><strong>${b}</strong><small>${c}</small></div>`,
    )
    .join(
      "",
    )}</div><div class="grid"><section class="card"><div class="section-head"><h2>Seguimiento de casos</h2>${badge("TAR oral")}</div>${tabla(db.pacientes)}</section><section class="card"><p class="eyebrow">FARMACIA → INFECCIOSAS</p><h2>Continuidad, paso a paso</h2><p class="muted">1. Revisar cobertura y contexto<br>2. Registrar la experiencia y actuación<br>3. Generar un informe fijo<br>4. Simular recepción y resolución</p><div class="notice">Ningún informe se envía. Cada cambio de estado queda registrado.</div><div class="actions"><a href="#comunicaciones">Ver comunicaciones →</a></div></section></div>`;
}
function visitas(p) {
  return (
    p.eventos
      .filter((e) => e.tipo === "visita")
      .map(
        (v) =>
          `<div class="item"><strong>${v.fecha}</strong><p>${Object.entries(
            v.experiencia,
          )
            .map(([k, x]) => `${esc(k)}: ${esc(x)}`)
            .join(" · ")}</p></div>`,
      )
      .join("") || '<p class="muted">Aún no hay visitas.</p>'
  );
}
function listadoInformes(ps) {
  return (
    ps
      .flatMap((p) =>
        p.eventos
          .filter((e) => ["informe", "informe_paciente"].includes(e.tipo))
          .map((i) => {
            const paciente = i.tipo === "informe_paciente",
              estado = paciente
                ? "Hoja para el paciente"
                : estadoComunicacion(p, i.id),
              next = paciente ? null : ESTADOS[ESTADOS.indexOf(estado) + 1];
            return `<article class="card"><div class="section-head"><h2>${esc(p.id)} · ${i.fecha}</h2>${badge(estado)}</div><p class="muted">${paciente ? "Instrucciones revisadas · Hoja fija de demostración" : "Informe profesional fijo · circuito de comunicación simulado"}</p><div class="actions">${boton("ver-informe", "Ver e imprimir", p.id + "|" + i.id)}${!paciente ? boton("copiar-informe", "Copiar para historia clínica", p.id + "|" + i.id) : ""}${boton("json-informe", "Descargar JSON", p.id + "|" + i.id)}${next ? boton("estado", "Simular: " + next, p.id + "|" + i.id) : ""}</div>${
              !paciente
                ? `<details><summary>Trazabilidad de comunicación</summary><p class="muted">${esc(i.registrado)} · pendiente</p>${p.eventos
                    .filter(
                      (e) =>
                        e.tipo === "estado_comunicacion" && e.informe === i.id,
                    )
                    .map(
                      (e) =>
                        `<p class="muted">${esc(e.registrado)} · ${e.estado}</p>`,
                    )
                    .join("")}</details>`
                : ""
            }</article>`;
          }),
      )
      .join("") ||
    '<div class="card empty">Sin informes. Genere uno desde el resumen de un caso.</div>'
  );
}
function mostrarInforme(i) {
  $("modal").classList.add("report-dialog");
  $("formulario").innerHTML =
    `<h2 id="modalTitle">${i.tipo === "informe_paciente" ? "Hoja para el paciente" : "Informe profesional"} · Vista previa</h2><div class="report-toolbar"><button id="imprimir" class="primary">Imprimir / PDF</button>${i.tipo !== "informe_paciente" ? '<button id="copiarHistoria">Copiar para historia clínica</button>' : ""}</div><p class="muted">Para guardar como PDF, elija ese destino en la impresión. Formato A4; desactive las cabeceras y pies del navegador.</p><div id="estadoCopia" role="status" aria-live="polite"></div><div id="alternativaCopia"></div><div class="report-preview">${vistaInforme(i)}</div>`;
  if (!$("modal").open) $("modal").showModal();
  $("imprimir").onclick = () => {
    $("salidaInforme").innerHTML = vistaInforme(i);
    document.title = `vihconectados · ${i.tipo === "informe_paciente" ? "Hoja para el paciente" : "Informe profesional"} · ${i.paciente}`;
    document.body.classList.add("imprimiendo");
    window.print();
  };
  if ($("copiarHistoria"))
    $("copiarHistoria").onclick = () => copiarHistoria(i);
}
async function copiarHistoria(i) {
  try {
    if (!navigator.clipboard?.writeText)
      throw Error("Portapapeles no disponible");
    await navigator.clipboard.writeText(textoInforme(i));
    $("estadoCopia").textContent =
      "Informe copiado. Revise el texto antes de utilizarlo; contiene solo un caso ficticio.";
  } catch {
    $("estadoCopia").textContent =
      "No se pudo copiar automáticamente. Seleccione el texto y cópielo manualmente.";
    $("alternativaCopia").innerHTML =
      `<label>Texto para historia clínica<textarea class="copy-fallback" id="textoHistoria" readonly>${esc(textoInforme(i))}</textarea></label>`;
    $("textoHistoria").focus();
    $("textoHistoria").select();
  }
}
window.addEventListener("afterprint", () => {
  document.body.classList.remove("imprimiendo");
  $("salidaInforme").innerHTML = "";
  document.title = tituloAplicacion;
});
function recursos() {
  return `<section class="card resource-card"><p class="eyebrow">APOYO A LA ADHERENCIA</p><h2>${ADHEFAR.nombre}</h2><p class="intro">${ADHEFAR.descripcion}</p><p class="muted">${ADHEFAR.atribucion}. Recursos complementarios para profesionales, pacientes y cuidadores. La selección y adaptación al caso requieren revisión profesional.</p><div class="actions"><a href="${ADHEFAR.url}" target="_blank" rel="noopener noreferrer">Abrir el hub ↗</a><a href="${ADHEFAR.pacientes}" target="_blank" rel="noopener noreferrer">Espacio para pacientes y cuidadores ↗</a></div><div class="notice">Enlace externo, sin enviar identificadores, tratamientos o contenido del caso. Puede incluirse en la hoja para el paciente.</div></section>`;
}
function caso(p) {
  const c = cobertura(p, fin, reglas),
    a = alertas(p, fin, reglas);
  let html = `<p class="muted"><a href="#pacientes">← Todos los casos</a> / ${p.id} · Solo datos sintéticos</p><div class="tabs" role="group" aria-label="Secciones del caso">${[
    ["resumen", "Resumen"],
    ["historia", "Historia longitudinal"],
    ["adherencia", "Cobertura TAR"],
    ["experiencia", "Experiencia"],
    ["intervenciones", "Intervenciones CMO"],
    ["informes", "Informes"],
  ]
    .map(
      ([v, t]) =>
        `<button data-tab="${v}" class="${tab === v ? "active" : ""}" aria-pressed="${tab === v}">${t}</button>`,
    )
    .join("")}</div>`;
  if (tab === "resumen")
    html += `<div class="grid"><section class="card"><div class="section-head"><h2>Situación del caso</h2>${badge("CMO " + nivel(p))}</div><p>Último TAR registrado: <strong>${esc(nombreTar(episodios(p).at(-1)))}</strong></p>${(episodios(p).at(-1)?.medicamentos || []).map((m) => `<p class="muted"><a href="${enlaceCima(m.nregistro)}" target="_blank" rel="noopener noreferrer">Ficha CIMA ${esc(m.nregistro)} ↗</a> · CN ${esc(m.cn)} · Consulta ${esc(m.consultado.slice(0, 10))}</p>`).join("")}<p>Cobertura hasta ${fin} (excluido): <strong>${pct(c)}</strong> · ${c.cubiertos}/${c.total} días</p><div class="actions">${boton("tar", "Registrar cambio TAR")}${boton("nivel", "Registrar nivel CMO")}${boton("informe", "Generar informe simulado")}${boton("hoja-paciente", "Crear hoja para el paciente")}</div><h3>Señales explicables</h3>${a.map((x) => `<div class="notice warning"><strong>${esc(x.texto)}</strong><br><small>${esc(x.regla)} · ${esc(x.version)} · ${x.estado}</small></div>`).join("") || '<p class="muted">Sin señales bajo la configuración actual. No equivale a ausencia de problemas.</p>'}<div class="actions">${boton("revision", "Registrar revisión profesional simulada")}</div><p class="muted">${p.eventos
      .filter((e) => e.tipo === "revision_alertas")
      .map(
        (e) =>
          `Revisión ${e.registrado}: ${esc(e.resultado)} (${e.alertas.length} señales, ${esc(e.reglas.version)})`,
      )
      .join(
        "<br>",
      )}</p></section><section class="card"><h2>Última experiencia registrada</h2>${visitas({ ...p, eventos: p.eventos.filter((e) => e.tipo === "visita").slice(-1) })}<div class="actions">${boton("visita", "Añadir visita")}</div></section></div>`;
  if (tab === "historia")
    html += `<section class="card"><h2>Registro longitudinal</h2><p class="muted">Registros anexados, sin edición ni borrado individual. Los tratamientos previos conservan su identidad.</p>${[
      ...p.eventos,
    ]
      .reverse()
      .map(
        (e) =>
          `<div class="event"><time>${esc(e.fecha || e.registrado?.slice(0, 10))}</time><p><strong>${esc({ nivel: "Nivel CMO", tratamiento: "Inicio de episodio TAR", visita: "Visita y experiencia", importacion: "Importación de dispensaciones", actuacion: "Actuación CMO", informe: "Informe para Infecciosas", informe_paciente: "Hoja para el paciente", estado_comunicacion: "Estado de comunicación", estado_actuacion: "Actuación realizada", revision_alertas: "Revisión profesional simulada" }[e.tipo] || e.tipo)}</strong> ${esc(e.tar || e.nivel || e.estado || e.texto || "")}</p><small>Registro ${esc(e.id)} · ${esc(e.registrado)}</small>${e.tipo === "importacion" ? `<p>${e.filas.length} filas aceptadas · ${e.duplicadas.length} duplicadas · lote ${esc(e.huella || e.fuente)}</p>` : ""}</div>`,
      )
      .join("")}</section>`;
  if (tab === "adherencia")
    html += `<section class="card"><div class="section-head"><h2>Cobertura del TAR oral completo</h2>${boton("csv", "Importar CSV")}</div><p class="muted">Ventana ${reglas.ventana} días; final excluido. Arrastre dentro del mismo episodio y componente, sin traslado entre TAR. En pautas multicomponente deben coincidir todos los componentes.</p><p><strong>${pct(c)}</strong> · ${c.cubiertos} días cubiertos / ${c.total} días evaluables</p><div class="table-wrap"><table><thead><tr><th>Episodio</th><th>Intervalo [inicio, fin)</th><th>Días cubiertos</th></tr></thead><tbody>${c.detalle.map((d) => `<tr><td>${esc(d.tar)}<br><small>${d.episodio}</small></td><td>${d.inicio} → ${d.fin_exclusivo}</td><td>${d.cubiertos}/${d.total}</td></tr>`).join("")}</tbody></table></div><div class="actions">${boton("plantilla", "Descargar CSV de ejemplo")}</div><p class="muted">Los episodios CIMA usan componentes CIMA-número de registro. Las etiquetas A, B, C y D se conservan en los ejemplos iniciales; los días se declaran expresamente. No se calcula dosis ni equivalencia terapéutica.</p></section>`;
  if (tab === "experiencia")
    html += `<section class="card"><div class="section-head"><h2>Escuchar y registrar</h2>${boton("visita", "Añadir visita")}</div><p class="muted">Opciones cerradas para demostración. No son un cuestionario ni una escala validados.</p>${visitas(p)}</section>`;
  if (tab === "intervenciones")
    html += `<section class="card"><h2>Biblioteca CMO · Nivel ${nivel(p)}</h2><div class="notice warning">Catálogo acumulativo de la referencia. Existe una discrepancia declarada con la herramienta de origen, pendiente de revisión clínica. La selección corresponde al profesional.</div>${biblioteca.niveles[nivel(p)].intervenciones.map((x, i) => `<div class="item"><p>${esc(x.texto)}</p>${boton("actuacion", "Añadir a pendientes", String(i))}</div>`).join("")}<h3>Actuaciones del caso</h3>${p.eventos
      .filter((e) => e.tipo === "actuacion")
      .map(
        (e) =>
          `<div class="item"><p>${esc(e.texto)}</p>${badge(pendiente(p, e) ? "pendiente" : "realizada")}${pendiente(p, e) ? boton("realizada", "Marcar realizada", e.id) : ""}</div>`,
      )
      .join(
        "",
      )}<details><summary>Guion de entrevista · SEFH MAPEX 2023</summary><p class="muted">${esc(guia.documento.titulo)} · capítulo ${esc(guia.documento.capitulo)} · pp. ${esc(guia.documento.paginas)}</p>${guia.estructura.pasos.map((x) => `<h3>${esc(x.titulo)}</h3><p>${x.hacer.map(esc).join(" ")}</p><small>Página ${esc(x.pagina)}</small>`).join("")}${guia.preguntas.map((x) => `<h3>${esc(x.tema)}</h3><p>${x.ejemplos.map(esc).join("<br>")}</p><small>Página ${esc(x.pagina)}</small>`).join("")}<p><a href="${guia.documento.url}" target="_blank" rel="noopener noreferrer">Documento fuente SEFH</a></p></details><p class="muted">Origen: preparadorconsulta 42402cb · CMO-VIH c963da9. Adaptaciones propiedad de SEFH.</p></section>`;
  if (tab === "informes")
    html +=
      `<div class="actions">${boton("informe", "Generar informe simulado")}${boton("hoja-paciente", "Crear hoja para el paciente")}</div>` +
      listadoInformes([p]);
  return html;
}
function modelo() {
  return `<section class="card"><h2>Modelo CMO-MAPEX</h2><p class="intro">Capacidad, Motivación y Oportunidad: la tecnología apoya la continuidad de la atención, y la valoración corresponde al profesional.</p><h3>Reglas de demostración · ${esc(reglas.version)}</h3><p>Ventana: ${reglas.ventana} días · Parámetro de señal: ${Math.round(reglas.umbral * 100)} %</p><p class="muted">Proceden de reglas v0.2.0 del preparador: pendientes de validación. La cobertura usa inicio de tratamiento explícito y unión por componente con intersección del TAR completo. No estima ingesta, supresión virológica ni riesgo clínico. No incluye TAR inyectable, hospitalizaciones ni dispensación externa.</p>${boton("reglas", "Configurar parámetros de demostración")}<h3>Privacidad y almacenamiento</h3><p class="muted">Sin campos de nombres, documentos o contactos. Las instrucciones de la hoja del paciente son texto local y deben ser exclusivamente sintéticas. Los casos se generan con prefijo DEMO. Los datos se guardan en este navegador; no hay envío de casos, analítica, backend clínico o API generativa. Solo las búsquedas explícitas de medicamentos consultan CIMA (AEMPS), sin datos del caso. El almacenamiento local no ofrece las garantías de un sistema sanitario.</p><h3>Fuentes y autoría</h3><p class="muted">Autor: Dr. Ramón Morillo Verdugo. Adaptaciones CMO: Sociedad Española de Farmacia Hospitalaria (SEFH). Biblioteca y guion conservan sus metadatos originales. No se declara validación clínica ni licencia de terceros no otorgada.</p><div class="actions">${boton("exportar", "Exportar demostración JSON")}</div></section>`;
}
function render() {
  const route = location.hash.slice(1) || "panel";
  document
    .querySelectorAll("nav a")
    .forEach((a) => a.classList.toggle("active", a.hash === "#" + route));
  let title = "Panel de seguimiento",
    html = "";
  if (route.startsWith("caso/")) {
    seleccion = route.slice(5);
    const p = paciente();
    title = seleccion;
    html = p ? caso(p) : "<p>Caso no encontrado.</p>";
  } else if (route === "pacientes") {
    title = "Casos sintéticos";
    html = `<p class="intro">Historias independientes para explorar el circuito asistencial.</p><section class="card">${tabla(db.pacientes)}</section>`;
  } else if (route === "comunicaciones") {
    title = "Comunicación con Infecciosas";
    html =
      '<p class="intro">Circuito simulado. Cada informe conserva su versión y cada transición deja rastro.</p>' +
      listadoInformes(db.pacientes);
  } else if (route === "recursos") {
    title = "Recursos de adherencia";
    html = recursos();
  } else if (route === "modelo") {
    title = "Modelo y reglas";
    html = modelo();
  } else html = panel();
  $("titulo").textContent = title;
  $("contenido").innerHTML =
    `<label class="no-print filtro">Fecha de corte de la evaluación<input id="corte" type="date" value="${fin}"></label>` +
    html;
  document
    .querySelectorAll("[data-pct]")
    .forEach((el) => (el.style.width = el.dataset.pct + "%"));
  $("corte").onchange = (ev) => {
    if (ev.target.value) {
      fin = ev.target.value;
      render();
    }
  };
}
$("nuevo").onclick = () =>
  modal(
    "Nuevo caso ficticio",
    campo(
      "nivel",
      "Nivel CMO asignado (simulado)",
      select("nivel", ["1", "2", "3"]),
    ),
    (v) => {
      guardar(crearPaciente(db, v.nivel));
      location.hash = "caso/" + db.pacientes.at(-1).id;
      tab = "resumen";
    },
  );
$("cerrar").onclick = () => $("modal").close();
document.addEventListener("click", async (ev) => {
  const bt = ev.target.closest("[data-tab]");
  if (bt) {
    tab = bt.dataset.tab;
    render();
    return;
  }
  const b = ev.target.closest("[data-action]");
  if (!b) return;
  const a = b.dataset.action,
    id = b.dataset.id,
    p = paciente();
  try {
    if (a === "abrir") {
      tab = "resumen";
      location.hash = "caso/" + id;
    }
    if (a === "tar") abrirSeleccionTar({ fin, modal, guardar: add });
    if (a === "nivel")
      modal(
        "Registrar nueva asignación CMO",
        campo(
          "nivel",
          "Nivel asignado (no se calcula)",
          select("nivel", ["1", "2", "3"]),
        ),
        (v) => add({ tipo: "nivel", ...v }),
      );
    if (a === "visita")
      modal(
        "Registrar visita sintética",
        campo(
          "fecha",
          "Fecha de visita",
          `<input name="fecha" type="date" value="${fin}" required>`,
        ) +
          Object.entries(EXPERIENCIA)
            .map(([k, v]) =>
              campo(
                k,
                {
                  barrera: "Barreras",
                  dificultad: "Dificultad de toma",
                  efecto: "Efectos adversos referidos",
                  carga: "Carga terapéutica percibida",
                  preferencia: "Preferencia de seguimiento",
                }[k],
                select(k, v),
              ),
            )
            .join(""),
        (v) => {
          const { fecha, ...experiencia } = v;
          add({ tipo: "visita", fecha, experiencia });
        },
      );
    if (a === "csv")
      modal(
        "Importar dispensaciones sintéticas",
        '<p class="muted">Use únicamente la plantilla de este caso. Validación completa antes de guardar; duplicados exactos se omiten y conflictos bloquean el lote.</p>' +
          campo(
            "archivo",
            "Archivo CSV (opcional)",
            `<input id="archivoCsv" type="file" accept=".csv,text/csv">`,
          ) +
          campo(
            "csv",
            "Contenido CSV",
            `<textarea name="csv" id="csv" required placeholder="fecha;episodio;componente;dias"></textarea>`,
          ),
        async (v) => {
          const r = importarCSV(p, v.csv);
          const bytes = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(v.csv),
          );
          const huella = Array.from(new Uint8Array(bytes), (b) =>
            b.toString(16).padStart(2, "0"),
          ).join("");
          add({ tipo: "importacion", fuente: "CSV sintético", huella, ...r });
          return `${r.filas.length} filas incorporadas; ${r.duplicadas.length} duplicadas omitidas.`;
        },
      );
    if (a === "plantilla") {
      const ep = episodios(p).at(-1);
      if (!ep) throw Error("Registre primero un TAR");
      descargar(
        "fecha;episodio;componente;dias\n" +
          componentes(ep)
            .map((c) => `${ep.fecha};${ep.id};${c};30`)
            .join("\n"),
        "dispensaciones-demo.csv",
        "text/csv",
      );
    }
    if (a === "actuacion") {
      const texto = biblioteca.niveles[nivel(p)].intervenciones[+id].texto;
      add({
        tipo: "actuacion",
        texto,
        estado: "pendiente",
        nivel: nivel(p),
        fuente: "CMO-VIH · preparadorconsulta 42402cb",
      });
    }
    if (a === "realizada")
      add({ tipo: "estado_actuacion", actuacion: id, estado: "realizada" });
    if (a === "revision")
      modal(
        "Revisión profesional simulada",
        campo(
          "resultado",
          "Resultado de la revisión",
          select("resultado", [
            "Requiere exploración",
            "Señal confirmada en simulación",
            "Señal descartada en simulación",
          ]),
        ),
        (v) =>
          add({
            tipo: "revision_alertas",
            fecha: fin,
            ...v,
            alertas: alertas(p, fin, reglas),
            reglas: { ...reglas },
          }),
      );
    if (a === "hoja-paciente")
      modal(
        "Crear hoja para el paciente",
        `<p class="muted">Escriba solo instrucciones sintéticas ya revisadas. No incluya nombres ni información real. CIMA no determina la pauta ni genera estas instrucciones.</p><label>Instrucciones específicas acordadas<textarea name="instrucciones" maxlength="2000" required placeholder="Redacte aquí los acuerdos e instrucciones del caso ficticio."></textarea></label><label>Próxima cita (opcional)<input name="proxima_cita" type="date" min="${fin}"></label><label class="check-line"><input type="checkbox" name="incluir_recurso" checked> Incluir MAPEX-ADHEFAR Hub como recurso complementario</label><label class="check-line"><input type="checkbox" name="revisado" required> He revisado las instrucciones y confirmo que solo contienen datos sintéticos.</label>`,
        (v) => {
          add(
            informePaciente(
              p,
              fin,
              {
                ...v,
                incluir_recurso: v.incluir_recurso === "on",
                revisado: v.revisado === "on",
              },
              reglas,
            ),
          );
          tab = "informes";
          render();
          return "Hoja guardada con instrucciones revisadas. Puede verla e imprimirla en Informes.";
        },
      );
    if (a === "informe") {
      add(informe(p, fin, reglas));
      tab = "informes";
      render();
      flash("Informe fijado. Comunicación pendiente; no se ha enviado.");
    }
    if (
      ["estado", "json-informe", "ver-informe", "copiar-informe"].includes(a)
    ) {
      const [pid, iid] = id.split("|"),
        pp = db.pacientes.find((p) => p.id === pid),
        i = pp.eventos.find((e) => e.id === iid);
      if (a === "estado") {
        const s = estadoComunicacion(pp, iid);
        guardar(
          anexar(db, pid, {
            tipo: "estado_comunicacion",
            informe: iid,
            estado: ESTADOS[ESTADOS.indexOf(s) + 1],
          }),
        );
      }
      if (a === "json-informe") descargar(i, `${pid}-informe.json`);
      if (a === "ver-informe") mostrarInforme(i);
      if (a === "copiar-informe") {
        mostrarInforme(i);
        await copiarHistoria(i);
      }
    }
    if (a === "exportar")
      descargar({ ...db, reglas }, "vihconectados-demo.json");
    if (a === "reglas")
      modal(
        "Parámetros demostrativos",
        campo(
          "ventana",
          "Ventana (1–730 días)",
          `<input name="ventana" type="number" min="1" max="730" value="${reglas.ventana}" required>`,
        ) +
          campo(
            "umbral",
            "Parámetro de señal (0–100 %)",
            `<input name="umbral" type="number" min="0" max="100" step="0.1" value="${reglas.umbral * 100}" required>`,
          ),
        (v) => {
          const r = {
            ...REGLAS,
            ventana: +v.ventana,
            umbral: +v.umbral / 100,
            version: "demo-local-" + Date.now(),
          };
          validarReglas(r);
          reglas = r;
          sessionStorage.setItem("vih.reglas", JSON.stringify(r));
          render();
        },
      );
  } catch (e) {
    $("mensaje").textContent = e.message;
    $("mensaje").className = "error";
  }
});
document.addEventListener("change", async (ev) => {
  if (ev.target.id === "archivoCsv") {
    const f = ev.target.files[0];
    if (f) {
      if (f.size > 100000) {
        $("errorForm").textContent = "Máximo 100 KB";
        return;
      }
      $("csv").value = await f.text();
    }
  }
});
window.addEventListener("hashchange", render);
try {
  [biblioteca, guia] = await Promise.all(
    ["biblioteca-vih", "guia-vih"].map(async (n) => {
      const r = await fetch(`datos/${n}.json`);
      if (!r.ok) throw Error("No se pudo cargar la biblioteca");
      return r.json();
    }),
  );
  db = repo.leer();
  if (!localStorage.getItem(repo.key)) {
    db = demo();
    repo.guardar(db);
  }
  const r = sessionStorage.getItem("vih.reglas");
  if (r) {
    reglas = JSON.parse(r);
    validarReglas(reglas);
  }
  render();
} catch (e) {
  $("contenido").textContent =
    "No se pudo iniciar: " + e.message + ". No se han borrado sus datos.";
}
