# VALIDATION_MASTER_PLAN — Plan maestro de pruebas técnicas, validación clínica y evaluación de resultados

| | |
|---|---|
| Estado | **PROPUESTA PARA REVISIÓN** · 2026-11-25 |
| Naturaleza | Marco metodológico. **No es un protocolo de estudio aprobado**; no contiene tamaños muestrales ni umbrales de éxito inventados (`[DATO PENDIENTE]`) |
| Punto de partida | 55 pruebas unitarias superadas hoy; 6 guiones de navegador no ejecutados por esta auditoría; «paridad con otra calculadora ≠ validación clínica» (`docs/VALIDACION.md`) |

---

## 1. Principio rector

Tres preguntas distintas que no deben confundirse (cada una con su evidencia):

| Pregunta | Nombre | Evidencia actual | Evidencia necesaria |
|---|---|---|---|
| ¿Hace el software lo que se especificó? | **Verificación** | Pruebas unitarias y de navegador (autoría del implementador) | Pruebas trazables a requisitos + oráculo independiente |
| ¿Mide correctamente lo que dice medir? | **Validación analítica** | Ninguna independiente | Corpus dorado + comparación con método de referencia |
| ¿Sirve en la práctica clínica y es seguro? | **Validación clínica / utilidad** | Ninguna | Estudio por fases con datos reales autorizados |

**Regla:** ninguna fase posterior comienza sin cerrar la anterior (puertas §9).

---

## 2. Niveles de prueba técnica

| Nivel | Qué se prueba | Estado | Acción |
|---|---|---|---|
| T1 Unitarias de dominio | Aritmética de PDC, cortes, deduplicación, correcciones, transiciones | 55 superadas (`motor.test.mjs`, `confianza.test.mjs`, `consulta.test.mjs`, `cima-informes.test.mjs`, `registro-manual.test.mjs`, `publico.test.mjs`, `desktop.test.mjs`) | Mantener; añadir **mapeo requisito→prueba** (A02) |
| T2 Propiedades | Invariantes: PDC ∈ [0,1] o `null`; idempotencia de reimportación; monotonía temporal; conmutatividad de orden de anexado para el mismo corte efectivo | No existe | Pruebas basadas en propiedades con generadores propios (sin dependencias nuevas) |
| T3 Corpus dorado | Casos con resultado esperado calculado **por otra vía** (hoja de cálculo y revisión manual de un farmacéutico) | No existe | A04 |
| T4 Contrato de comandos | Cada tipo de evento: esquema válido/ inválido; rechazo por defecto | Parcial (algunos tipos); **cinco tipos sin validar** (F-12) | A08 |
| T5 Integración/E2E | Recorridos de interfaz | 6 guiones Playwright (no ejecutados aquí) | Ejecutar en CI (A05); registrar resultados |
| T6 Seguridad | XSS, CSRF, inyección, autorización, aislamiento | Escape probado; resto no aplicable sin backend | Modelo de amenazas (A10); pruebas de aislamiento (B03) |
| T7 Rendimiento | Cohortes de miles; informes con histórico largo | No existe | Perfil con datos sintéticos (B14) |
| T8 Interoperabilidad | Validación de recursos FHIR; pruebas de ingesta con ficheros reales anonimizados | No existe | A12, B06, B15 |
| T9 Accesibilidad | WCAG 2.2 AA | Solo pruebas básicas de teclado (`docs/*`) | A18; auditoría formal en C07 |
| T10 Usabilidad | Con profesionales y pacientes | No existe | C07 |
| T11 Recuperación | Copia/restauración; continuidad | No aplicable hoy | B05 |
| T12 Regresión de reglas | Cambiar un parámetro debe producir diferencias esperadas y documentadas sobre el corpus | No existe | A03 + A04 |

### 2.1 Corpus dorado (T3) — diseño mínimo

**Casos obligatorios** (todos sintéticos, con resultado esperado documentado por escrito antes de ejecutar el motor):

| Familia | Ejemplos de casos | Qué detecta |
|---|---|---|
| Aritmética básica | Sin huecos; hueco único; huecos múltiples; recogidas anticipadas; recogida al día del corte | Errores de límites `[inicio, fin)` |
| Multicomponente | Un componente fuera de fase; dos componentes con ciclos distintos | Intersección vs. suma |
| Cambios de TAR | Cambio con sobrante; cambio el mismo día de la dispensación; retroactividad | Arrastre indebido |
| Ventana | Inicio de TAR anterior a la ventana; menos de ventana de seguimiento | Denominador |
| Datos sucios | Duplicados exactos; mismo día/otra entrega; corrección retroactiva; filas fuera de episodio | Conciliación |
| Calendario | Años bisiestos; cambio de hora; corte en fin de mes | Fechas |
| LA-TAR (cuando exista especificación) | Administración a tiempo, dentro de ventana, fuera de ventana, fase de carga, reinicio | Módulo nuevo |
| Casos «vacíos» | Sin dispensaciones; sin TAR; sin visitas | `null` vs. 0 |

