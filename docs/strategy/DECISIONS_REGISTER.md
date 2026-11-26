# DECISIONS_REGISTER — Registro único de decisiones abiertas

| | |
|---|---|
| Estado | **Todas las decisiones están ABIERTAS.** Ninguna la puede tomar el auditor |
| Fecha | 2026-11-26 |
| Para qué sirve | Que el comité y la dirección vean en un solo sitio qué hay que decidir, quién lo decide, qué desbloquea y en qué orden |
| Cómo se mantiene | `pruebas/decisiones.test.mjs` falla si una decisión de las especificaciones no figura aquí, si una fila no tiene responsable, ola y desbloqueo, o si se marca «Resuelta» sin referencia a un acta |

> Este registro **no resuelve nada**: ordena. Las «propuestas provisionales» son las que figuran en cada documento de origen y no están aprobadas.

---

## 1. Resumen

| Bloque | Decisiones | Documento de origen |
|---|---|---|
| Gobernanza, regulatorio y aprobación de lo construido (`D-G`) | 16 | Este registro; `CLINICAL_GOVERNANCE.md`, `REGULATORY_READINESS.md`, `PRODUCT_ROADMAP.md` |
| TAR de acción prolongada (`D-01` a `D-12`) | 12 | `LA_TAR_CLINICAL_SPEC.md` §9 |
| Evidencia y triangulación (`D-E01` a `D-E13`) | 13 | `EVIDENCE_TRIANGULATION_SPEC.md` §9 |
| Cuestionarios y escalado (`D-Q01` a `D-Q11`) | 11 | `QUESTIONNAIRE_SPEC.md` §11 |
| **Total** | **52** | |

## 2. Orden recomendado (olas)

Cada ola desbloquea la siguiente. **Una ola posterior puede empezar a discutirse antes, pero no puede cerrarse sin la anterior.**

| Ola | Qué se decide | Por qué va en este orden |
|---|---|---|
| **0 · Gobernanza** | Quién decide (comité, revisor independiente, pacientes), con qué sponsor y centro, y **qué es el producto** (finalidad prevista y ruta regulatoria) | Sin comité nadie puede aprobar nada; sin finalidad prevista no se sabe qué evidencia producir. Ver `INTENDED_PURPOSE_DECISION.md` |
| **1 · Aprobar lo ya construido** | Reglas, señal de inyectables, corpus del PDC, licencia, proyectos hermanos | Es lo único implementado: sin aprobarlo no hay base para validar |
| **2 · Especificaciones clínicas** | TAR de acción prolongada, modelo CMO, instrumentos | Desbloquean los módulos B08 y A16 |
| **3 · Triangulación** | Umbrales, confianza, eventos de suministro | Desbloquea el motor de evidencia (B09) |
| **4 · Seguimiento activo** | Protocolos de respuesta, textos al paciente, canales, frecuencia | Es lo que más riesgo clínico añade (R39); va el último a propósito |

---

## 3. Ola 0 y Ola 1: gobernanza y aprobación de lo construido

