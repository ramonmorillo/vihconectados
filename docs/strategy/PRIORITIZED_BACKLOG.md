# PRIORITIZED_BACKLOG — Backlog priorizado de VIHconectados 2.0

| | |
|---|---|
| Estado | **PROPUESTA PARA REVISIÓN Y APROBACIÓN. Nada de lo listado está implementado** · 2026-11-25 |
| Fuente | `CURRENT_STATE_AUDIT.md` (hallazgos F-xx), `RISK_REGISTER.md` (R-xx), `TARGET_ARCHITECTURE_V2.md`, `VALIDATION_MASTER_PLAN.md` |
| Restricciones respetadas | No elimina funcionalidades; sin dependencias de ejecución nuevas; sin APIs externas de pago; sin datos reales; sin declaraciones de cumplimiento |

## Convenciones

- **Clase:** **A** = puede hacerse ya, sin infraestructura institucional ni coste, sin comprometer la seguridad · **B** = requiere infraestructura/personal de TI institucional · **C** = requiere asesoramiento regulatorio, jurídico o de seguridad especializado.
- **Impacto asistencial:** Alto / Medio / Bajo (juicio profesional; sin datos de frecuencia). «Habilitante» = no aporta valor clínico directo pero desbloquea otros.
- **Esfuerzo (estimación gruesa, 1 persona-equivalente):** S < 1 semana · M 1–4 semanas · L 1–3 meses · XL > 3 meses `[DATO PENDIENTE: confirmar con el equipo real]`.
- **Riesgo:** riesgo de ejecutar la actuación (cambio de comportamiento, coste, regulatorio) y, entre corchetes, riesgos del registro que mitiga.
- **Prioridad:** **P0** hacer primero · **P1** siguiente · **P2** tras desbloqueos · **P3** oportunista.
- «Código» significa cambio en el repositorio; «doc» significa documento/diseño. Salvo indicación, las actuaciones A son compatibles con la regla «solo lectura hasta aprobación».

---

## 0. Resumen por clase

| Clase | Actuaciones | Qué desbloquean |
|---|---|---|
| **A — Inmediatas, sin infraestructura ni coste** | A01–A21 (21) | Decisiones, seguridad clínica de la demo, especificaciones, calidad del dominio |
| **B — Requieren infraestructura institucional** | B01–B16 (16) | Datos reales, multicentro, seguimiento activo |
| **C — Requieren asesoramiento especializado** | C01–C08 (8) | Ruta regulatoria, privacidad, evaluación clínica, ética, seguridad |

Las actuaciones A02–A21 no necesitan que se haya decidido la ruta regulatoria, pero **A01 y C01 deberían iniciarse en paralelo y primero**: determinan qué tipo de evidencia debe producir todo lo demás.

---

## 1. Clase A — Inmediatas (sin infraestructura, sin coste, seguras)

### A01 · Finalidad prevista y decisión de escenario (E1/E2/E3)
- **Impacto:** Habilitante (condiciona toda la estrategia regulatoria y de validación). · **Esfuerzo:** S–M (doc + sesión con el CCR). · **Prioridad:** **P0** · **Tipo:** doc
- **Dependencias:** respuestas del usuario (`CURRENT_STATE_AUDIT.md` §6, punto 1). · **Riesgo:** bajo [mitiga R27, R28, R32].
- **Criterios de aceptación:**
  1. Documento versionado, firmado y fechado por el responsable clínico, que declare usuarios, población, entorno, usos permitidos, usos excluidos y escenario elegido (E1/E2/E3).
  2. `README.md`, `src/legal.js` y `docs/PILOTO.md` no contienen declaraciones que contradigan la finalidad aprobada (revisión cruzada documentada).
  3. Queda registrado si la finalidad fue revisada por asesor regulatorio (C01) o está pendiente.

### A02 · Matriz de trazabilidad y corrección de la deriva documental
- **Impacto:** Medio (confianza, auditoría). · **Esfuerzo:** S–M. · **Prioridad:** P1 · **Tipo:** doc
- **Dependencias:** ninguna. · **Riesgo:** bajo [R33].
- **Aceptación:** (1) tabla REQ → módulo/función → prueba → riesgo para las capacidades C1–C24 de la auditoría; (2) `docs/PILOTO.md` y `docs/VALIDACION.md` actualizados (55 pruebas, TAR intramuscular admitido); (3) discrepancias listadas en `CURRENT_STATE_AUDIT.md` §5 resueltas o justificadas.

