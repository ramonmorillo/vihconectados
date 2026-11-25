# Validación técnica ejecutada

## Actuación A15 · Modelo de evidencia y triangulación (2026-11-25)

Ver `docs/strategy/EVIDENCE_TRIANGULATION_SPEC.md`. **Propuesta sin aprobar; no hay cambios en el comportamiento de la aplicación.** No es validación clínica.

- `src/esquema-evidencia.js` (esquema cerrado de afirmación, sin dependencias, no conectado a la aplicación) y los datos de la propuesta en `pruebas/evidencia/`: matriz de 5 pares, 12 hipótesis, 5 acciones, 8 eventos que alteran el suministro, 27 ejemplos de triangulación, 5 ejemplos numéricos y 15 afirmaciones.
- Los resultados esperados de los ejemplos se escribieron a mano antes de ejecutar. Los números de los eventos de suministro «sin evento» coinciden con el motor real; los efectos de exclusión usan una semántica **propuesta** que el motor no implementa.
- Se probó la sensibilidad con 11 defectos introducidos en una copia fuera del repositorio: 10 detectados; el undécimo (intervalo obligatorio de ciertos eventos) no estaba cubierto y se añadió su prueba.
- `npm test`: 140 pruebas superadas (125 previas + 15 de `evidencia.test.mjs`). `npm run check` correcto.
- Pendiente: aprobación de la matriz y de las 13 decisiones por el comité clínico.

## Actuación A13 · Especificación clínica LA-TAR (2026-11-25)

Ver `docs/strategy/LA_TAR_CLINICAL_SPEC.md`. **Documento sin aprobar; no hay código nuevo en la aplicación.** No es validación clínica.

- Valores tomados de las fichas técnicas oficiales (EMA: Vocabria 114 pp., Rekambys 77 pp.; AEMPS/CIMA: registros 1201481003 y 1201482002), descargadas y leídas el 2026-11-25 y contrastadas entre sí. Una diferencia de redacción EMA/AEMPS en la Tabla 4 de Vocabria queda señalada para los clínicos.
- `pruebas/corpus-dorado/la-tar.json`: 25 casos con esperados calculados a mano; `pruebas/corpus-la-tar.test.mjs` (5 pruebas) los contrasta con una aritmética de calendario independiente. No ejecuta ningún módulo LA-TAR, que no existe.
- `npm test`: 125 pruebas superadas (120 previas + 5 nuevas). Pendiente: aprobación del comité y revisión por al menos dos clínicos.

## Actuación A08 · Esquemas cerrados, lista blanca y migraciones (2026-11-25)

Ver `docs/ESQUEMAS_EVENTOS.md`. No es validación clínica ni de seguridad: son controles de integridad de la demostración, en el navegador.

- `src/esquemas-eventos.js`: esquema cerrado para los 16 tipos que acepta `anexar`; `id` y `registrado` reservados; las importaciones directas de filas se validan contra los episodios. `src/migraciones.js`: formato `demo@2`, migración aditiva desde `demo@1`, diagnóstico de eventos no conformes.
- La migración se comprobó byte a byte con la cohorte demo y con una base que contiene los 16 tipos generados por los productores reales; `leer()` no escribe; la primera escritura deja copia previa; formato desconocido o JSON dañado no se tocan.
- Hallazgo adicional durante la verificación: un `importacion` malformado **ya guardado** bloqueaba el arranque (`TypeError` en `render()` antes de poder avisar). `historialDispensaciones` es ahora tolerante y el aviso se muestra antes de dibujar.
- Ajuste: el esquema de `seguimiento_consulta` exige solo `consulta` y `fecha`, porque una prueba previa (sin modificar) depende de que el negocio responda «cerrado» antes que por campos ausentes. Las claves con valor `undefined` se tratan como ausentes.
- `npm test`: 120 pruebas superadas (102 previas sin modificar + 18 de `esquemas-eventos.test.mjs`). `npm run check` correcto. `npm run test:browser` incluye `pruebas/esquemas.mjs`; los 8 recorridos superados.

## Actuación A03 · Registro de reglas versionado (2026-11-25)

Ver `docs/REGISTRO_REGLAS.md`. No es validación clínica: **ninguna regla está validada**, el registro lo hace explícito.

- `src/reglas.js`: fichas con versión, fuente, parámetros con unidad y rango, estado de validación y aprobación; `REGLAS` se deriva del registro con la misma forma y valores de antes (comprobado por prueba). Señales e informes llevan id, versión y estado procedentes del registro; los informes nuevos incluyen `reglas_aplicadas`.
- Parámetros de sesión con versión determinista (`demo-1+mod(…)`) y estado «modificados, sin validación», en lugar de `demo-local-<reloj>`.
- Incidencia detectada y corregida durante la verificación: el primer resumen de reglas en la hoja impresa hacía que el informe breve ocupara 2 páginas A4 (falló la comprobación de `navegador.mjs`); se compactó y el detalle por regla queda en el texto para historia y en el JSON.
- `npm test`: 102 pruebas superadas (90 previas sin modificar sus expectativas + 12 de `registro-reglas.test.mjs`). `npm run check` correcto. `npm run test:browser` incluye ahora `pruebas/reglas.mjs`; los 7 recorridos superados.