| ID | Decisión | Quién decide | Estado | Ola | Desbloquea |
|---|---|---|---|---|---|
| D-G01 | ¿Qué órgano ejerce de Comité Clínico de Reglas (grupo MAPEX/ADHEFAR, comisión del hospital) o hay que crearlo? | Dirección | Abierta | 0 | Todo lo demás: A03, A04, A06, A13, A14, A15 |
| D-G02 | ¿Quién ejerce de revisor independiente de las reglas (ajeno al desarrollo)? | Dirección y comité | Abierta | 0 | Aprobación de reglas N1 (`CLINICAL_GOVERNANCE.md` §3) |
| D-G03 | Hospital piloto y sponsor institucional | Dirección | Abierta | 0 | Clase B completa (B01 a B15), C03, C06 |
| D-G04 | ¿Hay un representante de pacientes para el comité? | Comité | Abierta | 0 | D-Q02, D-Q09, D-E10 |
| D-G05 | **Finalidad prevista y escenario (E1, E2 o E3)** | Comité y asesor regulatorio | Abierta | 0 | A01; C01; qué evidencia se produce. Paquete de decisión en `INTENDED_PURPOSE_DECISION.md` |
| D-G06 | Ruta regulatoria: marcado CE de fabricante, uso interno de una institución o investigación | Dirección y asesor | Abierta | 0 | C02; el modelo de cesión a otros centros |
| D-G07 | Rejilla CMO vigente y su estado de validación en VIH | Equipo MAPEX | Abierta | 2 | A16, B16 |
| D-G08 | Repositorio, licencia y titularidad de HIV Prescribing Cascade Auditor, CambiosTAR y RXplain | Autor | Abierta | 1 | Marco de reutilización (`TARGET_ARCHITECTURE_V2.md` §8) |
| D-G09 | Licencia y titularidad de este repositorio; permisos de redistribución de las fuentes | Autor y asesoría | Abierta | 1 | A11; cualquier cesión |
| D-G10 | ¿El repositorio es público o privado? (determina si Actions es gratuito) | Autor | Abierta | 1 | A05 (integración continua gratuita) |
| D-G11 | Segundo revisor independiente que calcule y firme el corpus dorado del PDC | Comité | Abierta | 1 | Cierre de A04 |
| D-G12 | Confirmar o cambiar la señal «NO MONITORIZADO» para inyectables (decisión provisional del auditor) | Comité | Abierta | 1 | Cierre de A06; R01 |
| D-G13 | Revisar el contenido de las fichas del registro de reglas (descripción, fuente, población, exclusiones, riesgos) | Comité | Abierta | 1 | Cierre de A03 |
| D-G14 | Justificar o sustituir la ventana de 180 días y el umbral de 0,9 del PDC (heredados, sin referencia clínica) | Comité | Abierta | 1 | Validación del PDC (R03); `VALIDATION_MASTER_PLAN.md` |
| D-G15 | Instrumentos PROM/PREM y sus licencias | Comité | Abierta | 2 | A19; cuestionarios validados |
| D-G16 | Exportación de informes: ¿qué modo es el predeterminado (completo, que permite reproducir el cálculo, o mínimo, que minimiza datos) y qué finalidad justifica cada uno? Hoy la aplicación ofrece ambos sin predeterminado | Comité y DPD | Abierta | 1 | Cierre de A09; R19; EIPD (C03) |

---

## 4. Ola 2: TAR de acción prolongada (`LA_TAR_CLINICAL_SPEC.md` §9)

Requiere antes la revisión por **dos clínicos** (Infecciosas y Farmacia) y la confirmación de la vigencia de las fichas técnicas en CIMA.

| ID | Decisión | Quién decide | Estado | Ola | Desbloquea |
|---|---|---|---|---|---|
| D-01 | Anclaje del calendario tras una inyección dentro de la ventana pero no en la diana | Infecciosas y comité | Abierta | 2 | Cálculo de la siguiente diana (B08) |
| D-02 | Aritmética de «n meses» (mes calendario con recorte a fin de mes) | Comité | Abierta | 2 | Casos pendientes del corpus LA-TAR |
| D-03 | Antelación del aviso previo a la ventana | Centro | Abierta | 2 | Señal LA-S01 |
| D-04 | Responsables y prioridades de cada señal LA-S | Comité | Abierta | 2 | B08, B11 |
| D-05 | Estado de «visita incompleta» (solo uno de los dos fármacos) | Comité | Abierta | 2 | LA-S05 |
| D-06 | Puente oral: ¿PDC oral existente o evento propio? | Comité y equipo técnico | Abierta | 2 | Diseño del evento `puente_oral` |
| D-07 | Qué mostrar de la persistencia farmacocinética | Comité | Abierta | 2 | Informe y panel |
| D-08 | Qué muestra el sistema de las Tablas 4 y 5 de la ficha técnica (frontera regulatoria) | Comité y asesor | Abierta | 2 | LA-S03; C01 |
| D-09 | ¿Registrar los factores basales de riesgo para priorizar? | Comité | Abierta | 2 | Priorización |
| D-10 | Otros fármacos de acción prolongada y profilaxis preexposición | Comité | Abierta | 2 | Especificaciones adicionales |
| D-11 | Inyección administrada más de 7 días antes de la diana | Comité | Abierta | 2 | Casos pendientes del corpus LA-TAR |
| D-12 | Referencia de la diana tras reinicio o puente oral | Comité | Abierta | 2 | B08 |

---

## 5. Ola 3: evidencia y triangulación (`EVIDENCE_TRIANGULATION_SPEC.md` §9)

