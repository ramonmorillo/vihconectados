# Consulta guiada y seguimiento del plan

Segundo incremento asistencial sobre `9ea90ff` (PR #4 integrada). No había PR abiertas al iniciar. Conserva la interfaz, las rutas y los registros anteriores; no migra visitas ni actuaciones antiguas a planes que nunca se registraron.

## Recorrido

En Resumen o Consulta y plan de un caso, pulse **Iniciar consulta guiada**:

1. Revisar fecha efectiva, TAR, nivel y cobertura del corte, con confirmación expresa de contexto.
2. Vincular la última experiencia aplicable o registrar una nueva. Opcionalmente registrar valoración manual de adherencia con periodo, método y porcentaje declarado. Reutilizar no duplica registros; no disponer de experiencia deja el vínculo vacío y no inventa una visita.
3. Seleccionar problema, redactar objetivo y crear una actuación pendiente o vincular una ya existente. La biblioteca CMO se ofrece como texto opcional, no como recomendación automática.
4. Acordar responsable funcional y fecha de revisión, revisar el resumen y confirmar el plan.

Anterior/Siguiente conservan los campos. Cancelar o fallar cualquier validación no escribe parcialmente en el repositorio. El comando construye los eventos en memoria y guarda una sola vez tras validarlos todos. Cada plan contiene un problema y un objetivo; se admiten planes independientes por caso.

## Modelo y semántica

- `consulta`: fecha efectiva, problema, objetivo, responsable, revisión, confirmación, vínculos a visita/valoración/actuación y contexto de cálculo del corte. El contexto se calcula en el comando de almacenamiento, no se acepta como un dato libre de la interfaz.
- `seguimiento_consulta`: fecha efectiva, en curso/cerrada, resultado, observaciones, responsable y próxima revisión para planes en curso. Conserva los seguimientos previos.
- Actuación realizada y objetivo alcanzado son datos distintos. Guardar un plan nuevo no realiza su actuación. En seguimiento existe una confirmación opcional independiente para marcarla realizada; el cierre no lo hace implícitamente.
- Cerrar requiere resultado explícito (incluye no evaluable) y fundamento. Un plan cerrado no se reabre en este incremento: se inicia otro para un acuerdo nuevo. Un seguimiento no puede preceder a la consulta ni al anterior; tampoco adelanta una realización posterior de la actuación.
- Todas las vistas respetan el corte efectivo. Si existen seguimientos posteriores, una vista histórica no ofrece registrar uno nuevo hasta avanzar el corte.
- Los informes profesionales incluyen los planes aplicables a su corte; las instantáneas guardadas no se recalculan. No se cambia el PDC por registrar planes o seguimientos.

## Bandeja

**Consulta y seguimiento** (`#seguimiento`) muestra planes activos, revisiones vencidas, para el corte, próximas o cerradas. Se filtra por responsable y se ordena cronológicamente, sin prioridad clínica automática. La fecha de referencia es el corte visible, no un reloj oculto. El panel clásico incorpora un enlace con el número de planes activos y revisiones vencidas.

Los responsables son funciones simuladas (Farmacia Hospitalaria, Infecciosas, equipo compartido), no usuarios reales ni mensajes enviados. No hay asignación institucional, agenda de citas externa, autenticación, recordatorios enviados ni backend. Las fechas se acuerdan manualmente: no se derivan de umbrales o protocolos clínicos nuevos.

## Compatibilidad de ejemplos

Al probar en un día posterior al corte fijo de la demo se detectó que nivel, actuaciones y estados de sus ejemplos nuevos dependían de la fecha de generación. El constructor ahora declara sus fechas efectivas sintéticas (nivel 2026-05-01; actuaciones/estados 2026-11-08). Se mantienen los timestamps reales de creación. Esto solo afecta a escenarios nuevos: no se escriben fechas en casos ya guardados ni se sustituyen sus informes.

## Verificación

- `npm test`: 55 pruebas superadas, siete nuevas en `pruebas/consulta.test.mjs` sobre atomicidad, vínculos, independencia de resultados/ejecución, agenda y corte, validación, conservación de PDC/informes, escape y fechas de escenarios.
- `npm run check`: incluye los tres módulos nuevos.
- Los cinco recorridos de navegador existentes pasan (clásico, público, desktop, manual y confianza), incluidos PDF y persistencia.
- `pruebas/consulta.mjs`, añadido a test:browser: cancelar sin escribir, cuatro pasos con vuelta atrás, experiencia/valoración nuevas, plan y responsable, filtros de bandeja, ejecución sin cierre automático, cierre con resultado, lectura histórica, informes congelados, escape HTML, teclado y 1440/390px sin desbordamiento global. Sin errores de consola ni solicitudes externas.
- Capturas inspeccionadas: `/tmp/vih-consulta-guiada.png`, `/tmp/vih-agenda-seguimiento.png`.

No se añaden dependencias, analíticas, umbrales, reglas de TAR inyectable ni integraciones clínicas. La validación es de software y usabilidad básica, no una validación clínica ni una auditoría WCAG completa. Sin merge ni despliegue.
