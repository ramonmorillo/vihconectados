# QUESTIONNAIRE_SPEC — Cuestionarios declarativos y reglas de escalado (actuación A14)

| | |
|---|---|
| Estado | **BORRADOR TÉCNICO PARA REVISIÓN CLÍNICA. Los protocolos de escalado y los textos al paciente NO están aprobados** |
| Fecha | 2026-11-25 |
| Qué es | Un esquema ejecutable de cuestionario y una propuesta de cómo se enlazan sus respuestas con el trabajo profesional |
| Qué NO es | No es un motor de envío (backlog B12), no elige canal, no usa IA, no puntúa y no está conectado a la aplicación |
| Archivos | `src/esquema-cuestionario.js` · `pruebas/cuestionarios/{ejemplos,protocolos}.json` · `pruebas/cuestionarios.test.mjs` |

---

## 0. Estado frente a los criterios de aceptación de A14

| # | Criterio | Estado | Detalle |
|---|---|---|---|
| 1 | Esquema JSON de cuestionario (ítems cerrados, ramificación, escalado) | **Cumplido** | `src/esquema-cuestionario.js`: cerrado en todos los niveles; 3 tipos de pregunta, 6 operadores de condición, escalado |
| 2 | Tres cuestionarios de ejemplo **sin instrumentos con licencia no autorizados** | **Cumplido** | 3 ejemplos de diseño propio. Un instrumento con licencia exige titular y autorización documentada; una guarda léxica rechaza nombres de escalas conocidas (heurística: §8) |
| 3 | Ramificación determinista (sin IA) | **Cumplido** | La ramificación solo avanza (sin ciclos), todo es alcanzable y las condiciones solo usan respuestas ya dadas. Recorrido exhaustivo de todos los caminos en las pruebas (§4) |
| 4 | Cada regla de escalado vinculada a un responsable y plazo **definidos en el protocolo** | **Cumplido el vínculo; los valores, PENDIENTES** | Cada escalado referencia un protocolo (`PR-…`). **Los cuatro protocolos existen pero están pendientes**: responsable, plazo y prioridad los fija el comité (`CLINICAL_GOVERNANCE.md` §5). Ningún cuestionario es activable hasta entonces (§7) |

**Consecuencia directa:** hoy no hay ningún cuestionario que pueda enviarse a un paciente, y es lo correcto: faltan el comité, el consentimiento (C08) y la evaluación de impacto (C03).

---

## 1. Principios

1. **Un cuestionario es dato, no código.** Condiciones de un lenguaje cerrado; sin expresiones, scripts, llamadas externas ni IA.
2. **Solo respuestas cerradas.** No existe la pregunta de texto libre (privacidad: un texto libre es el principal vector de datos identificativos accidentales).
3. **Sin puntuaciones.** El esquema no tiene dónde guardar una puntuación, un índice ni un «nivel de adherencia».
4. **La ramificación solo avanza.** Garantiza terminación y determinismo por construcción.
5. **Escalar es crear trabajo para un profesional,** no contestar al paciente ni cambiar nada. Los únicos textos automáticos al paciente son los avisos fijos aprobados.
6. **Nada se envía sin aprobación** del cuestionario, de sus protocolos y de sus avisos.
7. **Independiente del canal.** El contenido no depende de cómo se entregue (`ADR-7` de `TARGET_ARCHITECTURE_V2.md`); el canal es un adaptador.
8. **El paciente siempre puede pedir que le contacten** (pauta de diseño; §6.3).

---

## 2. Esquema

| Nivel | Campos (todos cerrados: cualquier otro se rechaza) |
|---|---|
| **Cuestionario** | `formato`, `id`, `version` (x.y.z), `estado` (borrador, revisado, aprobado), `aprobacion` (comité, revisor independiente, fecha, acta, o nulo), `titulo`, `proposito`, `poblacion`, `instrumento`, `canales`, `aviso_inicial`, `mensaje_cierre`, `inicio`, `items`, `escalado` |
| **Instrumento** | `origen` (`propio` o `licenciado`); si es `licenciado`, `titular` y `autorizacion` obligatorios |
| **Pregunta** (`items`, 1–20) | `id`, `tipo` (`si_no`, `opcion_unica`, `opcion_multiple`), `texto` (≤ 240, sin `<` ni `>`), `obligatorio`, `opciones` (2–8; no en `si_no`), `registro`, `siguiente`, `por_defecto` |
| **Opción** | `codigo` (`[a-z0-9_]`), `texto` (≤ 120) |
| **Regla de ramificación** (`siguiente`) | `cuando` (condición), `ir_a` (pregunta posterior o `FIN`) |
| **Registro** | `{tipo: "respuesta"}` o `{tipo: "afirmacion", fuente: "autoinforme", magnitud: "dificultad_referida", dominio (barrera, dificultad, efecto), positivas}` |
| **Escalado** (1–20) | `id`, `cuando` (condición), `protocolo` (`PR-…`), `motivo` (`dificultad_referida`, `efecto_referido`, `barrera_de_acceso`, `cita_no_confirmada`, `no_acudira_a_cita`, `solicita_contacto`) |
| **Aviso** | `aviso_inicial` y `mensaje_cierre` referencian textos fijos del registro de avisos |