| ID | Decisión | Quién decide | Estado | Ola | Desbloquea |
|---|---|---|---|---|---|
| D-E01 | Polaridad y umbrales de cada dimensión (PDC y carga viral) | Comité e Infecciosas | Abierta | 3 | B09 |
| D-E02 | Comparabilidad temporal de la analítica con la ventana del PDC | Comité | Abierta | 3 | B09, B10 |
| D-E03 | Rúbrica de confianza y confianza mínima para activar una discordancia | Comité | Abierta | 3 | B09 |
| D-E04 | Efecto de ingreso y suspensión (excluir del denominador) y fuente exigida | Comité | Abierta | 3 | Cambio del motor de PDC |
| D-E05 | Dispensación externa: fuentes aceptadas y conciliación con la hospitalaria | Comité y Farmacia | Abierta | 3 | B06 |
| D-E06 | Prioridad y responsable de cada acción de triangulación | Comité | Abierta | 3 | B09, B11 |
| D-E07 | ¿El nivel CMO entra como fuente? (riesgo de circularidad) | Comité | Abierta | 3 | A16 |
| D-E08 | Confirmar la prohibición de puntuaciones o índices compuestos | Comité | Abierta | 3 | Principio de diseño |
| D-E09 | Retención y minimización de afirmaciones de autoinforme y analítica | DPD (EIPD) | Abierta | 3 | C03 |
| D-E10 | Si algo de la triangulación se muestra alguna vez al paciente | Comité y pacientes | Abierta | 3 | Diseño de pantallas |
| D-E11 | Persistencia: ¿evento nuevo o proyección derivada? Fuente del método «Registro externo revisado» | Equipo técnico | Abierta | 3 | B09 |
| D-E12 | Catálogo cerrado de códigos (motivo de suspensión, de corrección) | Comité | Abierta | 3 | Esquema de afirmación |
| D-E13 | Varias afirmaciones de la misma fuente en la ventana: ¿la más reciente, la más desfavorable? | Comité | Abierta | 3 | B09 |

---

## 6. Ola 4: seguimiento activo (`QUESTIONNAIRE_SPEC.md` §11)

| ID | Decisión | Quién decide | Estado | Ola | Desbloquea |
|---|---|---|---|---|---|
| D-Q01 | Responsable, plazo y prioridad de los 4 protocolos de escalado | Comité | Abierta | 4 | Activación de cualquier cuestionario; R39 |
| D-Q02 | Textos del aviso de no urgencia y del cierre, con pacientes | Comité y pacientes | Abierta | 4 | Activación; R39 |
| D-Q03 | ¿Es obligatoria la vía «solicita contacto» en todo cuestionario? | Comité | Abierta | 4 | Esquema de cuestionario |
| D-Q04 | Canales permitidos por cuestionario según la sensibilidad del contenido | Comité y DPD | Abierta | 4 | B12, B13; C03 |
| D-Q05 | ¿Se permiten preguntas no obligatorias? | Comité | Abierta | 4 | Esquema de cuestionario |
| D-Q06 | Frecuencia máxima de contacto por paciente | Comité | Abierta | 4 | Automatización N2; R40 |
| D-Q07 | Qué ocurre con un cuestionario abandonado a medias | Comité | Abierta | 4 | B12 |
| D-Q08 | Versionado de cuestionarios y de sus respuestas | Equipo técnico | Abierta | 4 | B12 |
| D-Q09 | Lenguaje, nivel de lectura, idiomas y validación de la comprensión con pacientes | Comité y pacientes | Abierta | 4 | C07, A18 |
| D-Q10 | Aplicación por entrevista profesional: identificación del actor | Comité | Abierta | 4 | B12, B04 |
| D-Q11 | Retención de las respuestas y de su vínculo con la historia | DPD (EIPD) | Abierta | 4 | C03 |

---

## 7. Cómo cerrar una decisión

1. La toma el órgano indicado en «Quién decide», **por escrito y con acta**.
2. Se cambia aquí «Abierta» por «Resuelta», se añade la referencia al acta (`ACTA-…`) y la fecha en la fila.
3. Se actualiza el documento de origen (la propuesta provisional pasa a ser la decisión o se sustituye) y la actuación del backlog que dependía de ella.
4. La prueba exige la referencia al acta: una decisión no puede marcarse como resuelta sin ella.