### A03 · Registro de reglas clínicas versionado y con estado de validación
> **Estado 2026-11-25: IMPLEMENTADO Y VERIFICADO** (102 pruebas unitarias y 7 recorridos de navegador). Los cuatro criterios se cumplen; ningún valor cambió. Sustituye además la versión `demo-local-<reloj>` del diálogo de parámetros por una versión determinista. Detalle y procedimiento en `docs/REGISTRO_REGLAS.md`. **El comité clínico debe revisar el contenido de las fichas** (las redactó el auditor).
- **Impacto:** Alto (gobernanza, trazabilidad de cada señal). · **Esfuerzo:** M. · **Prioridad:** P1 · **Tipo:** código acotado
- **Dependencias:** idealmente A01. · **Riesgo:** bajo si el comportamiento se mantiene idéntico [R03]. Nota técnica: `servidor.mjs` solo sirve `datos/[a-z-]+.json`; el nombre del fichero debe respetarlo.
- **Aceptación:** (1) `REGLAS` (`motor.js:5-10`) se lee de un registro (`id`, `version`, `fuente`, `estado_validacion`, parámetros con unidades) sin cambiar ningún valor; (2) las 55 pruebas existentes pasan **sin modificar sus expectativas**; (3) cada señal e informe incluye `id`, `version` y estado de validación de la regla; (4) una prueba demuestra que cambiar un parámetro exige nueva versión y que informes antiguos conservan la suya.

### A04 · Corpus dorado de PDC y verificación independiente
> **Estado 2026-11-25: IMPLEMENTADO PARCIALMENTE.** 26 casos en `pruebas/corpus-dorado/`, esperados deducidos a mano antes de ejecutar, sin discrepancias. **Falta la firma de un segundo revisor independiente** (criterio 2 no cerrable por el auditor) y la familia LA-TAR (depende de A13). Ver `pruebas/corpus-dorado/README.md`.
- **Impacto:** Alto (seguridad de la métrica central). · **Esfuerzo:** M. · **Prioridad:** **P0** · **Tipo:** pruebas
- **Dependencias:** un segundo revisor que calcule los resultados esperados sin leer `motor.js`. · **Riesgo:** bajo; puede revelar discrepancias (es su finalidad) [R03, R22].
- **Aceptación:** (1) al menos un caso por cada familia de `VALIDATION_MASTER_PLAN.md` §2.1; (2) los resultados esperados están firmados antes de ejecutar el motor; (3) se ejecuta con `npm test`; (4) cualquier discrepancia queda registrada con decisión del CCR y no se «arregla» la prueba para que pase.

### A05 · Integración continua mínima
- **Impacto:** Medio. · **Esfuerzo:** S. · **Prioridad:** P1 · **Tipo:** código (configuración)
- **Dependencias:** `[DATO PENDIENTE: visibilidad del repositorio y plan de GitHub]`. · **Riesgo:** bajo; sin secretos [R33].
- **Aceptación:** (1) `npm test` y `npm run check` se ejecutan en cada *push*/PR y bloquean la integración si fallan; (2) no se añaden dependencias de ejecución; (3) sin credenciales en la configuración.

### A06 · Higiene de seguridad clínica en el código existente
> **Estado 2026-11-25: IMPLEMENTADO Y VERIFICADO** (90 pruebas unitarias y 6 recorridos de navegador superados). Decisión de diseño tomada por el auditor a falta del CCR: el episodio intramuscular es una señal pendiente de categoría `no_monitorizado` (no un indicador permanente). **El CCR debe confirmarla o cambiarla.** Detalle en `docs/VALIDACION.md`.
- **Impacto:** Alto (elimina el silencio ante inyectables y la subestimación por nivel por defecto). · **Esfuerzo:** S. · **Prioridad:** **P0** · **Tipo:** código acotado
- **Dependencias:** decisión del CCR sobre cómo mostrar «no monitorizado» (señal pendiente vs. indicador permanente). · **Riesgo:** bajo–medio (cambia contadores visibles; no cambia el PDC) [R01, R05].
- **Aceptación:**
  1. Una prueba nueva: un paciente con episodio `inyectable` no aparece como «sin señales»; se muestra un estado explícito *no monitorizado* en panel, cohorte e informe (se reproduce el sondeo de la auditoría: antes 0 pendientes).
  2. `crearPaciente` ya no asigna nivel «3» por defecto (se exige nivel o se crea «sin estratificar»); `motor.nivel()` sin uso se elimina o se corrige.
  3. Todas las pruebas previas siguen pasando (se actualizan solo las que dependan del valor por defecto, documentando el motivo).
  4. El PDC y los informes históricos no cambian.

