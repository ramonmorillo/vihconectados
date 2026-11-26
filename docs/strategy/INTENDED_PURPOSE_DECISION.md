# INTENDED_PURPOSE_DECISION — Paquete de decisión: finalidad prevista (actuación A01, decisión D-G05)

| | |
|---|---|
| Estado | **PAQUETE PARA DECIDIR. Nada de lo que sigue está decidido ni aprobado** |
| Fecha | 2026-11-26 |
| Quién decide | El comité clínico con asesoramiento regulatorio (y la dirección para la ruta, D-G06). **No puede decidirlo el auditor** |
| Por qué es la primera decisión | La cualificación regulatoria depende de lo que se declara que el software hace, no de su nombre (`REGULATORY_READINESS.md` §2). Esta decisión fija qué evidencia hay que producir, qué actuaciones del backlog se activan y cuáles se aplazan |
| Aviso | Las clasificaciones regulatorias de este documento son **hipótesis a confirmar por un asesor** (`[VERIFICAR]`). No es asesoramiento jurídico |

---

## 1. Qué se decide

Una frase que diga **qué hace** la plataforma, **para quién**, **en qué entorno** y **qué decisiones apoya o no apoya**. Todo el plan posterior se deriva de ella.

## 2. Punto de partida (E0): la demostración actual

Los textos de hoy describen con corrección una **demostración**: datos sintéticos, sin uso asistencial.

| Dónde | Texto actual | Valoración |
|---|---|---|
| `README.md` | «Solo datos sintéticos. Apoyo a revisión profesional; no es un producto clínicamente validado ni un sistema de prescripción.» | Correcto para E0. Es una exención de responsabilidad, no una finalidad prevista |
| `src/legal.js` (Condiciones) | «No está autorizada para tratar datos de pacientes reales ni para utilizarse como sistema asistencial en un hospital.» | Correcto para E0; **impide** E1, E2 y E3 |
| `src/legal.js` (Condiciones) | «No utilizar los resultados para prescribir, cambiar o suspender tratamientos, ni como confirmación de adherencia o control virológico.» | Compatible con E1, E2 y E3 |
| `src/legal.js` (Condiciones) | «El uso previsto es institucional, docente y científico, sin finalidad comercial.» | **Choca con E1, E2 y E3** (uso asistencial) y con cualquier distribución a otros centros |
| `src/legal.js` (Autoría) | «Su finalidad es apoyar el seguimiento longitudinal y la coordinación de Farmacia Hospitalaria e Infecciosas en el marco CMO.» | Es una finalidad amplia, sin población, entorno ni exclusiones |
| `src/legal.js` (Condiciones) | «El uso asistencial futuro exige validación, autorización institucional y garantías técnicas y legales.» | Correcto en cualquier escenario |
| Informes (`src/informes.js`) | «SIMULACIÓN · Datos sintéticos · No validado para uso clínico» | Correcto para E0; habría que sustituirlo en E1–E3 |
| `docs/PILOTO.md` | «Solo se admite TAR oral con un episodio activo.» | **Desactualizado en cualquier escenario** (ya se registran TAR intramusculares); corregido |

---

## 3. Las tres opciones