Un cuestionario `aprobado` exige `aprobacion` completa (comité, revisor independiente, fecha, acta); si no, es inválido.

---

## 3. Lenguaje de condiciones

| Forma | Significado |
|---|---|
| `{item, op: "es", valor}` / `"no_es"` | Pregunta de respuesta única (`si_no`, `opcion_unica`) igual o distinta a un código |
| `{item, op: "incluye", valor}` / `"no_incluye"` | Opción múltiple que contiene o no un código |
| `{item, op: "respondido"}` / `"no_respondido"` | Sin valor |
| `{todas: [...]}` / `{alguna: [...]}` | Todas o alguna (1–8), con profundidad máxima de 2 niveles |

**Semántica de lo no respondido** (comprobada por pruebas): lo ausente o una selección vacía **nunca cumple** `es`, `no_es`, `incluye` ni `no_incluye`; solo cumple `no_respondido`. Así «no contestó» nunca se confunde con «contestó no». Los valores de una condición deben ser códigos existentes de esa pregunta, y `es` / `incluye` se aplican al tipo de pregunta correcto.

---

## 4. Garantías estáticas y determinismo

`validarCuestionario` rechaza, antes de que exista ningún motor:

1. Identificadores duplicados (preguntas, opciones, escalados).
2. `inicio` distinto de la primera pregunta.
3. Saltos (`ir_a`, `por_defecto`) hacia atrás o a una pregunta que no existe: **la ramificación solo avanza**, luego el grafo es acíclico y todo recorrido termina.
4. Preguntas inalcanzables desde `inicio`.
5. Condiciones de ramificación que usan una respuesta que aún no se ha dado.
6. Condiciones con operadores, códigos o preguntas incorrectos, o demasiado profundas.
7. Escalados que apuntan a un protocolo o aviso inexistente (con el registro).

**Recorrido exhaustivo.** Las pruebas enumeran todos los caminos posibles de cada ejemplo (para opciones múltiples: cada opción sola, todas, y se omite el subconjunto vacío cuando la pregunta es obligatoria) y comprueban que terminan, no repiten preguntas, dan el mismo resultado en dos ejecuciones y no dependen del orden de las claves:

| Cuestionario | Caminos enumerados | Itinerarios distintos | Preguntas por camino |
|---|---|---|---|
| Seguimiento entre consultas | 80 | 4 | 3–5 |
| Próxima inyección (acción prolongada) | 14 | 3 | 2–4 |
| Tras un cambio de tratamiento | 42 | 2 | 2–4 |

Además, cada regla de escalado se dispara en algún camino y **no en todos** (una regla que nunca se dispara o se dispara siempre es un error de diseño).

**Límite:** la enumeración es exhaustiva para los ejemplos, no una prueba formal para todo cuestionario futuro. La garantía general la dan las reglas estáticas 3 a 5 (grafo acíclico y condiciones sobre respuestas ya dadas), que sí valen para cualquier cuestionario válido.

---

## 5. Qué se guarda de lo respondido

- `registro: {tipo: "respuesta"}`: se guarda la respuesta como códigos de pregunta y opción, ligada a la `id` y `version` del cuestionario.
- `registro: {tipo: "afirmacion", …}`: la respuesta se convierte además en una **afirmación del modelo de evidencia** (A15): fuente `autoinforme`, magnitud `dificultad_referida`, método de captura `cuestionario`, actor `Paciente`, confianza media. Una opción positiva da `si`; el resto, `no`. Las pruebas comprueban que todas las respuestas posibles producen afirmaciones válidas.

Lo que **no** se guarda ni se calcula: puntuaciones, índices, etiquetas de conducta, ni nada que no sea una respuesta cerrada.