### A07 · Separar dominio de interfaz y definir puerto de comandos
- **Impacto:** Habilitante. · **Esfuerzo:** M–L. · **Prioridad:** P1 · **Tipo:** refactor
- **Dependencias:** A05 recomendable. · **Riesgo:** medio (regresiones) [F-02]. Se mitiga con las 6 pruebas de navegador y las 55 unitarias.
- **Aceptación:** (1) `revision-datos.js`, `registro-manual.js` y `medicacion.js` no contienen lógica de dominio que use `document`/`window`; (2) prueba automática que verifique que los módulos de dominio no referencian `document`, `window` ni `localStorage`; (3) el planificador de conciliación tiene pruebas unitarias propias; (4) el puerto es por **comandos** (no `leer()/guardar(db)`), con un adaptador `localStorage` que mantiene el modo demostración; (5) los seis guiones de navegador pasan.

### A08 · Esquemas cerrados por evento, lista blanca y migraciones
> **Estado 2026-11-25: IMPLEMENTADO Y VERIFICADO** (120 pruebas unitarias y 8 recorridos de navegador). Los cuatro criterios se cumplen. Añade además lectura tolerante de eventos antiguos malformados, diagnóstico visible al usuario y copia previa en la primera escritura. Detalle, cambios de comportamiento y límites en `docs/ESQUEMAS_EVENTOS.md`. La validación sigue siendo de cliente: B01 debe repetirla en servidor.
- **Impacto:** Alto (integridad; prerrequisito de backend). · **Esfuerzo:** M. · **Prioridad:** P1 · **Tipo:** código
- **Dependencias:** A07 conveniente. · **Riesgo:** medio (datos antiguos; se mitiga con migración no destructiva) [R14, R20].
- **Aceptación:** (1) esquema para **cada** tipo aceptado por `anexar` (incluidos `importacion`, `informe`, `informe_paciente`, `revision_alertas`, `configuracion`); (2) campos desconocidos y tipos sin esquema se rechazan; (3) prueba: `{tipo:"importacion", fuente:"X"}` queda rechazado (hoy es aceptado y rompe `cobertura()`); (4) `leer()` migra desde `vihconectados/demo@1` sin perder eventos ni informes (prueba de ida y vuelta con la cohorte demo) o informa de forma recuperable.

### A09 · Manifiesto y minimización de exportaciones e informes
- **Impacto:** Medio (privacidad, integridad). · **Esfuerzo:** S–M. · **Prioridad:** P2 · **Tipo:** código
- **Dependencias:** decisión del CCR entre reproducibilidad y minimización (el informe hoy embebe todos los eventos). · **Riesgo:** bajo [R19].
- **Aceptación:** (1) exportación con `esquema`, `version`, fecha y hash SHA-256 de su contenido; (2) opción de informe «completo» y «mínimo» con advertencia; (3) pruebas de contenido de cada modo.

### A10 · Modelo de amenazas y plan de pruebas de seguridad
- **Impacto:** Medio–Alto (habilitante). · **Esfuerzo:** S–M. · **Prioridad:** P1 · **Tipo:** doc
- **Dependencias:** ninguna. · **Riesgo:** bajo [R16, R17, R24].
- **Aceptación:** (1) activos, límites de confianza y amenazas (STRIDE u otro) documentados; (2) cada amenaza enlaza a un control o a un riesgo aceptado del registro; (3) revisado por una persona de seguridad del centro.

### A11 · Licencia, titularidad y atribuciones
- **Impacto:** Medio (jurídico). · **Esfuerzo:** S. · **Prioridad:** P1 · **Tipo:** doc / decisión
- **Dependencias:** decisión del titular; confirmar si hubo financiación o relación institucional que afecte a la titularidad `[DATO PENDIENTE]`. · **Riesgo:** bajo; asesoría legal ligera recomendable [R29].
- **Aceptación:** (1) decisión explícita sobre licencia del propio repositorio; (2) `ATTRIBUTIONS.md` con cada fuente (preparadorconsulta `42402cb`, cmo-vih-app `c963da9`, guion SEFH, AEMPS/CIMA, Hub), su permiso y su estado; (3) `legal.js` coherente, sin afirmar cesiones no formalizadas.