## Actuaciones A06 y A04 de la auditoría estratégica (2026-11-25)

Ver `docs/strategy/PRIORITIZED_BACKLOG.md`. No es validación clínica.

- **A06 · Higiene de seguridad clínica.** (1) Un episodio de TAR intramuscular genera una señal pendiente de categoría `no_monitorizado` con el texto «NO MONITORIZADO», visible en panel, cohorte e informes; antes era un aviso que no contaba como pendiente (sondeo reproducible: 0 pendientes). El PDC y la exclusión del PDC oral no cambian. (2) `crearPaciente` ya no asigna nivel «3» por defecto: sin nivel indicado el caso queda sin estratificar. (3) Se elimina `motor.nivel()`, sin llamadores, y sus tres imports no usados. El fixture `base()` de `motor.test.mjs` indica ahora `"3"` de forma explícita para conservar su escenario original; es el único cambio en pruebas previas. La interfaz sigue pidiendo el nivel de forma explícita al crear un caso en blanco (el primer valor del selector es «1»; no se ha cambiado).
- **A04 · Corpus dorado.** `pruebas/corpus-dorado/` (26 casos, 7 familias; LA-TAR pendiente de A13). Resultados esperados deducidos a mano antes de ejecutar el motor; coincidencia exacta a la primera, con un oráculo secundario de algoritmo distinto. Mutaciones del motor en una copia fuera del repositorio: 6 de 7 detectadas; la restante es un mutante equivalente (véase el README del corpus). **Pendiente: revisión y firma de un segundo revisor independiente.**
- `npm test`: 90 pruebas superadas (55 previas + 7 de `seguridad-clinica.test.mjs` + 28 de `corpus-dorado.test.mjs`). `npm run check`: correcto.
- Recorridos de navegador (Chromium preinstalado, servidor local, CIMA interceptado): `navegador`, `publico`, `desktop`, `registro-manual`, `confianza` y `consulta` superados.

## Versión 0.3.0 — Información legal, portada y hospitales

08/11/2026. `npm run check`: correcto. `npm test`: 26 pruebas ejecutadas y pasadas, sin fallos ni omisiones. Se mantienen las comprobaciones de cobertura, CIMA, histórico e informes; se añaden cohorte diferenciada, actualización aditiva/idempotente, independencia de casos, acceso sin identidad y rechazo del inicio de sesión institucional.

`npm run test:browser` ejecuta ahora dos recorridos Chromium: el circuito asistencial anterior y el recorrido público. Se han comprobado portada, acceso libre a la demo, ruta de hospitales sin campos de usuario/contraseña, seis páginas legales accesibles desde el pie, importación aditiva de la nueva cohorte sobre datos antiguos sin alterar sus eventos e informes, y creación de un caso independiente desde un escenario. Consola sin errores, sin solicitudes externas al navegar las pantallas públicas y sin desbordamiento global a 390 px en portada, hospitales y privacidad.

Capturas revisadas: `/tmp/vih-landing.png`, `/tmp/vih-landing-movil.png`, `/tmp/vih-legal.png`. Los casos de demostración de la cohorte anterior se conservan; la actualización visible requiere pulsar Añadir casos actualizados cuando ya hay datos en el navegador.

No se han implementado o probado cuentas institucionales, contraseñas, autorización real, aislamiento hospitalario o backend. La arquitectura prevista está en ACCESO_HOSPITALARIO.md. Los textos legales se han adaptado tras consultar en solo lectura `acerca.html` del proyecto MAPEX-ADHEFAR (commit 8750436e9e263424da44f5f32e8d7702c6240c05); no constituyen auditoría jurídica, aprobación institucional o declaración de cumplimiento WCAG. Los datos de explotación/contacto institucional siguen pendientes de formalización.


## Versión 0.2.0 — CIMA, informes y recursos

08/11/2026. No es validación clínica.

- `npm ci --cache /tmp/vih-npm-cache --no-audit --no-fund`: instalación congelada correcta.
- `npm run check`: sintaxis de todos los módulos y servidor correcta.
- `npm test`: 22 pruebas ejecutadas y pasadas, 0 fallidas/omitidas. Incluyen el contrato CIMA, parcialidad/fallo de red, vía/ATC, metadatos, duplicación, TAR multimed y compatibilidad histórica; hoja revisada, escape, inmutabilidad, copia legible y rechazo de cálculo sin componentes.
- `npm run test:browser`: recorrido completo en Chromium con fichas CIMA sintéticas interceptadas (no datos reales de catálogo). Selección y presentación, TAR, plantilla CSV, importación/duplicados, informe y estados, visita, copia al portapapeles y alternativa manual al denegar permiso, hoja con instrucciones/cita/recurso, enlaces del hub, persistencia y vista móvil sin desbordamiento global. Consola sin errores.
- PDF reales producidos por Chromium: `/tmp/vih-informe-profesional.pdf` y `/tmp/vih-informe-paciente.pdf`, tamaño A4 comprobado con `pdfinfo`, documentos breves en una página con pie y numeración. Inspección visual de las páginas rasterizadas con `pdftoppm`. Se prueba además una hoja extensa en `/tmp/vih-informe-paciente-extenso.pdf` para verificar continuación sin recorte. No se ha probado una impresora física ni otros motores de impresión.
- El enlace público del hub no se pudo consultar por HTTP desde esta red. Se verificaron página inicial, atribución y ruta `pacientes.html` en una copia de solo lectura de `ramonmorillo/adhefarmapexhub`, commit `8750436e9e263424da44f5f32e8d7702c6240c05`. No se importó su código.