| | **E1 · Gestión organizativa** | **E2 · Señales de apoyo al seguimiento** | **E3 · Seguimiento activo** |
|---|---|---|---|
| Qué hace | Registra y muestra dispensaciones, citas, tareas y coordinación entre servicios | E1 **más** cobertura de dispensación (PDC), señales para revisión, triangulación de fuentes, estados del TAR de acción prolongada | E2 **más** cuestionarios al paciente y escalado automático de sus respuestas a tareas profesionales |
| Qué no hace | No calcula señales ni prioriza | No contacta con el paciente; no decide ni recomienda tratamiento | No decide tratamiento; el contacto se limita a textos aprobados y a cuestionarios cerrados |
| Valor diferencial (`COMPETITIVE_GAP_ANALYSIS.md`) | Bajo | **Alto**: PDC, triangulación y modelo CMO con explicabilidad | Alto, pero con el mayor riesgo |
| Cualificación probable `[VERIFICAR]` | Posiblemente **no** producto sanitario (sistema de gestión de información) | **Probable producto sanitario** (apoyo a decisiones de seguimiento; Regla 11), clase **IIa** o superior | Producto sanitario, **IIa a IIb** según el impacto de un fallo |
| Evidencia que exige | Verificación de software, calidad de datos, seguridad | E1 **más** validación analítica, estudio silencioso retrospectivo, modo sombra y evaluación clínica (`VALIDATION_MASTER_PLAN.md`) | E2 **más** piloto controlado, usabilidad con pacientes, consentimiento, evaluación del canal |
| Actuaciones del backlog que se activan | A02, A05, A11, A12, B01 a B07, B11, C03 | Todas las de E1 **más** A03, A04, A06, A13, A15, B06 a B10, C01, C02, C04 | Todas las de E2 **más** A14, B12, B13, C07, C08 |
| Riesgos que dominan (`RISK_REGISTER.md`) | R13 a R21 (datos, seguridad) | **R01 a R05, R08, R27, R28** (clínicos y regulatorios) | **R09, R39, R40** (canal con el paciente) |
| Esfuerzo y plazo relativos | Menor | Medio–alto: la validación clínica es el camino crítico | Mayor: se añade todo lo de E2 |
| Compatibilidad con ceder la herramienta a otros hospitales | Probablemente sencilla | **Condicionada** a la ruta regulatoria (D-G06): la exención de uso en la propia institución no cubre la cesión `[VERIFICAR]` | Igual que E2, con más requisitos |

**Importante:** lo que determina la cualificación es la finalidad declarada **y** lo que el software hace. Un sistema que calcula señales para priorizar la revisión **no puede declararse E1** aunque se le llame «gestión».

---

## 4. Recomendación razonada del auditor (no vinculante)

**Declarar E2 como finalidad prevista de la primera versión que use datos reales, y tratar E3 como una ampliación posterior que exige revisar la finalidad prevista.**

**Datos que la apoyan:**
- El valor distintivo que identificó el análisis competitivo (cobertura de dispensación, triangulación y modelo CMO explicable) **es E2**; E1 no lo conserva y E3 añade riesgo sin haber demostrado antes E2.
- El grueso del trabajo ya hecho (PDC, señales, corpus, registro de reglas, esquemas) **ya se comporta como E2**: declarar E1 sería describirlo mal.
- E3 depende de lo que más falta: protocolos aprobados, consentimiento, canal y evaluación de impacto (D-Q01 y siguientes).

**Interpretación y alternativas** (a valorar por el comité):
- Si el comité **no puede afrontar** la ruta regulatoria de E2 en un plazo razonable, la alternativa no es declarar E1, sino **usar E2 solo en un estudio con aprobación ética** (investigación) mientras se resuelve D-G06. Esa vía existe `[VERIFICAR con el CEIm]` y evita comercializar o poner en servicio un producto, pero no reduce los requisitos de protección de datos.
- Si lo que se busca es **solo** mejorar la coordinación entre servicios, E1 es legítimo, pero entonces hay que **retirar o desactivar** las señales y la triangulación del producto declarado.

**Incertidumbres que no puedo resolver:** la clase regulatoria exacta; si la exención de uso interno cubre a los centros que reciban la herramienta; si el hospital dispone de unidad de producto sanitario; el calendario realista, que depende de recursos que desconozco.

---

## 5. Borradores de declaración (para discusión, no aprobados)

Cada declaración debe incluir usuarios, población, entorno, usos permitidos, usos excluidos y supervisión humana.