### A12 · Mapeo evento → FHIR y validación local con herramienta abierta
- **Impacto:** Medio (habilitante). · **Esfuerzo:** M. · **Prioridad:** P2 · **Tipo:** doc + ejemplos
- **Dependencias:** conocer interfaces del centro `[DATO PENDIENTE]`. · **Riesgo:** bajo [F-28].
- **Aceptación:** (1) tabla evento→recurso con campos obligatorios y huecos explícitos; (2) tres ejemplos sintéticos que validan sin errores con el validador oficial de HL7 FHIR; (3) perfiles nacionales/terminologías marcados `[REQUIERE REFERENCIA]` si no se han podido verificar; (4) ninguna dependencia nueva de ejecución.

### A13 · Especificación clínica del TAR de acción prolongada
> **Estado 2026-11-25: BORRADOR TÉCNICO COMPLETADO; criterios 2 y 4 PENDIENTES.** Criterio 1 cumplido: los valores salen de las fichas técnicas oficiales de Vocabria y Rekambys (EMA y AEMPS), leídas directamente y contrastadas; lo que la ficha no fija queda como 12 decisiones del comité (D-01…D-12). Criterio 3 cumplido: 25 casos en `pruebas/corpus-dorado/la-tar.json`. **Faltan la aprobación del comité y la revisión por al menos dos clínicos**, que no puede hacer el autor. No usar como especificación aprobada ni para implementar B08. Ver `LA_TAR_CLINICAL_SPEC.md`.
- **Impacto:** **Alto** (objetivo estratégico; hoy hay riesgo crítico R01). · **Esfuerzo:** M (doc) – L (con panel de expertos). · **Prioridad:** P1 · **Tipo:** doc
- **Dependencias:** participación clínica; acceso a fichas técnicas vigentes y guías `[REQUIERE REFERENCIA]`. · **Riesgo:** medio (error de especificación) [R01].
- **Aceptación:** (1) modelo de fases, estados (al día / en ventana / retrasado / no monitorizado), ventanas y retrasos **con valores y referencia citada** (ninguno inventado); (2) reglas de señal, responsables y prioridades aprobadas por el CCR; (3) lista de casos para el corpus dorado (A04); (4) revisión por al menos dos clínicos con experiencia en LA-TAR.

### A14 · Especificación de cuestionarios declarativos y reglas de escalado (sin IA, sin canal)
- **Impacto:** Alto (seguimiento activo). · **Esfuerzo:** M. · **Prioridad:** P2 · **Tipo:** doc + esquema
- **Dependencias:** A19 para instrumentos; A15 para respuesta como evidencia. · **Riesgo:** bajo [R09].
- **Aceptación:** (1) esquema JSON de cuestionario (ítems cerrados, ramificación, escalado); (2) tres cuestionarios de ejemplo **sin instrumentos con licencia no autorizados**; (3) ramificación determinista (sin IA); (4) cada regla de escalado vinculada a un responsable y plazo definidos en el protocolo (`CLINICAL_GOVERNANCE.md` §5).

### A15 · Modelo de evidencia, procedencia y triangulación
- **Impacto:** **Alto** (diferencial estratégico). · **Esfuerzo:** M. · **Prioridad:** P1 · **Tipo:** doc + esquema
- **Dependencias:** A01; consulta con el CCR. · **Riesgo:** bajo [R02, R04].
- **Aceptación:** (1) esquema de «afirmación» (fuente, fecha efectiva, procedencia, confianza); (2) matriz de concordancia/discordancia entre fuentes aprobada por el CCR, **sin inferir adherencia ni causalidad**; (3) ejemplos sintéticos para cada combinación relevante; (4) definición de eventos que alteran la necesidad de suministro (ingreso, suspensión, receta externa).

### A16 · Modelo CMO por dimensiones (Capacidad–Motivación–Oportunidad)
- **Impacto:** Alto (coherencia metodológica con CMO). · **Esfuerzo:** M. · **Prioridad:** P2 · **Tipo:** doc + esquema
- **Dependencias:** **el usuario/equipo MAPEX debe aportar la rejilla y criterios vigentes**; sin ellos no se codifican puntos de corte. · **Riesgo:** medio (modelar sin validación) [R05].
- **Aceptación:** (1) esquema `evaluacion_cmo` con C, M y O separados y su instrumento/fuente; (2) nivel agregado solo como decisión profesional o regla aprobada y referenciada; (3) documento de limitaciones de validación en VIH; (4) ningún valor por defecto de nivel.

