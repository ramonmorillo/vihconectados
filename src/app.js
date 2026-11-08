import {
  REGLAS,
  CATALOGOS,
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
import { informe, textoInforme } from "./informes.js";
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
        return `<tr><td><strong>${p.id}</strong><br><small class="muted">${episodios(p).at(-1)?.tar || "Sin TAR"}</small></td><td>${badge("Nivel " + nivel(p))}</td><td>${pct(c)}<div class="bar"><div class="bar-fill" data-pct="${c.pdc === null ? 0 : c.pdc * 100}"></div></div></td><td>${badge(a.length ? a.length + " señales" : "Sin señales", !!a.length)}</td><td>${boton("abrir", "Ver caso", p.id)}</td></tr>`;
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
          .filter((e) => e.tipo === "informe")
          .map((i) => {
            const s = estadoComunicacion(p, i.id),
              next = ESTADOS[ESTADOS.indexOf(s) + 1];
            return `<article class="card"><div class="section-head"><h2>${p.id} · ${i.fecha}</h2>${badge(s)}</div><p class="muted">Informe congelado · revisión profesional pendiente al generar · sin envío real</p><div class="actions">${boton("ver-informe", "Ver e imprimir", p.id + "|" + i.id)}${boton("json-informe", "Descargar JSON", p.id + "|" + i.id)}${next ? boton("estado", "Simular: " + next, p.id + "|" + i.id) : ""}</div><details><summary>Trazabilidad de comunicación</summary><p class="muted">${i.registrado} · pendiente</p>${p.eventos
              .filter(
                (e) => e.tipo === "estado_comunicacion" && e.informe === i.id,
              )
              .map((e) => `<p class="muted">${e.registrado} · ${e.estado}</p>`)
              .join("")}</details></article>`;
          }),
      )
      .join("") ||
    '<div class="card empty">Sin informes. Genere uno desde el resumen de un caso.</div>'
  );
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
    html += `<div class="grid"><section class="card"><div class="section-head"><h2>Situación del caso</h2>${badge("CMO " + nivel(p))}</div><p>Tratamiento actual: <strong>${episodios(p).at(-1)?.tar || "Sin registrar"}</strong></p><p>Cobertura hasta ${fin} (excluido): <strong>${pct(c)}</strong> · ${c.cubiertos}/${c.total} días</p><div class="actions">${boton("tar", "Registrar cambio TAR")}${boton("nivel", "Registrar nivel CMO")}${boton("informe", "Generar informe simulado")}</div><h3>Señales explicables</h3>${a.map((x) => `<div class="notice warning"><strong>${esc(x.texto)}</strong><br><small>${esc(x.regla)} · ${esc(x.version)} · ${x.estado}</small></div>`).join("") || '<p class="muted">Sin señales bajo la configuración actual. No equivale a ausencia de problemas.</p>'}<div class="actions">${boton("revision", "Registrar revisión profesional simulada")}</div><p class="muted">${p.eventos
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
          `<div class="event"><time>${esc(e.fecha || e.registrado?.slice(0, 10))}</time><p><strong>${esc({ nivel: "Nivel CMO", tratamiento: "Inicio de episodio TAR", visita: "Visita y experiencia", importacion: "Importación de dispensaciones", actuacion: "Actuación CMO", informe: "Informe para Infecciosas", estado_comunicacion: "Estado de comunicación", estado_actuacion: "Actuación realizada", revision_alertas: "Revisión profesional simulada" }[e.tipo] || e.tipo)}</strong> ${esc(e.tar || e.nivel || e.estado || e.texto || "")}</p><small>Registro ${esc(e.id)} · ${esc(e.registrado)}</small>${e.tipo === "importacion" ? `<p>${e.filas.length} filas aceptadas · ${e.duplicadas.length} duplicadas · lote ${esc(e.huella || e.fuente)}</p>` : ""}</div>`,
      )
      .join("")}</section>`;
  if (tab === "adherencia")
    html += `<section class="card"><div class="section-head"><h2>Cobertura del TAR oral completo</h2>${boton("csv", "Importar CSV")}</div><p class="muted">Ventana ${reglas.ventana} días; final excluido. Arrastre dentro del mismo episodio y componente, sin traslado entre TAR. En pautas multicomponente deben coincidir todos los componentes.</p><p><strong>${pct(c)}</strong> · ${c.cubiertos} días cubiertos / ${c.total} días evaluables</p><div class="table-wrap"><table><thead><tr><th>Episodio</th><th>Intervalo [inicio, fin)</th><th>Días cubiertos</th></tr></thead><tbody>${c.detalle.map((d) => `<tr><td>${d.tar}<br><small>${d.episodio}</small></td><td>${d.inicio} → ${d.fin_exclusivo}</td><td>${d.cubiertos}/${d.total}</td></tr>`).join("")}</tbody></table></div><div class="actions">${boton("plantilla", "Descargar CSV de ejemplo")}</div><p class="muted">Los componentes A, B, C y D son etiquetas ficticias; los días se declaran expresamente. No se calcula dosis ni equivalencia terapéutica.</p></section>`;
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
      `<div class="actions">${boton("informe", "Generar informe simulado")}</div>` +
      listadoInformes([p]);
  return html;
}
function modelo() {
  return `<section class="card"><h2>Modelo CMO-MAPEX</h2><p class="intro">Capacidad, Motivación y Oportunidad: la tecnología apoya la continuidad de la atención, y la valoración corresponde al profesional.</p><h3>Reglas de demostración · ${esc(reglas.version)}</h3><p>Ventana: ${reglas.ventana} días · Parámetro de señal: ${Math.round(reglas.umbral * 100)} %</p><p class="muted">Proceden de reglas v0.2.0 del preparador: pendientes de validación. La cobertura usa inicio de tratamiento explícito y unión por componente con intersección del TAR completo. No estima ingesta, supresión virológica ni riesgo clínico. No incluye TAR inyectable, hospitalizaciones ni dispensación externa.</p>${boton("reglas", "Configurar parámetros de demostración")}<h3>Privacidad y almacenamiento</h3><p class="muted">Sin nombres, documentos, contactos o notas libres. Los casos se generan con prefijo DEMO. Los datos se guardan en este navegador; no hay envío, analítica, backend clínico o API generativa. El almacenamiento local no ofrece las garantías de un sistema sanitario.</p><h3>Fuentes y autoría</h3><p class="muted">Autor: Dr. Ramón Morillo Verdugo. Adaptaciones CMO: Sociedad Española de Farmacia Hospitalaria (SEFH). Biblioteca y guion conservan sus metadatos originales. No se declara validación clínica ni licencia de terceros no otorgada.</p><div class="actions">${boton("exportar", "Exportar demostración JSON")}</div></section>`;
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
    if (a === "tar")
      modal(
        "Registrar inicio o cambio de TAR",
        campo(
          "fecha",
          "Fecha de inicio",
          `<input name="fecha" type="date" required value="${fin}">`,
        ) +
          campo(
            "tar",
            "Pauta oral sintética",
            select("tar", Object.keys(CATALOGOS)),
          ) +
          '<p class="muted">Un nuevo inicio cierra el episodio previo a esa fecha. Los sobrantes no se trasladan. No edita dispensaciones ni informes anteriores.</p>',
        (v) => add({ tipo: "tratamiento", ...v }),
      );
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
          CATALOGOS[ep.tar]
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
    if (a === "informe") {
      add(informe(p, fin, reglas));
      tab = "informes";
      render();
      flash("Informe fijado. Comunicación pendiente; no se ha enviado.");
    }
    if (["estado", "json-informe", "ver-informe"].includes(a)) {
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
      if (a === "ver-informe") {
        $("formulario").innerHTML =
          `<h2 id="modalTitle">Informe estructurado · Simulación</h2><pre>${esc(textoInforme(i))}</pre><button id="imprimir">Imprimir / PDF</button>`;
        $("modal").showModal();
        $("imprimir").onclick = () => {
          const before = $("contenido").innerHTML;
          $("modal").close();
          $("contenido").innerHTML =
            `<h2>Informe de demostración</h2><pre>${esc(textoInforme(i))}</pre>`;
          window.print();
          $("contenido").innerHTML = before;
          render();
        };
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
