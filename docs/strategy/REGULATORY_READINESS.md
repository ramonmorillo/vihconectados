# REGULATORY_READINESS — Evaluación preliminar de preparación regulatoria

| | |
|---|---|
| Estado | **BORRADOR TÉCNICO PRELIMINAR. NO ES ASESORAMIENTO JURÍDICO NI UNA CLASIFICACIÓN OFICIAL.** · 2026-11-25 |
| Propósito | Estructurar las preguntas regulatorias, identificar qué decisiones del producto cambian la ruta y qué debe validar un asesor especializado |
| Marcado `[VERIFICAR]` | Referencia normativa citada de memoria profesional general: **debe comprobarse su texto, vigencia y aplicabilidad nacional con asesoría regulatoria** antes de apoyarse en ella. No se ha podido consultar el texto oficial desde esta sesión |

> **Declaración expresa:** este documento no afirma que vihconectados cumpla ni incumpla ninguna norma, ni que posea marcado CE, validación clínica, conformidad RGPD o ENS. El repositorio contiene avisos de demostración (`src/legal.js`) que lo reconocen; no constituyen evidencia de conformidad.

---

## 1. Qué normas probablemente entran en juego (a confirmar)

| Marco | Por qué podría aplicar | Estado en el repositorio |
|---|---|---|
| Reglamento (UE) 2017/745 (MDR) y normativa nacional de desarrollo `[VERIFICAR: p. ej. RD 192/2023]` | Software con finalidad médica (apoyo a decisiones de seguimiento/tratamiento, monitorización) puede ser producto sanitario | Sin declaración formal de finalidad prevista; sin QMS; sin expediente técnico |
| MDCG 2019-11 (cualificación y clasificación de software) `[VERIFICAR versión vigente]` | Guía para decidir si el software es producto sanitario y su clase | No utilizada |
| Regla 11, Anexo VIII del MDR `[VERIFICAR]` | Clasificación del software que aporta información para decisiones diagnósticas/terapéuticas o monitoriza procesos fisiológicos | No aplicada |
| Art. 5(5) MDR — exención de «fabricación y uso en la misma institución sanitaria» `[VERIFICAR condiciones exactas]` | Podría amparar una herramienta desarrollada y usada dentro de un hospital, con condiciones | Ver §4 |
| Reglamento (UE) 2024/1689 (Ley de IA) `[VERIFICAR calendario y alcance]` | Si se añaden componentes de IA, especialmente si el sistema es producto sanitario con intervención de organismo notificado | No hay IA hoy (F-29) |
| RGPD (UE) 2016/679 y LOPDGDD (LO 3/2018) | Datos de salud (categoría especial, art. 9); EIPD (art. 35) probable; responsable/encargado; seudonimización | Datos sintéticos únicamente; textos informativos sin evidencias de cumplimiento |
| ENS (RD 311/2022) `[VERIFICAR]` | Si lo opera el sector público sanitario | No iniciado |
| Reglamento (UE) 2025/327 (EHDS) `[VERIFICAR calendario]` | Interoperabilidad y uso de datos de salud | No iniciado |
| Ley 41/2002 y normativa autonómica de historia clínica y acceso | Acceso a historia clínica, derechos del paciente | No iniciado |
| Normativa de investigación (CEIm, estudios observacionales, ensayos con productos sanitarios) `[VERIFICAR: p. ej. RD 957/2020 y RD 192/2023]` | Evaluación del piloto con pacientes | No iniciado |
| Estándares: ISO 13485 (QMS), ISO 14971 (riesgos), IEC 62304 (ciclo de vida de software), IEC 62366-1 (usabilidad), ISO/IEC 27001 y 27701 (seguridad y privacidad) | Facilitan demostrar conformidad si la ruta es producto sanitario | No iniciado |

---

## 2. La pregunta decisiva: finalidad prevista

La cualificación regulatoria depende de **lo que el fabricante declara que el software hace** y de lo que realmente hace, no del nombre. El repositorio hoy contiene mensajes en tensión:

| Fuente | Texto | Lectura regulatoria |
|---|---|---|
| `README.md` | «Apoyo a revisión profesional; no es un producto clínicamente validado ni un sistema de prescripción» | Es una exención de responsabilidad, no una finalidad prevista; puede no bastar si el funcionamiento real apoya decisiones |
| `src/legal.js` (Condiciones) | «No utilizar los resultados para prescribir, cambiar o suspender tratamientos» | Limita el uso declarado, pero el software calcula señales que orientan el seguimiento clínico |
| `REGLAS.validacion` / alertas | «Pendiente de validación profesional» | Reconoce la ausencia de validación |
| Objetivo 2.0 | «Plataforma integral de inteligencia farmacoterapéutica, seguimiento activo y coordinación» | Finalidad claramente **médica** (monitorización, apoyo a la intervención) |

**I.** Cuando la funcionalidad pase de «visualizar datos» a «generar señales/prioridades que determinan quién recibe una intervención clínica», es probable que el software deje de ser un mero sistema de gestión de información `[VERIFICAR con asesor]`.