### A17 · Rol Enfermería y matriz de permisos y responsabilidades
- **Impacto:** Medio–Alto (coordinación real). · **Esfuerzo:** S–M. · **Prioridad:** P2 · **Tipo:** doc
- **Dependencias:** participación de los tres servicios. · **Riesgo:** bajo [F-26].
- **Aceptación:** (1) matriz aprobada por Farmacia, Infecciosas y Enfermería (quién ve, crea, anula, asigna, cierra); (2) `ROLES_PREVISTOS` y `RESPONSABLES` revisados en el diseño; (3) pruebas de aceptación de `ACCESO_HOSPITALARIO.md` ampliadas.

### A18 · Evaluación de accesibilidad (WCAG 2.2 AA)
- **Impacto:** Medio. · **Esfuerzo:** M. · **Prioridad:** P2 · **Tipo:** pruebas/doc
- **Dependencias:** ninguna (herramienta automática solo si se aprueba como `devDependency`). · **Riesgo:** bajo.
- **Aceptación:** (1) checklist manual documentado; (2) pruebas con lector de pantalla en al menos dos navegadores; (3) lista priorizada de barreras; (4) **no** se declara conformidad.

### A19 · Selección de instrumentos PROM/PREM y derechos de uso
- **Impacto:** Medio–Alto. · **Esfuerzo:** S–M. · **Prioridad:** P2 · **Tipo:** doc
- **Dependencias:** CCR. · **Riesgo:** bajo [F-21].
- **Aceptación:** lista de candidatos con licencia, validación en español y coste; decisión documentada; ninguna escala incluida sin autorización.

### A20 · Protocolo de validación (fase 0 y fase 1) y plan estadístico
- **Impacto:** Alto (evidencia). · **Esfuerzo:** M–L. · **Prioridad:** P2 (fase 0: P1) · **Tipo:** doc
- **Dependencias:** A03, A04, A13; metodólogo. · **Riesgo:** bajo [R03].
- **Aceptación:** protocolo y plan estadístico completos según `VALIDATION_MASTER_PLAN.md`; revisión metodológica independiente; **sin cifras inventadas** (se marcan pendientes).

### A21 · Política de IA generativa (N3) y de texto libre
- **Impacto:** Medio (previene riesgos futuros). · **Esfuerzo:** S–M. · **Prioridad:** P2 · **Tipo:** doc + prueba arquitectónica
- **Dependencias:** CCR. · **Riesgo:** bajo [R10, R18].
- **Aceptación:** (1) política aprobada que recoja `CLINICAL_GOVERNANCE.md` §7; (2) prueba automática que impide que módulos N1 importen módulos N3; (3) política de detección y retención de texto libre enlazada a la EIPD.

---

## 2. Clase B — Requieren infraestructura institucional

> Todas dependen de un **sponsor institucional**, personal de TI y entorno autorizado. Ninguna debe iniciarse con datos reales antes de la puerta G1.

### B01 · Backend de comandos (servidor autoritativo)
- **Impacto:** Habilitante crítico. · **Esfuerzo:** L–XL. · **Prioridad:** P1 · **Riesgo:** medio–alto (superficie de seguridad) [R13, R14, R20].
- **Dependencias:** A07, A08, A10, ADR-1/2/3, sponsor.
- **Aceptación:** (1) acepta solo comandos con esquema; reloj, UUID e idempotencia de servidor; (2) reutiliza el paquete de dominio: **la misma batería de pruebas pasa contra el servidor**; (3) ignora `hospital_id` enviado por el cliente (usa la sesión); (4) suite de contrato; (5) solo datos sintéticos.

### B02 · Identidad, sesiones y RBAC (SSO OIDC/SAML)
- **Impacto:** Habilitante crítico. · **Esfuerzo:** L. · **Prioridad:** P1 · **Riesgo:** alto si se implementa mal [R17, R21].
- **Dependencias:** B01, A17, TI del centro.
- **Aceptación:** pruebas 1–3 de `ACCESO_HOSPITALARIO.md` automatizadas; sesiones de servidor con expiración y revocación; denegación por defecto; revisión independiente.

### B03 · Aislamiento multicéntrico
- **Impacto:** Habilitante crítico. · **Esfuerzo:** M–L. · **Prioridad:** P1 · **Riesgo:** alto [R17].
- **Dependencias:** B01, B02, B05.
- **Aceptación:** `hospital_id` obligatorio con claves compuestas y políticas de base de datos; pruebas automáticas A≠B (IDs anidados, informes, exportaciones, cachés) en CI; sin fallos.

