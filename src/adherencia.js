import { fecha } from './motor.js';
export const METODOS_ADHERENCIA = ['Autoinforme', 'Entrevista clínica', 'Registro externo revisado'];
export const RESULTADOS_ADHERENCIA = ['No concluyente', 'Sin dificultades referidas', 'Dificultades referidas'];
/** Valoración declarada por el profesional: no es PDC ni prueba objetiva de ingesta. */
export function validarEvaluacionAdherencia(e) {
  if (!METODOS_ADHERENCIA.includes(e.metodo) || !RESULTADOS_ADHERENCIA.includes(e.resultado))
    throw Error('Método o resultado de adherencia no válido.');
  const evaluacion = fecha(e.fecha), inicio = fecha(e.periodo_inicio), fin = fecha(e.periodo_fin);
  if (inicio >= fin || fin > evaluacion)
    throw Error('El periodo [inicio, fin) debe ser positivo y terminar como máximo en la fecha de evaluación.');
  if (e.porcentaje !== null && (typeof e.porcentaje !== 'number' || !Number.isFinite(e.porcentaje) || e.porcentaje < 0 || e.porcentaje > 100))
    throw Error('El porcentaje manual debe estar entre 0 y 100, o quedar sin estimar.');
}
export function evaluacionesAdherencia(p, fin) {
  return p.eventos.filter(e => e.tipo === 'evaluacion_adherencia' && e.fecha <= fin).sort((a,b) => a.fecha.localeCompare(b.fecha));
}
export const ultimaEvaluacionAdherencia = (p, fin) => evaluacionesAdherencia(p, fin).at(-1);
export function textoEvaluacionAdherencia(e) {
  if (!e) return 'Sin valoración manual registrada para esta fecha.';
  return `${e.fecha} · ${e.metodo} · ${e.resultado} · ${e.porcentaje === null ? 'Porcentaje sin estimar' : e.porcentaje + ' % declarado'} · Periodo [${e.periodo_inicio}, ${e.periodo_fin}). Información referida o revisada; no confirma objetivamente la toma y no sustituye el PDC.`;
}
