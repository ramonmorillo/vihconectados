/** Adaptador de catálogo público AEMPS. Nunca recibe objetos de paciente ni instrucciones. */
export const CIMA_BASE = "https://cima.aemps.es/cima/rest";
export const CIMA_WEB = "https://cima.aemps.es/cima/publico/home.html";
export const enlaceCima = (n) =>
  `https://cima.aemps.es/cima/dochtml/ft/${encodeURIComponent(n)}/FT_${encodeURIComponent(n)}.html`;
const texto = (v) => String(v ?? "").slice(0, 500);
export function urlAemps(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "cima.aemps.es"
      ? u.href
      : "";
  } catch {
    return "";
  }
}
// Filtro de catálogo, no validación de indicación, dosis, interacciones ni TAR completo.
export function esTarOral(m) {
  return (
    m.oral === true &&
    m.atc.some((c) => /^(J05A(E|F|G|J|R)|J05AX(08|09|12|29)$)/.test(c))
  );
}
export function normalizarFicha(m, consultado = new Date().toISOString()) {
  if (!/^\d{4,15}$/.test(String(m.nregistro)) || !m.nombre)
    throw Error("Ficha CIMA incompleta");
  const vias = (m.viasAdministracion || []).map((v) => texto(v.nombre));
  const docs = m.docs || [];
  return {
    nregistro: String(m.nregistro),
    nombre: texto(m.nombre),
    fuente: "CIMA · AEMPS",
    consultado,
    principios: (m.principiosActivos || [])
      .map((p) => texto(p.nombre))
      .join(" / "),
    atc: (m.atcs || []).map((a) => texto(a.codigo)),
    vias,
    oral: vias.some((v) => /oral/i.test(v) && !/parenteral|bucal/i.test(v)),
    ficha:
      urlAemps(docs.find((d) => Number(d.tipo) === 1)?.url) ||
      enlaceCima(m.nregistro),
    prospecto: urlAemps(docs.find((d) => Number(d.tipo) === 2)?.url),
    presentaciones: (m.presentaciones || [])
      .filter((p) => p.comerc === true)
      .map((p) => ({ cn: texto(p.cn), nombre: texto(p.nombre) })),
  };
}
async function pedir(path, fetcher = fetch) {
  const r = await fetcher(CIMA_BASE + path, {
    headers: { Accept: "application/json" },
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok)
    throw Error(
      `CIMA no disponible (HTTP ${r.status}). Reintente o consulte su web oficial.`,
    );
  return r.json();
}
export async function buscar(textoBusqueda, fetcher = fetch) {
  const q = String(textoBusqueda || "").trim();
  if (q.length < 3 || q.length > 100 || /[\r\n;]/.test(q))
    throw Error(
      "Busque solo el nombre de un medicamento o principio activo (3–100 caracteres).",
    );
  const resultados = await Promise.allSettled(
    ["nombre", "practiv1"].map((k) =>
      pedir(`/medicamentos?${k}=${encodeURIComponent(q)}`, fetcher),
    ),
  );
  if (resultados.every((r) => r.status === "rejected"))
    throw Error(
      "No se pudo conectar con CIMA. No se ha registrado medicación. Puede abrir la web oficial y volver a intentarlo.",
    );
  const mapa = new Map();
  for (const r of resultados)
    if (r.status === "fulfilled")
      for (const m of r.value.resultados || []) {
        if (/^\d{4,15}$/.test(String(m.nregistro)))
          mapa.set(String(m.nregistro), {
            nregistro: String(m.nregistro),
            nombre: texto(m.nombre),
            comerc: !!m.comerc,
          });
      }
  return {
    medicamentos: [...mapa.values()]
      .sort(
        (a, b) =>
          Number(b.comerc) - Number(a.comerc) ||
          a.nombre.localeCompare(b.nombre, "es"),
      )
      .slice(0, 25),
    parcial: resultados.some((r) => r.status === "rejected"),
  };
}
export async function ficha(nregistro, fetcher = fetch) {
  if (!/^\d{4,15}$/.test(String(nregistro)))
    throw Error("Registro CIMA no válido");
  const m = normalizarFicha(
    await pedir(
      `/medicamento?nregistro=${encodeURIComponent(nregistro)}`,
      fetcher,
    ),
  );
  if (m.nregistro !== String(nregistro))
    throw Error("La ficha recibida no corresponde al registro seleccionado.");
  if (!esTarOral(m))
    throw Error(
      "La ficha no permite confirmar un antirretroviral oral con el filtro de catálogo. Revise la vía y ATC en CIMA. No se ha añadido.",
    );
  return m;
}
export function validarMedicamentos(ms) {
  if (!Array.isArray(ms) || !ms.length || ms.length > 8)
    throw Error(
      "Seleccione entre 1 y 8 medicamentos de CIMA para el TAR completo.",
    );
  const ids = new Set();
  for (const m of ms) {
    if (
      !/^\d{4,15}$/.test(m.nregistro) ||
      !m.nombre ||
      !Array.isArray(m.atc) ||
      !esTarOral(m) ||
      !Number.isFinite(Date.parse(m.consultado)) ||
      !urlAemps(m.ficha) ||
      !m.cn ||
      !m.presentacion
    )
      throw Error(
        "Medicamento CIMA incompleto: confirme ficha y presentación.",
      );
    if (ids.has(m.nregistro))
      throw Error("El mismo medicamento no puede repetirse en el TAR.");
    ids.add(m.nregistro);
  }
}