### B04 · Auditoría protegida y actor en todos los eventos
- **Impacto:** Habilitante crítico. · **Esfuerzo:** M–L. · **Prioridad:** P1 · **Riesgo:** medio [R16, R20, R21].
- **Dependencias:** B01, B02.
- **Aceptación:** cada comando registra actor, pertenencia, hospital, recurso, acción y fecha de servidor; registro append-only; lecturas sensibles auditadas; una prueba demuestra que se detecta la manipulación.

### B05 · Persistencia, cifrado, copias y recuperación
- **Impacto:** Habilitante crítico. · **Esfuerzo:** L. · **Prioridad:** P1 · **Riesgo:** alto si falla la recuperación [R15].
- **Dependencias:** B01; ADR-2/3; RPO/RTO `[DATO PENDIENTE]`.
- **Aceptación:** cifrado en tránsito y en reposo; copias periódicas; **restauración probada y documentada**; migraciones reversibles.

### B06 · Ingesta de dispensaciones con procedencia
- **Impacto:** Alto (fuente real). · **Esfuerzo:** L. · **Prioridad:** P2 · **Riesgo:** medio (calidad de datos) [R04, R22].
- **Dependencias:** B01, A12, sistema de farmacia del centro, C03.
- **Aceptación:** importación con sistema/identificador de origen, lote y huella; conversión a días con regla explícita y auditable; idempotencia; informe de calidad de datos; probada con ficheros anonimizados.

### B07 · Entornos y gestión de secretos
- **Impacto:** Habilitante. · **Esfuerzo:** M. · **Prioridad:** P2 · **Riesgo:** medio [R13].
- **Aceptación:** dev/staging/prod separados; datos sintéticos en staging; análisis de secretos en CI; sin credenciales en el repositorio.

### B08 · Módulo LA-TAR (implementación)
- **Impacto:** **Alto**. · **Esfuerzo:** L. · **Prioridad:** P1 (tras A13) · **Riesgo:** medio–alto (error clínico) [R01].
- **Dependencias:** A13, A04, B01.
- **Aceptación:** pasa el corpus dorado LA-TAR; estado «no monitorizado» solo cuando faltan datos; informe y bandeja integrados; revisión independiente; R01 re-evaluado.

### B09 · Motor de evidencia y triangulación
- **Impacto:** **Alto**. · **Esfuerzo:** L. · **Prioridad:** P2 · **Riesgo:** medio [R02].
- **Dependencias:** A15, B06, B10.
- **Aceptación:** comportamiento según la especificación aprobada; cada señal muestra sus fuentes y reglas; no infiere adherencia; pruebas sobre corpus.

### B10 · Ingesta de laboratorio (carga viral, CD4)
- **Impacto:** Alto. · **Esfuerzo:** M–L. · **Prioridad:** P2 · **Riesgo:** medio.
- **Dependencias:** B06, A12, LIS del centro.
- **Aceptación:** valores con fecha de muestra, unidad y fuente; calidad evaluada; no se usan para inferir adherencia.

### B11 · Coordinación: tareas, acuses y bandeja por rol (incluye Enfermería)
- **Impacto:** Alto (coordinación real). · **Esfuerzo:** L. · **Prioridad:** P2 · **Riesgo:** medio.
- **Dependencias:** B02, A17.
- **Aceptación:** tarea con asignado, plazo y acuse real; un cambio de estado solo por un actor con permiso; escalado por vencimiento; auditoría completa.

### B12 · Cuestionarios y canal web autenticado
- **Impacto:** Alto. · **Esfuerzo:** L. · **Prioridad:** P2 · **Riesgo:** medio [R09, R11].
- **Dependencias:** A14, B02, C03, C08.
- **Aceptación:** enlace de un solo uso con caducidad; respuestas como eventos; ramificación determinista; el escalado crea tarea; accesibilidad; consentimiento registrado; alternativa no digital.

### B13 · Canal SMS/voz institucional (adaptador)
- **Impacto:** Medio–Alto. · **Esfuerzo:** L. · **Prioridad:** P3 · **Riesgo:** alto (confidencialidad VIH) [R09].
- **Dependencias:** B12, C03, C08, canal institucional existente (**sin API de pago bajo la responsabilidad del proyecto**).
- **Aceptación:** adaptador sustituible; plantillas aprobadas y sin contenido sensible; acuse de entrega; límites de frecuencia; auditoría.