---

## 6. Escalado y protocolos

### 6.1 Cómo se enlaza

Una regla de escalado no contiene responsable ni plazo: apunta a un **protocolo** del registro, que es donde el comité los fija. Así el plazo y el responsable de «revisar una dificultad referida» se definen una vez y no se repiten (ni se contradicen) en cada cuestionario.

### 6.2 Protocolos necesarios (todos PENDIENTES)

| Protocolo | Para qué | Responsable | Plazo | Prioridad |
|---|---|---|---|---|
| `PR-REVISION-FARMACIA` | Revisar una dificultad o una molestia referida | `[DATO PENDIENTE]` | `[DATO PENDIENTE]` | `[DATO PENDIENTE]` |
| `PR-ACCESO` | Revisar una barrera de acceso a la medicación | `[DATO PENDIENTE]` | `[DATO PENDIENTE]` | `[DATO PENDIENTE]` |
| `PR-CITA-LA` | Cita de inyección sin confirmar o a la que no podrá acudir | `[DATO PENDIENTE]` | `[DATO PENDIENTE]` | `[DATO PENDIENTE]` |
| `PR-CONTACTO` | El paciente pide que le contacten | `[DATO PENDIENTE]` | `[DATO PENDIENTE]` | `[DATO PENDIENTE]` |

Este documento **no propone ningún plazo**. El esquema solo admite como responsables Farmacia Hospitalaria, Infecciosas o Enfermería, y plazos en horas o días hábiles. Un protocolo no puede declararse aprobado sin responsable, plazo, prioridad y aprobación documentada (comité, acta y fecha); las pruebas lo exigen.

### 6.3 La vía de contacto y el aviso de no urgencia

**Un cuestionario no es un servicio de urgencias, y el paciente puede creer que sí.** El riesgo más serio de esta línea de trabajo es que alguien comunique un problema importante por un canal que nadie revisa a tiempo (R39). Los controles son de diseño:

- Todo cuestionario muestra al empezar el aviso `AVISO-NO-URGENTE` (texto propuesto, **sin aprobar**: «Este cuestionario no es un servicio de urgencias y no sustituye la atención de su equipo. Si cree que necesita atención urgente, acuda a urgencias o llame al servicio de emergencias.»).
- Todo ejemplo incluye una pregunta final «¿Quiere que alguien de su equipo se ponga en contacto con usted?» con escalado `solicita_contacto`. Las pruebas lo exigen en los ejemplos; **si debe ser obligatorio en el esquema lo decide el comité** (D-Q03).
- El cierre (`CIERRE-GENERICO`: «Gracias por responder. Su equipo revisará sus respuestas.») **no promete un plazo**, porque el plazo lo fija un protocolo aún sin aprobar.
- Los ejemplos **no preguntan por síntomas agudos ni por urgencias**: ese triaje es una decisión clínica que este documento no toma.

---

## 7. Activación

`esActivable(cuestionario, protocolos)` devuelve si puede enviarse y, si no, por qué. Exige a la vez: estado `aprobado` con su aprobación, **todos** los protocolos referenciados aprobados y ambos avisos aprobados.

**Hoy ningún cuestionario es activable** (las pruebas lo comprueban y listan los motivos: estado, protocolos y aviso sin aprobar). Un cuestionario aprobado con protocolos pendientes tampoco lo es, ni uno con un solo protocolo sin aprobar.

---

## 8. Instrumentos con licencia

Escalas y cuestionarios validados (de adherencia, calidad de vida, satisfacción, etc.) suelen tener titular y condiciones de uso. Reglas:

- Los tres ejemplos son **de diseño propio**: no reproducen ninguna escala validada y **no tienen propiedades psicométricas**. No pueden presentarse como instrumento validado.
- Un cuestionario `licenciado` solo es válido con titular y autorización documentada.
- Una guarda léxica rechaza en los ejemplos nombres de escalas conocidas. **Es una heurística:** no detecta una escala reproducida sin su nombre. La garantía real es la revisión de contenido del comité y la decisión sobre instrumentos (A19).

---

## 9. Los tres ejemplos

