/** Motor demostrativo v1. Fechas UTC; intervalos [inicio, fin). Sin inferencia de toma. */
export const VERSION = "0.2.0";
export const REGLAS = Object.freeze({
  version: "demo-1",
  ventana: 180,
  umbral: 0.9,
  validacion: "Pendiente de validación profesional",
});
export const CATALOGOS = Object.freeze({
  TAR_A: ["A"],
  TAR_B: ["B"],
  TAR_CD: ["C", "D"],
});
export const EXPERIENCIA = Object.freeze({
  barrera: [
    "No explorada",
    "Sin barreras referidas",
    "Olvidos",
    "Acceso a la dispensación",
    "Privacidad",
  ],
  dificultad: [
    "No explorada",
    "Sin dificultad referida",
    "Horario",
    "Deglución",
  ],
  efecto: [
    "No explorado",
    "Sin efectos referidos",
    "Molestias digestivas",
    "Alteración del sueño",
  ],
  carga: ["No explorada", "Baja", "Moderada", "Alta"],
  preferencia: [
    "No explorada",
    "Consulta presencial",
    "Seguimiento telefónico simulado",
  ],
});
export const ESTADOS = [
  "pendiente",
  "comunicado",
  "recibido",
  "valorado",
  "resuelto",
];
export function fecha(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) throw Error("Fecha no válida");
  const n = Date.parse(s + "T00:00:00Z");
  if (!Number.isFinite(n) || new Date(n).toISOString().slice(0, 10) !== s)
    throw Error("Fecha no válida");
  return n / 86400000;
}
export const iso = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
export function validarReglas(r) {
  if (
    !Number.isInteger(r.ventana) ||
    r.ventana < 1 ||
    r.ventana > 730 ||
    !Number.isFinite(r.umbral) ||
    r.umbral < 0 ||
    r.umbral > 1
  )
    throw Error("Parámetros fuera de rango");
}
export function episodios(p) {
  return p.eventos
    .filter((e) => e.tipo === "tratamiento")
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
/** Una combinación fija CIMA es una unidad dispensable; un TAR con varios fármacos exige todos. */
export function componentes(ep) {
  return ep?.medicamentos?.length
    ? ep.medicamentos.map((m) => "CIMA-" + m.nregistro)
    : CATALOGOS[ep?.tar] || [];
}
export function nombreTar(ep) {
  return (
    ep?.medicamentos?.map((m) => m.nombre).join(" + ") || ep?.tar || "Sin TAR"
  );
}
export function nivel(p) {
  return p.eventos.filter((e) => e.tipo === "nivel").at(-1)?.nivel || "3";
}
export function dispensaciones(p) {
  return p.eventos
    .filter((e) => e.tipo === "importacion")
    .flatMap((e) => e.filas);
}
/** CSV deliberadamente cerrado: no admite texto libre, datos identificativos ni columnas adicionales. */
export function importarCSV(p, texto) {
  if (texto.length > 100000)
    throw Error("CSV demasiado grande (máximo 100 KB)");
  const lineas = texto
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);
  if (lineas.shift() !== "fecha;episodio;componente;dias")
    throw Error("Cabecera requerida: fecha;episodio;componente;dias");
  if (!lineas.length || lineas.length > 1000)
    throw Error("Se requieren entre 1 y 1000 filas");
  const eps = episodios(p),
    prev = dispensaciones(p),
    filas = [],
    duplicadas = [];
  lineas.forEach((l, i) => {
    const cols = l.split(";");
    if (cols.length !== 4)
      throw Error(`Fila ${i + 2}: se requieren cuatro columnas`);
    const [f, ep, c, d] = cols;
    fecha(f);
    const idx = eps.findIndex((e) => e.id === ep),
      e = eps[idx];
    if (
      !e ||
      !componentes(e).includes(c) ||
      f < e.fecha ||
      (eps[idx + 1] && f >= eps[idx + 1].fecha)
    )
      throw Error(`Fila ${i + 2}: episodio, componente o fecha incompatibles`);
    if (!/^\d+$/.test(d) || +d < 1 || +d > 400)
      throw Error(`Fila ${i + 2}: días entre 1 y 400`);
    const fila = {
      fecha: f,
      episodio: ep,
      componente: c,
      dias: +d,
      linea: i + 2,
    };
    const todos = [...prev, ...filas];
    const misma = todos.find(
      (x) => x.fecha === f && x.episodio === ep && x.componente === c,
    );
    if (misma) {
      if (misma.dias !== +d)
        throw Error(
          `Fila ${i + 2}: conflicto con dispensación existente; no se sobrescribe`,
        );
      duplicadas.push(i + 2);
    } else filas.push(fila);
  });
  return { filas, duplicadas };
}
export function cobertura(p, fin, r = REGLAS) {
  validarReglas(r);
  const end = fecha(fin),
    eps = episodios(p),
    ds = dispensaciones(p);
  const inicio = Math.max(
    end - r.ventana,
    eps.length ? fecha(eps[0].fecha) : end,
  );
  const detalle = [];
  let cubiertos = 0,
    total = 0;
  eps.forEach((ep, i) => {
    const a = Math.max(inicio, fecha(ep.fecha)),
      b = Math.min(end, eps[i + 1] ? fecha(eps[i + 1].fecha) : end);
    if (b <= a) return;
    const comps = componentes(ep);
    if (!comps.length)
      throw Error(
        "Episodio sin componentes: revise los datos antes de calcular cobertura.",
      );
    const sets = comps.map((c) => {
      const set = new Set();
      let libre = -Infinity;
      ds.filter(
        (d) =>
          d.episodio === ep.id && d.componente === c && fecha(d.fecha) < end,
      )
        .sort((x, y) => x.fecha.localeCompare(y.fecha))
        .forEach((d) => {
          const start = Math.max(fecha(d.fecha), libre);
          libre = start + d.dias;
          for (let t = Math.max(start, a); t < Math.min(libre, b); t++)
            set.add(t);
        });
      return set;
    });
    let n = 0;
    for (let t = a; t < b; t++) if (sets.every((s) => s.has(t))) n++;
    cubiertos += n;
    total += b - a;
    detalle.push({
      episodio: ep.id,
      tar: nombreTar(ep),
      inicio: iso(a),
      fin_exclusivo: iso(b),
      cubiertos: n,
      total: b - a,
    });
  });
  return {
    indicador: "Cobertura de dispensación del TAR oral completo (PDC)",
    fin_exclusivo: fin,
    inicio: iso(inicio),
    cubiertos,
    total,
    pdc: total ? cubiertos / total : null,
    detalle,
    reglas: { ...r },
    version: VERSION,
  };
}
export function alertas(p, fin, r = REGLAS) {
  const c = cobertura(p, fin, r),
    lista = [];
  if (c.pdc === null)
    lista.push({
      regla: "sin_datos",
      texto: "Sin intervalo evaluable; cobertura no calculada.",
    });
  else if (c.pdc < r.umbral)
    lista.push({
      regla: "cobertura_demo",
      texto: `Cobertura ${c.cubiertos}/${c.total} días por debajo del parámetro demostrativo ${Math.round(r.umbral * 100)} %. No acredita falta de toma.`,
    });
  const eps = episodios(p);
  const fuera = dispensaciones(p).filter((d) => {
    const i = eps.findIndex((e) => e.id === d.episodio);
    return (
      d.fecha < fin &&
      (i < 0 ||
        d.fecha < eps[i].fecha ||
        (eps[i + 1] && d.fecha >= eps[i + 1].fecha))
    );
  });
  if (fuera.length)
    lista.push({
      regla: "datos_fuera_episodio",
      texto: `${fuera.length} dispensaciones fuera del episodio tras un cambio TAR. Se conservan y no aportan cobertura; conciliar los datos.`,
    });
  const v = p.eventos
    .filter((e) => e.tipo === "visita" && e.fecha <= fin)
    .at(-1);
  if (
    v &&
    [
      v.experiencia.barrera,
      v.experiencia.dificultad,
      v.experiencia.efecto,
    ].some(
      (x) =>
        ![
          "No explorada",
          "No explorado",
          "Sin barreras referidas",
          "Sin dificultad referida",
          "Sin efectos referidos",
        ].includes(x),
    )
  )
    lista.push({
      regla: "experiencia_referida",
      texto:
        "Existe una dificultad o efecto referido en el caso sintético; requiere exploración profesional.",
    });
  return lista.map((x) => ({
    ...x,
    version: r.version,
    estado: "Pendiente de validación profesional",
  }));
}
export function transicion(actual, siguiente) {
  if (ESTADOS.indexOf(siguiente) !== ESTADOS.indexOf(actual) + 1)
    throw Error("Transición no permitida");
  return siguiente;
}
export function estadoComunicacion(p, id) {
  return (
    p.eventos
      .filter((e) => e.tipo === "estado_comunicacion" && e.informe === id)
      .at(-1)?.estado || "pendiente"
  );
}