### B14 · Observabilidad, rendimiento e incidentes
- **Impacto:** Medio. · **Esfuerzo:** M. · **Prioridad:** P2 · **Riesgo:** bajo.
- **Aceptación:** métricas y registros sin datos sensibles; pruebas de carga con datos sintéticos; plan de respuesta a incidentes.

### B15 · Fachada FHIR (lectura)
- **Impacto:** Medio–Alto. · **Esfuerzo:** L. · **Prioridad:** P3 · **Riesgo:** medio.
- **Dependencias:** A12, B01, B06.
- **Aceptación:** lectura de recursos acordados; validación de conformidad; misma autorización que la API nativa.

### B16 · Objetivos con indicador y reestratificación con motivo
- **Impacto:** Medio–Alto (evaluación CMO). · **Esfuerzo:** M. · **Prioridad:** P2 · **Riesgo:** medio.
- **Dependencias:** A16, A01.
- **Aceptación:** objetivo con tipo/indicador/meta opcionales; evento de cambio de nivel con motivo y actor; informe agregado de logro; **sin cambio automático de nivel** salvo regla aprobada.

---

## 3. Clase C — Requieren asesoramiento regulatorio, jurídico o de seguridad

### C01 · Cualificación y clasificación (MDR, MDCG 2019-11, Regla 11)
- **Impacto:** Habilitante crítico. · **Esfuerzo:** M (externo). · **Prioridad:** **P0 (en paralelo con A01)** · **Riesgo:** bajo; coste de servicio profesional [R27].
- **Aceptación:** informe razonado firmado por asesor con conclusión sobre cualificación y clase probable por escenario E1/E2/E3, y condiciones de uso.

### C02 · Decisión de ruta (CE / in-house / investigación) y sistema de calidad
- **Impacto:** Habilitante crítico. · **Esfuerzo:** L–XL. · **Prioridad:** P1 · **Riesgo:** alto si se retrasa [R27, R28].
- **Dependencias:** C01.
- **Aceptación:** decisión documentada y aprobada por dirección; si es in-house, justificación documentada de las condiciones del art. 5(5) `[VERIFICAR]` y sistema de calidad proporcional; si es CE, plan con organismo notificado.

### C03 · EIPD, base jurídica, DPD y contratos
- **Impacto:** Habilitante crítico. · **Esfuerzo:** M–L. · **Prioridad:** P1 · **Riesgo:** medio [R13, R18, R34].
- **Dependencias:** A01, A10.
- **Aceptación:** EIPD aprobada por el DPD; registro de actividades; contratos de encargado; política de retención; consulta previa si procede.

### C04 · Plan de evaluación clínica y aprobación ética (CEIm)
- **Impacto:** Alto. · **Esfuerzo:** L. · **Prioridad:** P2 · **Riesgo:** medio [R34].
- **Dependencias:** A20, C01.
- **Aceptación:** protocolo aprobado por el CEIm; responsabilidad/seguro; registro del estudio cuando proceda.

### C05 · Evaluación frente a la Ley de IA
- **Impacto:** Medio. · **Esfuerzo:** S–M. · **Prioridad:** P3 · **Riesgo:** bajo [R10].
- **Dependencias:** A21.
- **Aceptación:** informe de clasificación y obligaciones (o declaración razonada de ausencia de IA en la ruta clínica).

### C06 · ENS y revisión independiente de seguridad (incluida prueba de intrusión)
- **Impacto:** Habilitante. · **Esfuerzo:** M. · **Prioridad:** P1 (antes de G1) · **Riesgo:** bajo [R13–R17].
- **Dependencias:** B01–B04.
- **Aceptación:** informe independiente; hallazgos críticos y altos cerrados antes de G1.

### C07 · Ingeniería de usabilidad (IEC 62366-1)
- **Impacto:** Alto. · **Esfuerzo:** M–L. · **Prioridad:** P2 · **Riesgo:** bajo [R35].
- **Aceptación:** evaluación formativa con profesionales de los tres servicios y con pacientes; informe de errores de uso y mitigaciones.

### C08 · Consentimiento, información y derechos en seguimiento remoto
- **Impacto:** Alto (legitimidad del canal). · **Esfuerzo:** M. · **Prioridad:** P2 · **Riesgo:** medio [R09, R11].
- **Dependencias:** C03.
- **Aceptación:** texto y flujo aprobados con participación de pacientes; registro de consentimiento y retirada; alternativa no digital.

---

## 4. Propuesta razonada de las **diez primeras actuaciones**