### Borrador de declaración de finalidad prevista (para discusión; no aprobado)

> *VIHconectados es un sistema de información para profesionales de farmacia hospitalaria, enfermedades infecciosas y enfermería que organiza datos de dispensación, registros de consulta y respuestas de seguimiento de personas con infección por VIH en tratamiento antirretroviral, para apoyar la revisión profesional del seguimiento farmacoterapéutico. No diagnostica, no prescribe, no modifica tratamientos y no sustituye el juicio clínico. Toda señal es una hipótesis para revisión profesional.*

**Decisiones que este texto no resuelve** y que el usuario/equipo debe tomar: ¿se pretende que las señales *prioricen* quién es contactado? ¿Se permite el contacto automatizado con el paciente? ¿Se usa el resultado para decidir cambios de TAR? Cada «sí» eleva la probabilidad de producto sanitario y su clase.

---

## 3. Escenarios de finalidad y cualificación probable (hipótesis)

| Escenario | Qué hace el software | Cualificación probable | Clase probable (si aplica) | Comentario |
|---|---|---|---|---|
| **E0 — Demostración actual** | Datos sintéticos, docencia, evaluación técnica | Fuera de uso asistencial; no se pone en servicio con pacientes | — | Estado actual (`legal.js`) |
| **E1 — Gestión organizativa** | Registro y visualización de dispensaciones y tareas, sin señales | Podría no ser producto sanitario `[VERIFICAR]` | — | Reduce valor diferencial |
| **E2 — Señales de apoyo al seguimiento** | PDC, señales, triangulación y priorización de revisión | Probable producto sanitario por apoyo a decisiones/monitorización `[VERIFICAR]` | **IIa** o superior según el impacto de decisiones erróneas `[VERIFICAR Regla 11]` | Es el núcleo de 2.0 |
| **E3 — Seguimiento activo automatizado** | Contacto automático con el paciente, cuestionarios con escalado | Probable producto sanitario | IIa–IIb según los riesgos de falsa tranquilidad `[VERIFICAR]` | Añade consentimiento y evaluación clínica reforzada |
| **E4 — IA generativa en la ruta clínica** | Prioriza o decide con modelo generativo | Producto sanitario + sistema de IA de alto riesgo `[VERIFICAR]` | IIa–IIb+ | **No recomendado** (véase `TARGET_ARCHITECTURE_V2.md` §4) |

**R.** Decisión estratégica a tomar *antes* de invertir en E3: ¿se persigue (a) un producto con ruta CE de fabricante, (b) uso interno de una o varias instituciones bajo la exención de institución sanitaria, o (c) mantener E1 como herramienta organizativa y dejar E2/E3 como proyecto de investigación? Cada opción tiene costes y plazos muy distintos.

---

## 4. La exención «in-house» y por qué importa para un proyecto multicéntrico

**D.** El artículo 5(5) del MDR `[VERIFICAR]` permite, bajo condiciones (entre otras: uso en la misma institución, sistema de gestión de calidad apropiado, justificación de que las necesidades no se cubren con productos comercializados, documentación, información a la autoridad), que una institución sanitaria fabrique y utilice productos sanitarios sin marcado CE.

**I (a verificar por asesor).**
- Es una vía **plausible** para un único hospital que desarrolle y use la herramienta.
- **Se tensiona** si la plataforma se cede o se despliega en **otros hospitales** (la «misma institución» deja de cumplirse) o si un tercero la explota comercialmente. La «vocación de cesión gratuita» expresada en `legal.js` no resuelve esto: la cesión a otras instituciones puede constituir comercialización o puesta a disposición `[VERIFICAR]`.
- Requiere igualmente un sistema de calidad, gestión de riesgos y evidencia clínica proporcionados; «in-house» no significa «sin requisitos».

**R.** Consultar a la unidad de producto sanitario/asesoría regulatoria del hospital (o de la SEFH) antes de comprometer un modelo de distribución multicéntrica.

---

## 5. Brecha de preparación (checklist por requisito)

Estado: **No iniciado** = no hay artefacto en el repositorio; **Parcial** = hay elementos reutilizables.

