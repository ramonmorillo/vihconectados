# COMPETITIVE_GAP_ANALYSIS — Brecha frente a TUCUVI/LOLA y posicionamiento propio

| | |
|---|---|
| Estado | **BORRADOR PARA REVISIÓN** · 2026-11-25 |
| Base interna | `CURRENT_STATE_AUDIT.md` (commit `1208ef4`) |
| Calidad de la evidencia externa | **Baja–media**: una búsqueda web general; fuentes mayoritariamente del propio proveedor o de agregadores. **No se ha accedido a documentación técnica, ficha de producto ni a EUDAMED.** Todo dato del competidor está marcado `[AUTOINFORMADO]` o `[NO VERIFICADO]` |

> Este análisis no pretende copiar a TUCUVI/LOLA. Su objetivo es identificar qué capacidades son *condición de entrada* para un seguimiento activo creíble, cuáles son *diferenciales propios* y cuáles *no conviene perseguir*.

---

## 1. Qué se sabe del competidor (datos objetivos, con límites)

Resultados de búsqueda pública del 2026-11-25 (fuentes enlazadas abajo). Todo lo siguiente es **autoinformado por el proveedor o terceros que reproducen su comunicación**; no hay estudios de resultados independientes en lo recuperado:

| Dimensión | Lo que se afirma públicamente | Fiabilidad |
|---|---|---|
| Función central | Agente de voz con IA que realiza llamadas salientes para seguimiento, cribado y gestión de citas; recoge síntomas, comprueba evolución y adherencia al tratamiento | `[AUTOINFORMADO]` |
| Protocolos | Protocolos clínicos configurables por profesionales mediante herramienta de configuración; cifras divergentes entre fuentes (≈12 protocolos en una ficha pública; «50+ flujos» en otra) | `[AUTOINFORMADO]`, incoherente entre fuentes |
| Escalado | Derivación de casos de alto riesgo a equipos humanos | `[AUTOINFORMADO]` |
| Integración | Un caso de estudio describe integración con la historia clínica del hospital «mediante API» | `[AUTOINFORMADO]` (caso de cliente) |
| Estatus regulatorio | El proveedor afirma ser la primera plataforma de IA con aprobación regulatoria europea como Software como Producto Sanitario de clase IIb | `[AUTOINFORMADO]`; **no verificado en EUDAMED ni en el certificado del organismo notificado** |
| Escala | «1 M+ pacientes», «60+ organizaciones» en un perfil; «+50 000 horas de conversación» en otra ficha | cifras divergentes; `[AUTOINFORMADO]` |
| Especificidad VIH / CMO | **No se encontró** evidencia de despliegue en VIH ni de uso del modelo CMO | ausencia de hallazgo ≠ ausencia de capacidad |
| Resultados clínicos | **No se encontraron** estudios independientes de resultados | — |

**I.** Hay que asumir que el competidor tiene, como mínimo: canal de voz operativo, motor de protocolos configurable, escalado a humanos, integración con HCE en al menos algunos centros y una vía regulatoria declarada. Eso es un nivel de madurez que vihconectados no tiene en ningún eje operativo.