| Cuestionario | Para qué | Escalados |
|---|---|---|
| `seguimiento-entre-consultas` | Dificultades y molestias referidas entre dos consultas en TAR oral | Dificultad referida y molestia referida → `PR-REVISION-FARMACIA`; barrera de acceso → `PR-ACCESO`; pide contacto → `PR-CONTACTO` |
| `citas-tar-accion-prolongada` | Comprobar, antes de la inyección, que la cita está confirmada y que podrá acudir (enlaza con `LA_TAR_CLINICAL_SPEC.md`) | Cita sin confirmar o no podrá acudir → `PR-CITA-LA`; pide contacto → `PR-CONTACTO` |
| `tolerabilidad-tras-cambio-tar` | Molestias en las primeras semanas tras un cambio de tratamiento | Molestias que preocupan o que dificultan la toma → `PR-REVISION-FARMACIA`; pide contacto → `PR-CONTACTO` |

El segundo **no menciona la ventana de administración ni el puente oral** al paciente: son decisiones clínicas pendientes de A13. Solo pregunta por la cita.

---

## 10. Qué no se define aquí

| Tema | Dónde se decide |
|---|---|
| Cuándo y con qué frecuencia se envía; recordatorios; límite de contactos | Automatización N2 (B12); D-Q06 |
| Canal (web autenticado, SMS institucional, voz de tercero) y su confidencialidad | ADR-7; C03 y C08. El VIH exige especial cuidado con lo que revela un mensaje en un canal inseguro (R09) |
| Consentimiento e información al paciente | C08 |
| Lenguaje claro, idiomas, accesibilidad y comprensión | C07, A18 |
| Instrumentos validados y sus licencias | A19 |
| Tareas, acuses y bandejas de los profesionales | B11 |
| Retención de las respuestas | EIPD (C03); D-Q11 |
| Cómo se presenta el cuestionario en pantalla | B12 |

---

## 11. Decisiones abiertas para el comité

| ID | Decisión | Propuesta provisional (no aprobada) |
|---|---|---|
| D-Q01 | Responsable, plazo y prioridad de los 4 protocolos | Sin proponer valores |
| D-Q02 | Textos de `AVISO-NO-URGENTE` y `CIERRE-GENERICO`; participación de pacientes | Los de §6.3 como punto de partida |
| D-Q03 | ¿Es obligatoria la vía «solicita contacto» en todo cuestionario? | Sí |
| D-Q04 | Canales permitidos por cuestionario según la sensibilidad del contenido | Web autenticado y entrevista profesional primero |
| D-Q05 | ¿Se permiten preguntas no obligatorias? | Los ejemplos son todos obligatorios |
| D-Q06 | Frecuencia máxima de contacto por paciente (anti-fatiga) | Definir en N2 |
| D-Q07 | Qué ocurre con un cuestionario abandonado a medias | No inferir nada de un abandono |
| D-Q08 | Versionado: una respuesta se refiere siempre a (`id`, `version`) | Sí |
| D-Q09 | Lenguaje, nivel de lectura e idiomas; validación de la comprensión con pacientes | Prueba de usabilidad (C07) |
| D-Q10 | Aplicación por entrevista profesional: identificación del actor y de la función | `entrevista_profesional`, actor con su función |
| D-Q11 | Retención de las respuestas y de su vínculo con la historia | En la EIPD |

---

## 12. Revisión y aprobación

| Revisor | Función | Fecha | Esquema y ejemplos (conforme / con cambios / rechazado) | D-Q resueltas | Observaciones | Firma |
|---|---|---|---|---|---|---|
| `[DATO PENDIENTE]` | | | | | | |
| `[DATO PENDIENTE]` | | | | | | |

Aprobación del comité: `[DATO PENDIENTE]` · Acta: `[DATO PENDIENTE]`. Debe participar un representante de pacientes en D-Q02 y D-Q09.

---

## 13. Riesgos y límites

- **R39 — Un problema grave comunicado por cuestionario no se revisa a tiempo** (falsa sensación de cobertura asistencial). Es el riesgo principal; su control real es el protocolo con plazo aprobado, el aviso y la formación, no el esquema.
- **R40 — Sobrecontacto del paciente y escalados innecesarios** que generen fatiga de alertas.
- **R41 — Contenido de terceros sin autorización.** La guarda léxica es heurística.
- **Sin evidencia de utilidad.** No hay datos de que estos cuestionarios mejoren resultados ni de que los pacientes los entiendan: son una hipótesis que evalúa `VALIDATION_MASTER_PLAN.md`.
- **Sin propiedades de medida.** Preguntas de diseño propio no son un instrumento validado: sus respuestas son declaraciones, no mediciones.
- **Validación en cliente.** Como el resto de esquemas, un servidor debe volver a validar y ejecutar el cuestionario.