| Requisito | Artefacto esperado | Estado | Elementos reutilizables del repositorio |
|---|---|---|---|
| Finalidad prevista y usuarios/entorno | Documento aprobado | No iniciado | Borrador §2 |
| Cualificación y clasificación | Informe razonado (MDCG 2019-11, Regla 11) | No iniciado | — |
| Sistema de gestión de calidad | Procedimientos (ISO 13485 o equivalente institucional) | No iniciado | — |
| Gestión de riesgos | Plan, análisis de peligros y archivo (ISO 14971) | No iniciado | `RISK_REGISTER.md` (punto de partida, no sustituye) |
| Ciclo de vida del software | Plan, requisitos, arquitectura, verificación, mantenimiento (IEC 62304) | No iniciado | Pruebas unitarias (55), trazabilidad por eventos, separación de dominio |
| Ingeniería de usabilidad | Plan y evaluación formativa/sumativa (IEC 62366-1) | No iniciado | Recorridos de navegador (no son usabilidad con usuarios) |
| Evaluación clínica | Plan y informe (MDR art. 61, MDCG 2020-1 `[VERIFICAR]`) | No iniciado | `VALIDATION_MASTER_PLAN.md` (propuesta) |
| Seguimiento poscomercialización | Plan y vigilancia | No iniciado | — |
| Gestión de cambios y versiones | Control de configuración | Parcial | Git, `VERSION`, reglas versionadas (`REGLAS.version`) |
| Trazabilidad requisitos–pruebas | Matriz | No iniciado | Pruebas con títulos descriptivos; backlog A02 |
| Protección de datos | EIPD, base jurídica, DPD, RAT, contratos | No iniciado | Principios de minimización en `legal.js` |
| Ciberseguridad | Modelo de amenazas, pruebas de penetración, gestión de vulnerabilidades | No iniciado | CSP, escape HTML, lista blanca del servidor |
| Etiquetado/instrucciones de uso | IFU y limitaciones | Parcial | Manual (`docs/MANUAL_USO.md`), avisos de limitación |
| IA (si aplica) | Evaluación de riesgos de IA, gobernanza de datos, transparencia | No aplica hoy | Política N3 propuesta |

---

## 6. Evaluación de privacidad (resumen para EIPD futura)

| Aspecto | Observación en el repositorio | Riesgo si se usan datos reales |
|---|---|---|
| Categoría de datos | Salud; VIH es especialmente sensible (estigma, discriminación) | Alto |
| Almacenamiento | `localStorage` sin cifrado, sin control de acceso (`legal.js`, `PILOTO.md`) | **Inaceptable** para datos reales |
| Texto libre | `objetivo`, `observaciones`, `motivo`, `instrucciones` limitados por longitud | Posible inclusión de identificadores |
| Exportaciones | JSON completo y PDF/portapapeles fuera de control | Fuga |
| Terceros | CIMA recibe solo texto de búsqueda/nº de registro | Bajo; verificar CORS/disponibilidad |
| Canal con el paciente | No existe | Nuevo riesgo: confidencialidad del canal (SMS/voz), consentimiento, huellas en el teléfono |
| Minimización | Informe embebe todos los eventos (`informes.js`) | Exceso de datos por documento |
| Datos de VIH y terceros | Contactos, teléfonos, parejas: no se recogen hoy | Si se recogen, exigir minimización estricta |

**R.** No habilitar ningún tratamiento de datos personales de salud sin: responsable y base jurídica identificados, EIPD, DPD, entorno institucional y autorización expresa del centro (`docs/PILOTO.md`, puntos 4 y 5).

---

## 7. Supervisión humana (requisito transversal)

**D.** El diseño ya establece que toda señal es hipótesis, que el nivel CMO no se asigna automáticamente y que no se modifica tratamiento (`PILOTO.md`, `legal.js`, `motor.js` textos de alertas).

**Requisitos propuestos para V2** (a incorporar en la finalidad prevista y en el diseño de riesgos):
1. Ninguna señal, nivel ni mensaje al paciente se genera sin una regla versionada aprobada y un profesional responsable asignado por función.
2. Toda comunicación con el paciente derivada de una señal pasa por una revisión humana configurable (**humano en el bucle** al inicio; paso a «humano supervisor» solo tras evidencia).
3. El profesional puede anular/suspender cualquier automatización; la anulación queda registrada.
4. La interfaz distingue explícitamente dato, interpretación y recomendación (alineado con las preferencias del equipo).
5. Registro de los casos en que el profesional discrepa de la señal (insumo para mejorar reglas).

---

## 8. Documentación mínima a producir (próximos pasos regulatorios)

| Orden | Documento | Responsable sugerido | Coste |
|---|---|---|---|
| 1 | Finalidad prevista aprobada y decisión E1/E2/E3 | Equipo clínico + asesor | Bajo |
| 2 | Informe de cualificación/clasificación | Asesor regulatorio | Medio |
| 3 | Decisión de ruta: CE de fabricante / in-house / investigación | Dirección + asesor + jurídico | Medio |
| 4 | Plan de gestión de riesgos | Equipo + calidad | Medio |
| 5 | EIPD y base jurídica | DPD/jurídico del centro | Medio |
| 6 | Plan de evaluación clínica y protocolo del piloto | Equipo investigador + CEIm | Medio |

---

## 9. Lo que NO puede afirmarse hoy

- Que VIHconectados es o no es un producto sanitario.
- Que cumple RGPD, ENS, EHDS, MDR, IEC 62304, ISO 14971 o WCAG.
- Que el algoritmo está validado (`REGLAS.validacion = "Pendiente de validación profesional"`).
- Que el modelo CMO está validado en VIH (no hay datos en el repositorio).
- Que existe cesión formal, aval SEFH o acuerdos con centros (`legal.js` lo niega expresamente).
- Que TUCUVI/LOLA posee o no un marcado CE de clase IIb: es una afirmación del proveedor no verificada aquí (`COMPETITIVE_GAP_ANALYSIS.md`).