**Oráculo independiente:** cálculo en hoja de cálculo por un segundo miembro del equipo que no haya leído `motor.js`; discrepancias se resuelven por escrito. Esto añade independencia que hoy falta (F-32).

---

## 3. Validación analítica del PDC y de las señales

**Objetivo:** demostrar que la implementación coincide con la definición operativa aprobada por el CCR.

**Pasos:**
1. El CCR aprueba por escrito la **definición operativa** (denominador, arrastre, exclusiones) y los parámetros (`CLINICAL_GOVERNANCE.md` §4).
2. Construir el corpus dorado (T3) y ejecutar; criterio de aceptación: **concordancia exacta** en días cubiertos/total para todos los casos.
3. Estudio de **sensibilidad a parámetros**: variación de ventana y umbral sobre una cohorte sintética realista (distribuciones declaradas por el CCR) para cuantificar cuántas señales cambian; resultado informativo para el CCR, no criterio de éxito.
4. Registro de discrepancias y correcciones con versión de la regla.

---

## 4. Validación clínica por fases

> Todo estudio con datos de pacientes requiere EIPD, base jurídica, autorización del centro y evaluación del CEIm cuando corresponda (`REGULATORY_READINESS.md` §1 y §6). **No se planifica el uso de datos reales hasta cumplir esas condiciones.**

### Fase 0 — Validación analítica y revisión de contenido (sin pacientes)
- T3, T12, revisión de contenido clínico (CCR), usabilidad con datos sintéticos (C07).
- **Salida:** informe de validación analítica; registro de reglas con estado `validación analítica`.

### Fase 1 — Estudio **silencioso retrospectivo** (datos seudonimizados, sin intervención)
- **Pregunta:** ¿con qué frecuencia se emiten señales, cuántas son plausibles según revisión clínica independiente y qué datos faltan?
- **Diseño:** cohorte retrospectiva de pacientes en TAR oral e inyectable; el sistema calcula PDC/señales con datos históricos; **dos revisores clínicos independientes** valoran una muestra de casos (señalados y no señalados) con la historia como referencia.
- **Medidas:** concordancia entre revisores (κ), acuerdo señal–revisión, valor predictivo positivo de la señal respecto a «necesidad de intervención farmacéutica según los revisores», proporción de datos faltantes por fuente, carga de señales por 100 pacientes-mes.
- **Referencia estándar:** juicio clínico independiente; **no** carga viral como sustituto de adherencia (confusores).
- **Directrices de reporte a considerar** (verificar aplicabilidad): STARD (exactitud de pruebas diagnósticas/de cribado), TRIPOD+AI si se emplea modelado predictivo, STROBE para el diseño observacional `[REQUIERE REFERENCIA: confirmar versión vigente]`.
- **Salida:** informe de validez de contenido y criterio; ajuste de reglas; decisión de puerta G1.

### Fase 2 — **Modo sombra prospectivo** (el sistema genera señales en paralelo; no influyen en la atención)
- **Pregunta:** ¿las señales llegan a tiempo, son comprensibles y el flujo de trabajo es viable?
- **Medidas:** latencia desde el hecho hasta la señal; tiempo de revisión; % de señales con acción documentada si el profesional las hubiese visto; discrepancias; incidentes.
- **Salida:** informe de viabilidad; puerta G2.

### Fase 3 — **Piloto asistencial controlado** (las señales se usan; supervisión intensiva)
- **Diseño recomendado:** estudio pragmático por conglomerados o secuencial (*stepped-wedge*) según número de centros/unidades `[DATO PENDIENTE]`; evaluación temprana según principios de DECIDE-AI `[REQUIERE REFERENCIA: verificar]`.
- **Desenlaces (a priorizar por el CCR, no impuestos aquí):**

| Dominio | Ejemplos | Observación metodológica |
|---|---|---|
| Proceso | Tiempo hasta la primera revisión; % de señales revisadas en plazo; nº de intervenciones CMO | Alta sensibilidad; riesgo de «medir lo que se mide» |
| Resultados clínicos | Supresión virológica a los X meses; discontinuaciones; retrasos de administración en LA-TAR | **Causalidad no inferible sin comparador**; confusión por indicación |
| Seguridad | Señales omitidas; incidentes; eventos adversos relacionados con el software | Obligatorio |
| Experiencia | PREM/PROM seleccionados (A19) | Requiere instrumentos con licencia/validez |
| Equidad | Resultados por brecha digital, edad, vía de adquisición `[DATO PENDIENTE]` | Evitar sesgos |
| Eficiencia | Tiempo profesional por paciente; coste (si hay datos) | Cuidado con medir ahorro sin referencia |

