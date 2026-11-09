/** Corte efectivo inclusivo para hechos; la cobertura mantiene su final exclusivo. */
export const fechaEfectiva = e => e.fecha || e.registrado?.slice(0, 10) || null;
export const aplicable = (e, fin) => !fin || (!!fechaEfectiva(e) && fechaEfectiva(e) <= fin);
export function eventosHasta(p, fin) {
  return p.eventos.filter(e => e.tipo === 'importacion'
    ? e.filas?.some(f => f.fecha <= fin) || e.entradas?.some(f => f.fecha <= fin)
    : aplicable(e, fin));
}
export function ultimoEvento(p, tipo, fin) {
  return p.eventos.filter(e => e.tipo === tipo && aplicable(e, fin))
    .sort((a,b) => (fechaEfectiva(a) || '').localeCompare(fechaEfectiva(b) || '')).at(-1);
}
export const tratamientoHasta = (p, fin) => ultimoEvento(p, 'tratamiento', fin);
export const nivelHasta = (p, fin) => ultimoEvento(p, 'nivel', fin)?.nivel || null;