**Criterio de orden:** (1) **impacto** asistencial o habilitante, (2) **seguridad** (reducción del riesgo del registro), (3) **viabilidad** inmediata (sin infraestructura, sin coste, sin dependencias externas bloqueantes). Puntuación 1–5 por criterio (juicio provisional; sirve para explicar el orden, no es una medida):

| # | Actuación | Impacto | Seguridad | Viabilidad | Total | Por qué en esta posición |
|:-:|---|:-:|:-:|:-:|:-:|---|
| **1** | **A01 + inicio de C01** — Finalidad prevista y consulta de cualificación | 5 | 5 | 5 | 15 | Todo lo demás (qué validar, qué documentar, qué canal) depende de esta decisión; coste casi nulo; reduce R27/R28 |
| **2** | **A06** — Higiene de seguridad clínica (inyectable «no monitorizado», sin nivel por defecto) | 4 | 5 | 5 | 14 | Único riesgo crítico (R01 = 25) y un valor por defecto que contradice la propia documentación; cambio acotado y verificable |
| **3** | **A04** — Corpus dorado de PDC con oráculo independiente | 4 | 5 | 5 | 14 | La métrica central hoy se verifica solo con pruebas escritas por su implementador; protege a todo lo demás |
| **4** | **A03** — Registro de reglas versionado y con estado de validación | 4 | 4 | 5 | 13 | Convierte «parámetros demo» en decisiones gobernables y trazables; comportamiento idéntico |
| **5** | **A08** — Esquemas cerrados, lista blanca y migraciones | 3 | 5 | 4 | 12 | Cierra F-12 (hoy un evento malformado inutiliza el cálculo) y es requisito del backend |
| **6** | **A13** — Especificación clínica del TAR de acción prolongada | 5 | 4 | 3 | 12 | Es el caso de uso estratégico; requiere clínicos, pero no código ni coste |
| **7** | **A15** — Modelo de evidencia, procedencia y triangulación | 5 | 3 | 4 | 12 | Es el diferencial frente a un agente conversacional; condiciona el esquema V2 |
| **8** | **A07** — Separar dominio de UI y definir puerto de comandos | 4 | 3 | 4 | 11 | Desbloquea backend y pruebas del flujo de conciliación; riesgo medio mitigado por la batería existente |
| **9** | **A14** — Especificación de cuestionarios declarativos y escalado | 4 | 3 | 4 | 11 | Pone la «inteligencia» del seguimiento activo en reglas deterministas antes de elegir canal; evita acoplarse a un proveedor |
| **10** | **Arranque institucional: sponsor + C03 (EIPD) + B07 (entornos)** | 5 | 4 | 2 | 11 | Es el cuello de botella para cualquier dato real; tiene el plazo más largo, por eso debe empezar ya aunque su viabilidad sea menor |

**Notas sobre el orden:**
- Las posiciones **1–5** son de bajo coste, sin infraestructura y reducen riesgo antes de añadir funcionalidad. Se pueden ejecutar de forma casi paralela.
- La posición **10** es la única de viabilidad baja; se incluye porque su plazo es largo y bloquea las clases B y C. Su *inicio* (nombrar sponsor, abrir la EIPD, definir entornos) es barato; su *finalización* no.
- **Siguientes (11–15):** A11 licencia y atribuciones · A05 CI · A02 trazabilidad y deriva documental · A12 mapeo FHIR · A16/A17 CMO por dimensiones y rol de Enfermería (condicionadas a que el equipo aporte la rejilla y la matriz).

**Qué no se prioriza todavía y por qué:** voz o canal conversacional (B13), IA generativa (A21 solo como política), FHIR operativo (B15) y despliegue multicéntrico. Dependen de backend, EIPD, ruta regulatoria y reglas validadas; adelantarlas aumenta el riesgo sin aumentar el valor demostrable.

---

## 5. Decisiones que se solicitan para aprobar este backlog

1. ¿Se aprueba el orden propuesto o se desea otro criterio (p. ej. priorizar visibilidad pública frente a seguridad)?
2. ¿Quién aprobará las reglas clínicas (CCR) y quién es el segundo revisor para A04?
3. ¿Se aporta la rejilla CMO vigente para A16?
4. ¿Hay un centro piloto y un sponsor para iniciar la actuación 10?
5. ¿Puede compartirse información de los proyectos hermanos (HIV Prescribing Cascade Auditor, CambiosTAR, RXplain) para preparar el marco de reutilización de `TARGET_ARCHITECTURE_V2.md` §8?