**Fuentes** (consultadas por búsqueda; no verificadas independientemente):
- Tech.eu — [Clinical voice AI startup Tucuvi raises $20M](https://tech.eu/2026/01/08/clinical-voice-ai-startup-tucuvi-raises-20m/)
- CORDIS — [ficha de proyecto UE](https://cordis.europa.eu/project/id/190184468)
- Aviahealth Marketplace — [LOLA AI voice-based virtual clinical assistant](https://marketplace.aviahealth.com/product/66998/lola-ai-voice-based-virtual-clinical-assistant-for-automated-patient-follow-up)
- Future Medicine — [Conversational AI for medical phone consultations](https://production.futuremedicine.com/articles/conversational-ai-for-medical-phone-consultations)
- CB Insights — [perfil de empresa](https://www.cbinsights.com/company/tucuvi)
- Caso de estudio de cliente (post-infiltración, integración API) y caso de cribado de cáncer de colon, ambos alojados en `cdn.featuredcustomers.com`.
- Evidencia genérica (no sobre LOLA): Cochrane, intervenciones telefónicas en VIH — [resumen en español](https://cochrane.org/es/CD009189/HIV_intervenciones-telefonicas-para-disminuir-la-morbilidad-y-la-mortalidad-en-pacientes-con-infeccion). Indica que *puede* haber mejoría en adherencia y que se necesitan más estudios; **no** avala un producto concreto.

**Acciones de verificación recomendadas (no realizadas):** consultar EUDAMED/certificados, solicitar documentación técnica y referencias a proveedor o a colegas con despliegues, revisar si existen publicaciones con revisión por pares sobre LOLA `[REQUIERE REFERENCIA]`.

---

## 2. Matriz de brecha (vihconectados 0.3.0 vs. capacidad de referencia)

Escala de brecha: **0** sin brecha, **1** menor, **2** moderada, **3** grande, **4** inexistente. «Referencia» = capacidad que una solución de seguimiento activo debería tener para ser creíble; no implica que TUCUVI/LOLA la tenga plenamente.

| Capacidad | Referencia | vihconectados hoy (evidencia) | Brecha | ¿Ventaja potencial propia? |
|---|---|---|:-:|---|
| Contacto activo con el paciente (voz/mensajería) | Canal saliente operativo con consentimiento | Ninguno; «seguimiento telefónico simulado» es solo una opción (`motor.js:37-41`) | 4 | No: no perseguir voz propia en fase inicial |
| Guion/protocolo configurable por clínicos | Editor de protocolos con ramificación | Visita con 5 listas cerradas (`motor.js:16-42`); guion MAPEX estático (`datos/guia-vih.json`) | 4 | Parcial: motor declarativo + guion CMO atribuido |
| Escalado a humano con SLA | Reglas, destinatarios, acuse, plazos | Estados simulados, sin acuse (`motor.js:43-49`) | 4 | Parcial |
| Integración con HCE/farmacia | API/FHIR/HL7 operativa | Ninguna (`PILOTO.md`) | 4 | No inicialmente |
| Autenticación, multicentro, auditoría | Obligatorias para uso real | Ninguna (`acceso.js`, diseño en `ACCESO_HOSPITALARIO.md`) | 4 | — (condición de entrada) |
| Estatus regulatorio | Vía MDR definida | Sin finalidad prevista formal (`F-30`) | 4 | **Posible**: in-house de centro (véase `REGULATORY_READINESS.md` §4) |
| Evidencia clínica | Publicaciones/estudios | Sin validación clínica (`PILOTO.md`) | 4 | **Sí**, si se diseña un piloto riguroso desde el inicio |
| Medición objetiva de **cobertura de dispensación** | Pocas soluciones de voz la integran | PDC por episodio/componente, correcciones, conciliación (`motor.js`, `dispensaciones.js`) | 1 | **Sí — diferencial real** |
| **Triangulación** dispensación + autoinforme + analítica + citas | Poco frecuente en agentes de voz | Solo dispensación + experiencia categórica; sin analíticas | 3 | **Sí — diferencial potencial** |
| **Modelo CMO** (estratificación, intervención diferenciada) | Específico de farmacia hospitalaria española | Nivel 1–3 manual; plan–seguimiento implementado (`consulta.js`) | 2–3 | **Sí — diferencial conceptual**, condicionado a validar CMO en VIH |
| TAR de acción prolongada | Ventanas, retrasos, recordatorios | Excluido del PDC y silencioso (F-11) | 4 | **Sí**, si se resuelve con rigor clínico |
| Trazabilidad por eventos y corrección | Auditoría completa | Solo-anexar, corrección de dispensaciones, informes congelados (`confianza.test.mjs`) | 1–2 (local) / 4 (institucional) | **Sí**, como base de confianza |
| Experiencia del paciente (PROM/PREM) | Instrumentos validados | Listas categóricas propias (`motor.js:16-42`) | 3 | Parcial (MAPEX-ADHEFAR) |
| Transparencia y gobernanza del algoritmo | Reglas visibles y versionadas | Texto explicable, versión de regla; sin validación (`alertas`) | 2 | **Sí**: «caja de cristal» vs. agente conversacional |

**I (lectura):** la brecha en *canales y escala operativa* es total y **no es un lugar donde competir en 12–18 meses**. En cambio, hay tres zonas donde una propuesta de farmacia hospitalaria puede ser genuinamente distinta: (1) medición de cobertura de dispensación como columna vertebral, (2) estratificación e intervención CMO con ciclo objetivo–reevaluación, (3) transparencia/explicabilidad de reglas por encima de la «conversación».

---

## 3. Posicionamiento propuesto (hipótesis para validar, no conclusión)

**H1.** El valor de VIHconectados 2.0 no está en «llamar mejor» sino en **decidir a quién y por qué contactar, con qué evidencia y con qué objetivo CMO**, usando fuentes que un agente de voz puro no tiene (dispensación hospitalaria, plan CMO, histórico).

**H2.** El canal conversacional debe tratarse como **un adaptador sustituible** (voz de tercero, SMS institucional, cuestionario web, llamada humana asistida), nunca como el producto. Esto además desacopla el riesgo regulatorio y de coste.

**H3.** Un diferencial defendible es la **explicabilidad por regla versionada con validación publicada**: cada señal enlaza a su regla, versión, evidencia y estado de validación.

**Riesgos de esta hipótesis (honestos):**
- H1 depende de que el centro pueda *proporcionar* dispensaciones fiables (calidad de datos, farmacia externa, receta electrónica) `[DATO PENDIENTE]`.
- H2 puede subestimar que la calidad de la interacción conversacional sea lo que pide el clínico. Falta evidencia de preferencias del usuario final `[DATO PENDIENTE: entrevistas]`.
- H3 solo es diferencial si la validación se realiza y se comunica; si no, es solo una promesa.
- El modelo CMO no tiene datos de validación en VIH en este repositorio (F-23): presentar «estratificación CMO» como ventaja sin evidencia sería sobreventa.

---

## 4. Qué no perseguir (y por qué)

| Tentación | Motivo para no hacerlo ahora |
|---|---|
| Construir un agente de voz propio | Coste y riesgo regulatorio altos; la restricción del proyecto excluye APIs externas de pago; sin canal institucional ni consentimiento definidos |
| «Igualar» el número de protocolos | Cantidad no es validez; priorizar 3–5 flujos VIH completamente gobernados |
| Usar IA generativa para decidir o priorizar | Reduce trazabilidad; ver política de tres niveles en `TARGET_ARCHITECTURE_V2.md` §4 |
| Anunciar «marcado CE» o «validado» | Sin evidencia; contravendría las restricciones de este encargo y de `legal.js` |

---

## 5. Hoja de ruta de cierre de brecha (alto nivel)

| Horizonte | Objetivo | Brecha que cierra |
|---|---|---|
| Fundamentos (0–3 meses) | Finalidad prevista, reglas versionadas, corpus dorado, LA-TAR especificado | Evidencia, regulatorio, F-11 |
| Plataforma (3–9 meses) | Backend multicentro mínimo + dominio compartido + esquema de eventos con actor | Autenticación, multicentro, auditoría |
| Datos (6–12 meses) | Ingesta de dispensaciones/analíticas con procedencia; motor de triangulación | Triangulación |
| Seguimiento activo (9–18 meses) | Cuestionarios declarativos + canal institucional + escalado | Contacto activo, protocolos |
| Evidencia (continuo) | Validación por fases (silenciosa → sombra → piloto) | Evidencia clínica |

Detalle y puertas de decisión en `PRODUCT_ROADMAP.md`. Las duraciones son **estimaciones de orden de magnitud** `[DATO PENDIENTE: equipo y financiación disponibles]`.

---

## 6. Datos que cambiarían estas conclusiones

1. Resultados de una verificación real del producto/estatus de TUCUVI/LOLA (documentación, EUDAMED, referencias).
2. Preferencia de los clínicos del centro piloto entre «agente conversacional» y «mejor priorización/trazabilidad».
3. Calidad y accesibilidad de los datos de dispensación del centro.
4. Evidencia de validación del modelo CMO en VIH (la que posea el equipo MAPEX).
