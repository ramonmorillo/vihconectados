import { buscar, ficha, CIMA_WEB } from "./cima.js";
import { crearSeleccionTar } from "./seleccion-tar.js";
import { esc } from "./vista-informes.js";
/** Selección explícita, solo consulta de catálogo; nunca se transmiten datos del caso. */
export function abrirSeleccionTar({ fin, modal, guardar }) {
  const seleccion = crearSeleccionTar();
  let resultados = [],
    consulta = 0;
  modal(
    "Registrar TAR desde CIMA",
    `
    <label>Fecha de inicio<input name="fecha" type="date" required value="${fin}"></label>
    <div class="notice">Consulte el catálogo oficial AEMPS y seleccione todos los medicamentos del TAR del caso ficticio (hasta 8). Puede buscar y añadir un segundo fármaco sin perder el primero. No se verifican dosis, interacciones ni adecuación del régimen.</div>
    <p><a href="${CIMA_WEB}" target="_blank" rel="noopener noreferrer">Abrir CIMA · AEMPS ↗</a></p>
    <label>Medicamento o principio activo<input id="consultaCima" maxlength="100" autocomplete="off" placeholder="Ej.: nombre comercial o principio activo"></label>
    <button type="button" id="buscarCima">Buscar en CIMA</button>
    <p id="estadoCima" role="status" aria-live="polite" class="muted">La búsqueda envía solo el texto del medicamento a CIMA. No escriba datos personales.</p>
    <div id="resultadosCima"></div><div id="fichaCima"></div>
    <h3>TAR seleccionado</h3><div id="seleccionCima"></div>
    <button type="button" id="otroMedicamento" hidden>+ Añadir otro medicamento</button>
    <p class="notice">Se admiten TAR orales e intramusculares. El registro de un TAR inyectable no calcula PDC, dosis, fechas de administración ni ventanas de inyección. No mezcle fases orales e inyectables en el mismo episodio.</p>
    <label class="check-line"><input type="checkbox" name="confirmado" required> He revisado que la selección corresponde al TAR completo del caso ficticio.</label>
    <p class="muted">El nuevo episodio conserva los tratamientos anteriores y corta el arrastre de sobrantes. Seleccionar un medicamento no constituye una prescripción.</p>`,
    (v) => {
      guardar(seleccion.eventoTratamiento({ fecha: v.fecha, confirmado: v.confirmado === "on" }));
    },
  );
  const $ = (id) => document.getElementById(id),
    form = $("formulario").querySelector("form");
  const vigente = () =>
    form.isConnected && document.getElementById("modal").open;
  const dibujar = () => {
    $("otroMedicamento").hidden = !seleccion.lista().length;
    form.querySelector("[name=confirmado]").checked = false;
    $("seleccionCima").innerHTML =
      seleccion
        .lista()
        .map(
          (m, i) =>
            `<div class="selected-med"><div><strong>${i+1}. ${esc(m.nombre)}</strong><p class="muted">${esc(m.vias.join(" · "))} · ${esc(m.presentacion)} · CN ${esc(m.cn)}<br>Registro ${esc(m.nregistro)} · Consultado ${esc(m.consultado.slice(0, 10))}</p></div><button type="button" data-quitar-cima="${i}" aria-label="Quitar ${esc(m.nombre)}">Quitar</button></div>`,
        )
        .join("") || '<p class="muted">Sin medicamentos seleccionados.</p>';
  };
  dibujar();
  $("otroMedicamento").onclick = () => {
    ++consulta;
    fichaActiva = null;
    $("consultaCima").value = "";
    $("resultadosCima").innerHTML = "";
    $("fichaCima").innerHTML = "";
    $("consultaCima").focus();
  };
  $("buscarCima").onclick = async () => {
    const turno = ++consulta;
    fichaActiva = null;
    $("buscarCima").disabled = true;
    $("estadoCima").textContent = "Consultando CIMA…";
    $("resultadosCima").innerHTML = "";
    $("fichaCima").innerHTML = "";
    try {
      const r = await buscar($("consultaCima").value);
      if (!vigente() || turno !== consulta) return;
      resultados = r.medicamentos;
      $("estadoCima").textContent =
        (r.parcial ? "Búsqueda parcial: una consulta no respondió. " : "") +
        (resultados.length
          ? "Seleccione un resultado para revisar su ficha y presentación."
          : "Sin resultados. Pruebe otro nombre o consulte la web oficial.");
      $("resultadosCima").innerHTML = resultados
        .map(
          (m, i) =>
            `<button type="button" class="cima-result" data-ficha-cima="${i}">${esc(m.nombre)}<small>Registro ${esc(m.nregistro)}${m.comerc ? "" : " · No comercializado"}</small></button>`,
        )
        .join("");
    } catch (e) {
      if (vigente()) $("estadoCima").textContent = e.message;
    } finally {
      if (vigente()) $("buscarCima").disabled = false;
    }
  };
  $("consultaCima").onkeydown = (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      if (!$("buscarCima").disabled) $("buscarCima").click();
    }
  };
  let fichaActiva = null;
  form.addEventListener("click", async (ev) => {
    const quitar = ev.target.closest("[data-quitar-cima]");
    if (quitar) {
      seleccion.quitar(+quitar.dataset.quitarCima);
      dibujar();
      return;
    }
    const bt = ev.target.closest("[data-ficha-cima]");
    if (bt) {
      const turno = ++consulta;
      fichaActiva = null;
      $("fichaCima").innerHTML = '<p class="muted">Cargando ficha oficial…</p>';
      try {
        const f = await ficha(resultados[+bt.dataset.fichaCima].nregistro, fetch, { permitirInyectable: true });
        if (!vigente() || turno !== consulta) return;
        fichaActiva = f;
        $("fichaCima").innerHTML =
          `<section class="cima-detail"><h3>${esc(f.nombre)}</h3><p>${esc(f.principios)}</p><p class="muted">${esc(f.vias.join(" · "))} · ATC ${esc(f.atc.join(", "))}</p><p><a href="${esc(f.ficha)}" target="_blank" rel="noopener noreferrer">Ficha técnica AEMPS ↗</a></p>${f.presentaciones.length ? `<label>Presentación comercializada<select id="presentacionCima">${f.presentaciones.map((p, i) => `<option value="${i}">${esc(p.nombre)} · CN ${esc(p.cn)}</option>`).join("")}</select></label><button type="button" id="anadirCima">Añadir al TAR</button>` : "<p>No hay presentaciones comercializadas disponibles. Revise en CIMA.</p>"}</section>`;
      } catch (e) {
        if (vigente() && turno === consulta)
          $("fichaCima").textContent = e.message;
      }
    }
    if (ev.target.closest("#anadirCima") && fichaActiva) {
      const r = seleccion.anadir(fichaActiva, +$("presentacionCima").value);
      if (r.ok) dibujar();
      $("estadoCima").textContent = r.mensaje;
    }
  });
}