- **Tamaño muestral y criterios de éxito:** `[DATO PENDIENTE]`. No se proponen cifras: dependen de la línea base real y de la mínima diferencia clínicamente relevante que fije el equipo.
- **Salida:** informe de evaluación clínica (insumo del expediente regulatorio) y publicación científica.

### Fase 4 — Vigilancia poscomercialización / seguimiento continuo
- Monitorización de rendimiento y deriva de datos, auditoría periódica de reglas, revisión anual del CCR.

---

## 5. Evaluación específica de componentes nuevos

| Componente | Validación específica | Dependencia |
|---|---|---|
| Módulo LA-TAR | Concordancia con revisión de expertos sobre ventanas/retrasos; casos extremos; contraste con ficha técnica y guías `[REQUIERE REFERENCIA]` | Especificación clínica (A13) |
| Triangulación | Frecuencia de concordancia/discordancia; plausibilidad según revisores; no se evalúa como «verdad» de adherencia | A15 |
| Cuestionarios declarativos | Validación de contenido (panel), comprensión en pacientes (entrevistas cognitivas), fiabilidad si hay puntuación | A14, A19 |
| Canal con paciente | Aceptabilidad, tasa de respuesta, errores de entrega, confidencialidad | C03, C08 |
| Coordinación | Tiempos de acuse, tareas vencidas, satisfacción de los profesionales | B11 |
| N3 (IA generativa) | Evaluación de errores factuales/alucinación; pruebas adversariales; auditoría de sesgos | A21, C05 |
| FHIR | Validación de conformidad con herramienta abierta y perfiles acordados | A12 |

---

## 6. Calidad de datos como objeto de evaluación

Indicadores a medir antes de cualquier validación clínica:
- Completitud de dispensaciones (fechas, componente, días).
- Tasa de conflictos de conciliación.
- Proporción de eventos con procedencia y actor.
- Discrepancia entre fuentes (p. ej. dispensación hospitalaria vs. externa).
- Latencia de llegada de datos.

**Interpretación:** una validación clínica con datos de baja calidad invalida las conclusiones sobre las reglas; por eso la calidad de datos es puerta previa (G1).

---

## 7. Gobernanza de la validación

- Plan estadístico firmado antes de ver datos (A20).
- Registro prospectivo del estudio cuando proceda `[VERIFICAR requisito]`.
- Revisión independiente de resultados (`CLINICAL_GOVERNANCE.md` §3).
- Los resultados negativos se comunican (también a los centros).
- Control de cambios: si una regla cambia durante el estudio, se documenta como desviación.

---

## 8. Matriz de trazabilidad (modelo)

| Req. | Descripción | Riesgo relacionado | Prueba(s) | Evidencia | Estado |
|---|---|---|---|---|---|
| REQ-PDC-01 | PDC por episodio y componente con intersección | R03 | `motor.test.mjs` «Multicomponente: intersección…» | 55 pruebas | Verificado (T1) |
| REQ-PDC-02 | Corpus dorado independiente | R03 | A04 | — | Pendiente |
| REQ-DAT-01 | Rechazo por defecto de eventos no definidos | R14 | A08 | — | Pendiente |
| REQ-LA-01 | Estado «no monitorizado» visible para inyectables | R01 | A06 | — | Pendiente |
| REQ-SEG-01 | Aislamiento por hospital | R17 | B03 | — | Pendiente |
| REQ-GOV-01 | Toda regla N1 con ficha y estado de validación | R03 | A03 | — | Pendiente |

Se ampliará en la actuación A02.

---

## 9. Puertas de decisión (gates)

| Puerta | Criterios de paso | Decide |
|---|---|---|
| **G0** — Fundamentos | Finalidad prevista aprobada; ruta regulatoria decidida; corpus dorado; registro de reglas; riesgos recalibrados | CCR + dirección |
| **G1** — Datos reales (retrospectivo) | EIPD y autorización; entorno institucional con aislamiento y auditoría; plan estadístico | Centro + DPD + CEIm |
| **G2** — Modo sombra | Fase 1 con resultados aceptables; calidad de datos suficiente; ninguna incidencia grave | CCR |
| **G3** — Piloto asistencial | Fase 2 satisfactoria; protocolo de respuesta a señales; consentimiento/información; seguro/responsabilidad; criterios de pausa | CCR + centro + CEIm |
| **G4** — Despliegue ampliado | Evaluación clínica completada; ruta regulatoria cerrada | Dirección + regulador/asesor |

**Criterio general:** una puerta no se «supera» por fecha, sino por evidencia documentada.

---

## 10. Lo que este plan no promete

- No garantiza que las señales mejoren resultados clínicos: es la hipótesis que se evalúa.
- No fija umbrales de éxito sin datos de línea base.
- No sustituye la evaluación clínica exigible por el reglamento aplicable (`REGULATORY_READINESS.md`).
- No presupone que el modelo CMO esté validado en VIH: el piloto debe, además, evaluar el modelo.