**E1.** *VIHconectados es un sistema de información para profesionales de farmacia hospitalaria, enfermedades infecciosas y enfermería que organiza datos de dispensación, citas y tareas de personas con infección por VIH en tratamiento antirretroviral para facilitar la coordinación entre servicios. No calcula señales, no prioriza pacientes, no apoya decisiones terapéuticas ni contacta con pacientes.*

**E2.** *VIHconectados es un sistema de información para profesionales de farmacia hospitalaria, enfermedades infecciosas y enfermería que organiza datos de dispensación, registros de consulta y de administración, y presenta señales y discordancias entre fuentes como hipótesis para la revisión profesional del seguimiento farmacoterapéutico de personas adultas con infección por VIH en tratamiento antirretroviral. No diagnostica, no prescribe, no modifica tratamientos, no contacta con pacientes y no sustituye el juicio clínico. Toda señal requiere revisión por un profesional.*

**E3.** *E2, y además permite que el paciente responda cuestionarios cerrados aprobados entre consultas; sus respuestas generan tareas para un profesional según protocolos aprobados. No sustituye la atención urgente ni la consulta, no interpreta las respuestas de forma autónoma y no cambia el tratamiento.*

---

## 6. Qué habría que cambiar en el repositorio según la decisión

**No se aplica nada hasta que se decida.** Para E1, E2 o E3, se revisarían (y se enumeran para que el cambio sea trazable):

| Fichero | Cambio |
|---|---|
| `src/legal.js` (Condiciones y Autoría) | Sustituir «uso previsto institucional, docente y científico» y «no está autorizada… sistema asistencial» por la finalidad aprobada, **sin afirmar** cumplimiento ni validación; mantener las limitaciones |
| `README.md` | Alinear la descripción y el aviso |
| `src/informes.js` (`aviso`) y vistas de informe | Sustituir «SIMULACIÓN · Datos sintéticos» por el aviso que corresponda al entorno (la demostración conserva el suyo) |
| `docs/PILOTO.md`, `docs/MANUAL_USO.md` | Alinear. **No he revisado `MANUAL_USO.md` en esta pasada** |
| `docs/strategy/REGULATORY_READINESS.md` | Fijar el escenario y la ruta |
| `docs/strategy/RISK_REGISTER.md` | Recalibrar con el comité (los riesgos se evaluaron para E2) |
| `docs/strategy/PRIORITIZED_BACKLOG.md` | Activar o aplazar las actuaciones de §3 |

La demostración sintética puede **seguir existiendo** con su aviso actual: la finalidad prevista se declara para el producto con datos reales, no para la demostración pública.

---

## 7. Preguntas mínimas para decidir

1. ¿Se pretende que las **señales prioricen** a quién se revisa primero? (Si sí, no es E1.)
2. ¿Habrá **contacto con el paciente** a través de la plataforma? (Si sí, E3.)
3. ¿Se usará en **un solo hospital** o se cederá a otros centros? (Condiciona la ruta; D-G06.)
4. ¿El primer uso real será **asistencial** o **dentro de un estudio** con aprobación ética?
5. ¿Hay en el hospital una **unidad de producto sanitario** o un asesor regulatorio que pueda revisar esto?
6. ¿Quién será el **responsable del producto** (el hospital, la SEFH, el autor a título personal)? Determina quién es el fabricante y quién responde (D-G09).
7. ¿Qué **horizonte y recursos** hay para la validación clínica?

## 8. Después de decidir

1. Registrar la decisión con acta en `DECISIONS_REGISTER.md` (D-G05).
2. Pedir la cualificación y clasificación formales (C01) con la declaración aprobada.
3. Alinear los textos de §6 y recalibrar riesgos.
4. Activar o aplazar actuaciones del backlog según §3.

---

## 9. Hoja de decisión

| Escenario elegido | Ruta regulatoria prevista | Responsable del producto | Fecha | Acta | Firma |
|---|---|---|---|---|---|
| `[DATO PENDIENTE: E1, E2 o E3]` | `[DATO PENDIENTE]` | `[DATO PENDIENTE]` | | | |