**Comprobación en vivo pendiente:** las peticiones HTTPS a `cima.aemps.es` y `ramonmorillo.es` recibieron `CONNECT tunnel failed, response 403` del proxy del entorno. No se ha demostrado disponibilidad real ni CORS de CIMA desde el origen de despliegue. No se alteró la política de red ni se evitó la verificación TLS. El adaptador responde con error visible sin registrar una medicación ficticia cuando no puede consultar el catálogo.

Los datos e informes 0.1 siguen usando sus instantáneas originales. No hay conexión a historias clínicas, envío de comunicaciones, prescripción ni datos reales de pacientes. Las instrucciones son locales, solo sintéticas y requieren confirmación de revisión.

## Histórico: versión 0.1.0


Fecha: 08/11/2026. Entorno: Node.js 24.22.1, npm 11.9.0, Chromium del sistema, Playwright fijado por package-lock.json. Resultado para MVP 0.1.0; no es validación clínica.

| Comprobación ejecutada | Resultado |
|---|---|
| `npm ci --cache /tmp/vih-npm-cache --no-audit --no-fund` | Instalación congelada correcta |
| `npm test` | 16 pruebas ejecutadas, 16 pasadas, 0 fallidas, 0 omitidas |
| `npm run check` | Sintaxis de motor, interfaz, almacenamiento e informes correcta |
| `npm run test:browser` con `npm start` | Circuito completado, persistencia verificada, consola sin errores y sin desbordamiento global a 390 px |
| Solicitud HTTP local a `/` | 200 y HTML de aplicación |
| Comparación byte a byte de ambos JSON VIH con referencia | Idénticos |
| `node --test pruebas/nucleo.test.mjs` en copia de referencia | 13 pruebas ejecutadas y pasadas; árbol de trabajo original sin cambios |

## Alcance de las pruebas propias

Fechas imposibles/bisiestas, denominador, huecos y recogidas anticipadas, arrastre previo a ventana, final excluido, futuro no incluido, intersección de componentes, corte al cambiar TAR, filas fuera de episodio tras cambios, CSV cerrado, duplicados/conflictos, aislamiento e historial, instantánea independiente, parámetros y texto explicable, secuencia completa de estados, estados inválidos, persistencia y fallo de cuota.

Prueba de navegador: carga de tres casos, informe y secuencia completa hasta resuelto, visita con preferencia cerrada, rechazo de CSV con columna identificativa, creación de caso y persistencia tras recarga; alta de TAR, descarga de plantilla, importación válida y reimportación con duplicados; JSON descargado y verificado por esquema/caso. Se invoca el botón de impresión con `window.print` sustituido por una captura de su contenido, comprobando aviso de simulación e identificador ficticio. **No verifica una impresora física ni la paginación de un PDF final.** Capturas de escritorio y móvil en `/tmp/vih-panel.png` y `/tmp/vih-mobile.png`; inspección visual realizada.

La primera ejecución en navegador detectó estilos inline incompatibles con CSP: se retiraron esos atributos; el recorrido completo posterior pasó sin errores. La primera instalación de Playwright encontró una caché no escribible; se utilizó una caché en `/tmp` y se verificó instalación congelada. No se relajaron TLS ni la política CSP.

## No comprobado / fuera de alcance

Accesibilidad formal, navegadores distintos de Chromium, pruebas de carga, auditoría de seguridad independiente, interoperabilidad institucional, entrega de mensajes, validación clínica, uso de datos reales, exactitud del PDF fuente y permisos de redistribución. El almacenamiento local no aporta una auditoría institucional resistente a manipulación. No existe una compilación de producción que ejecutar: la aplicación usa módulos ES servidos directamente.

## Revisión remota

La lectura Git de `vihconectados` funciona pero no devuelve ramas: no hay base `main` para una PR. La consulta real a `https://api.github.com/repos/ramonmorillo/vihconectados` mediante `gh api` devuelve Forbidden; no se ha solicitado ni copiado un token. El resultado del envío de la rama se informa por separado en la entrega.

El envío por Git de `feat/fase-1` se completó correctamente. La rama está disponible en el repositorio destino. No se creó una PR: falta una rama base y la API está bloqueada. No se creó ni modificó `main`; no se publicó configuración del entorno.
