# TARGET_ARCHITECTURE_V2 — Arquitectura objetivo de VIHconectados 2.0

| | |
|---|---|
| Estado | **PROPUESTA PARA REVISIÓN** (no implementada) · 2026-11-25 |
| Entrada | `CURRENT_STATE_AUDIT.md` (hallazgos F-xx) |
| Restricciones heredadas | Sin APIs externas de pago; sin dependencias innecesarias; sin datos reales hasta autorización; sin declarar cumplimiento sin evidencias |

> Esta es una arquitectura de **destino y trayectoria**. Cada decisión abierta se lista como ADR con opciones y recomendación; ninguna está aprobada.

---

## 1. Principios de diseño (derivados de la evidencia)

| # | Principio | Origen en el estado actual |
|---|---|---|
| P1 | **El dominio clínico es un paquete determinista, sin E/S y compartido** entre cliente y servidor | F-01: `motor`, `temporal`, `dispensaciones`, `senales`, `consulta`, `adherencia` ya son casi puros |
| P2 | **Todo cambio entra por comandos validados en servidor** con lista blanca de tipos y rechazo por defecto | F-12: cinco tipos aceptados sin validar |
| P3 | **Solo-anexar con corrección explícita y actor en cada evento**; reloj, UUID e idempotencia en servidor | F-13, F-14, F-09 |
| P4 | **Bitemporal**: fecha efectiva (clínica) y fecha de conocimiento (servidor) | F-15 (`fecha` vs `registrado`) |
| P5 | **Toda regla clínica es dato versionado con estado de validación** y se cita en cada señal | F-07, F-19 |
| P6 | **Separación en tres niveles**: clínico determinista · automatización · IA generativa asistiva (nunca decide) | F-29 |
| P7 | **El canal con el paciente es un adaptador sustituible** | `COMPETITIVE_GAP_ANALYSIS.md` H2 |
| P8 | **Interoperabilidad por mapeo, no por reescritura**: el modelo canónico interno se proyecta a FHIR | F-28 |
| P9 | **Sin sorpresas de coste**: componentes abiertos y autoalojables; sin SaaS de pago en la ruta crítica | Restricción del encargo |
| P10 | **Honestidad de producto**: el sistema muestra qué *no* sabe (PDC nulo ≠ 0; episodio inyectable *no monitorizado*) | F-11, `motor.js` |

---

## 2. Visión de componentes

```mermaid
flowchart TB
  subgraph Cliente["Cliente web (SPA existente, evolucionada)"]
    UI[Vistas por rol: Farmacia / Infecciosas / Enfermería / Gestor]
    DOM_PKG[[Paquete de dominio compartido\n(validación local, previsualización)]]
  end

  subgraph Servidor["Servidor institucional (monolito modular)"]
    API[API de comandos y consultas\nOIDC + RBAC + hospital_id]
    CMD[Validador de comandos\nesquema cerrado por tipo]
    DOM[[Paquete de dominio\n(PDC, LA-TAR, señales, CMO)]]
    REG[Registro de reglas versionadas\n(estado de validación)]
    EVT[(Almacén de eventos\nsolo-anexar + correcciones)]
    PRJ[Proyecciones / lecturas\n(cohorte, bandeja, informes)]
    AUD[(Auditoría protegida)]
    TSK[Tareas y coordinación\n(asignación, acuse, plazos)]
    QST[Motor de cuestionarios declarativos]
    TRI[Motor de evidencia y triangulación]
    OUT[Outbox / planificador]
  end

  subgraph Integracion["Capa de integración (adaptadores)"]
    ING[Ingesta: CSV / HL7 v2 / FHIR\nfarmacia, laboratorio, citas]
    FHIR[Fachada FHIR\n(proyección de lectura/escritura)]
    CHN[Adaptadores de canal\n(web, SMS institucional, voz de terceros)]
  end

  subgraph IA["Nivel 3 — IA generativa asistiva (opcional, aislada)"]
    LLM[Redacción/resumen/transcripción\nsolo con revisión humana]
  end

  UI --> API
  DOM_PKG -.misma lógica.-> DOM
  API --> CMD --> DOM
  CMD --> EVT
  EVT --> PRJ
  EVT --> AUD
  REG --> DOM
  DOM --> TRI
  TRI --> TSK
  QST --> OUT --> CHN
  ING --> CMD
  FHIR <--> PRJ
  PRJ --> LLM
  LLM -. sugerencia, nunca comando directo .-> UI
```

**Reglas de frontera clave:**
- El nivel 3 (IA) **solo lee proyecciones** y **solo devuelve texto sugerido a la interfaz**; no emite comandos ni modifica reglas, señales ni niveles (véase §4).
- Los adaptadores de canal no contienen lógica clínica: reciben una orden («enviar cuestionario Q a paciente P por canal C») y devuelven respuestas como **eventos de entrada** validados por el mismo `CMD`.

---

## 3. Modelo de eventos V2 (sobre el modelo actual)

El modelo actual (`vihconectados/demo@1`) se conserva como **compatible hacia atrás** y se migra a un sobre común:

```text
Evento = {
  id,                       // UUID asignado por servidor
  tipo, version_esquema,    // lista blanca; JSON Schema por tipo
  hospital_id, paciente_id, // aislamiento obligatorio
  fecha_efectiva,           // hecho clínico (equivale a `fecha` actual)
  registrado_en,            // reloj de servidor (hoy: `registrado` de cliente)
  actor: { usuario_id, pertenencia_id, funcion },   // NUEVO (F-14)
  procedencia: { sistema_origen, id_origen, lote_id, huella, metodo_captura }, // generaliza origen/id_origen/huella
  confianza: { nivel, motivo },            // NUEVO: calidad de la evidencia
  corrige: { evento_id, motivo } | null,   // generaliza correccion_dispensacion (F-09)
  cuerpo: { ... }           // específico del tipo
}
```

**Compatibilidad:** los campos actuales (`id`, `tipo`, `fecha`, `registrado`, `origen`, `id_origen`, `huella`) tienen correspondencia directa; los eventos antiguos se migran con `actor = null` y `confianza = "heredada"` (nunca se inventa un actor).

**Qué se corrige respecto al estado actual:** esquema cerrado por tipo (F-12), actor (F-14), corrección general (F-09), reloj de servidor (F-13).

### 3.1 Nuevos tipos de evento (candidatos)

| Tipo | Propósito | Requisito previo |
|---|---|---|
| `administracion_la` | Administración (o falta) de TAR de acción prolongada con fecha, intervalo previsto y tipo de fase | Especificación clínica LA-TAR validada (backlog A13) |
| `evento_necesidad_suministro` | Ingreso, suspensión, viaje, receta externa que cambian la necesidad de suministro | Definición clínica |
| `observacion_laboratorio` | Carga viral, CD4, etc., con fecha de muestra y fuente | Fuente de laboratorio y FHIR `Observation` |
| `respuesta_cuestionario` | Respuesta de un paciente/profesional a un cuestionario versionado | Motor de cuestionarios |
| `evaluacion_cmo` | Valoración de Capacidad, Motivación y Oportunidad por separado, con instrumento/rejilla | Rejilla CMO aprobada `[DATO PENDIENTE]` |
| `tarea` / `acuse` | Asignación y acuse entre Farmacia, Infecciosas y Enfermería | Matriz de permisos aprobada |
| `consentimiento` | Consentimiento/ejercicio de derechos para seguimiento remoto | Marco jurídico (EIPD) |

---

## 4. Separación: lógica clínica · automatización · IA generativa

| Nivel | Qué contiene | Reglas obligatorias | Quién puede cambiarlo |
|---|---|---|---|
| **N1 — Lógica clínica determinista** | PDC, ventanas LA-TAR, reglas de señal, criterios CMO, umbrales | Versionada como dato; estado de validación; pruebas contra corpus dorado; explicable con numerador/denominador; **ningún componente probabilístico** | Comité clínico (`CLINICAL_GOVERNANCE.md`); cambio con control de versiones y registro |
| **N2 — Automatización** | Planificación de cuestionarios, recordatorios, creación de tareas, enrutado, escalado según N1 | Reglas declarativas y deterministas; idempotentes; parametrizadas por centro; límites de frecuencia anti-fatiga; todo envío auditado | Equipo técnico + aprobación clínica de plantillas |
| **N3 — IA generativa asistiva** | Redacción de borradores, resumen de historial, transcripción de voz, reformulación de lenguaje claro | **No decide, no prioriza, no modifica N1/N2, no escribe en el registro clínico sin confirmación humana explícita**; registro de entradas/salidas; evaluación de alucinación; sin datos identificativos hacia APIs externas; preferencia por modelos autoalojados | Comité clínico + responsable de seguridad; fuera de la ruta crítica |

**Controles técnicos propuestos** (verificables por pruebas):
1. Arquitectura: el módulo N3 no tiene permiso de escritura sobre el almacén de eventos; solo un endpoint de «sugerencia» que devuelve texto.
2. Prueba de dependencia: ninguna ruta de código del cálculo N1 importa N3 (análisis estático).
3. Cada salida N3 mostrada al usuario lleva etiqueta de origen («borrador generado automáticamente, requiere revisión»).
4. Las exportaciones y los informes **no** incluyen texto N3 salvo que el profesional lo haya aceptado explícitamente (evento con actor).

**Estado actual:** F-29 — hoy ninguna parte del código usa IA; el objetivo es **conservar esa propiedad por diseño** al añadir canales.

---

## 5. Módulos de dominio nuevos o ampliados

### 5.1 PDC multicomponente (existente) — evolución
- Conserva `cobertura()` (`motor.js:142-208`) como implementación de referencia.
- Parámetros y umbral → **registro de reglas** (`datos/reglas/*.json` versionado, con `fuente`, `estado_validacion`, `aprobado_por`, `vigente_desde`).
- Añade «eventos de necesidad de suministro» para evitar falsos positivos (F-08).
- Añade procedencia y confianza por dispensación.

### 5.2 Módulo LA-TAR (nuevo, requiere especificación clínica previa)
Contenido provisional, **sin valores numéricos** hasta validación con la ficha técnica y guías vigentes `[REQUIERE REFERENCIA]`:
- Fases: oral previa (opcional), inicio/carga, mantenimiento, reinicio tras retraso.
- Cálculo de **próxima administración debida**, **ventana de tolerancia**, **retraso** (días) y **estado**: al día / en ventana / retrasado / no monitorizado.
- Estado `no_monitorizado` explícito (corrige F-11).
- Señales propias, con prioridad definida por el comité clínico.
- Entradas: administraciones registradas por Enfermería/Farmacia, citas programadas/no asistidas.

### 5.3 Motor de evidencia y triangulación (nuevo)
Cada fuente produce **afirmaciones** (observaciones) con `fuente`, `fecha_efectiva`, `procedencia`, `confianza`. Reglas declarativas combinan fuentes (concordancia/discordancia):

| Fuente | Naturaleza | Estado hoy |
|---|---|---|
| Dispensación hospitalaria | Objetiva, pasiva (disponibilidad) | Implementada (PDC) |
| Dispensación externa / receta | Objetiva, a veces incompleta | Pendiente |
| Autoinforme / cuestionario | Subjetiva, declarada | Parcial (visita categórica; valoración manual) |
| Analítica (CV, CD4…) | Objetiva, retardada, no causal de adherencia | Pendiente |
| Asistencia a citas | Objetiva | Pendiente |
| Ingresos / urgencias | Objetiva, contexto | Pendiente |
| Entrevista clínica CMO | Profesional | Parcial |

La triangulación **no infiere adherencia ni causalidad**; produce *hipótesis explicables* para revisión profesional (principio ya presente en el repositorio).

### 5.4 Motor de cuestionarios declarativos (nuevo)
- Cuestionario = JSON versionado: ítems, tipos de respuesta cerrados, ramificación, reglas de puntuación **solo si hay instrumento aprobado**, reglas de escalado.
- Ejecución determinista; no usa IA para decidir la siguiente pregunta (N2).
- Cada respuesta produce un evento `respuesta_cuestionario` con procedencia de canal.
- Instrumentos con derechos (p. ej. escalas con licencia) requieren autorización; no se incluyen sin ella (alineado con `PILOTO.md`: «No se reproduce una escala PAM»).

### 5.5 CMO por dimensiones (ampliación)
Registrar `evaluacion_cmo` con C, M y O por separado y su fuente, conservando el nivel agregado como **vista derivada o decisión profesional explícita**, nunca valor por defecto (corrige F-16, F-23). Las reglas de estratificación solo se codifican si el usuario aporta rejilla vigente.

### 5.6 Coordinación (tareas y acuses)
Evolución de `estado_comunicacion` (simulado) a **tareas con asignación a función o persona, acuse real y plazos**; un cambio de estado solo ocurre por acuse de un actor con permiso (`ACCESO_HOSPITALARIO.md`: «necesitará un acuse real»). Incluye el rol **Enfermería** (hoy ausente, F-26).

---

## 6. Seguridad, aislamiento y recuperación

| Control | Diseño | Verificación |
|---|---|---|
| Identidad | OIDC/SAML institucional (SSO) preferente; si no, credenciales individuales con hash adecuado, MFA según análisis de riesgos | Pruebas de aceptación 2 y 4 de `ACCESO_HOSPITALARIO.md` |
| Autorización | RBAC + pertenencia usuario–hospital + permiso sobre el caso; denegación por defecto; nunca confiar en `hospital_id` del cliente | Prueba 1 (A no ve B), incluidas referencias anidadas y descargas |
| Aislamiento de datos | `hospital_id` obligatorio, claves compuestas, políticas a nivel de base de datos (p. ej. RLS) además de filtros de aplicación | Pruebas automatizadas de aislamiento en CI |
| Auditoría | Registro append-only separado de los eventos clínicos; lectura y escritura; inmutabilidad verificable (cadena de hashes opcional) | Pruebas de manipulación |
| Cifrado y claves | TLS; cifrado en reposo; claves institucionales | Revisión independiente `[DATO PENDIENTE]` |
| Copia y recuperación | RPO/RTO definidos por el centro `[DATO PENDIENTE]`; restauración probada periódicamente | Ensayo documentado |
| Datos de prueba | Entornos separados; datos sintéticos o seudonimizados con autorización | Política y EIPD |
| Entradas libres | Longitudes máximas existentes + política de minimización y detección | EIPD |

---

## 7. Decisiones de arquitectura abiertas (ADR)

| ADR | Pregunta | Opciones | Recomendación provisional | Qué la confirmaría o cambiaría |
|---|---|---|---|---|
| ADR-1 | Lenguaje/stack del servidor | (a) Node.js 22 reutilizando módulos ES existentes; (b) otro lenguaje con reescritura del dominio | **(a)**: máxima reutilización del dominio probado (F-01), cero licencias | Estándares TI del hospital `[DATO PENDIENTE]` |
| ADR-2 | Persistencia | (a) PostgreSQL con tabla de eventos + RLS; (b) almacén documental | **(a)**: abierto, probado, RLS nativo, sin coste | Plataforma del centro |
| ADR-3 | Despliegue | (a) infraestructura del hospital; (b) cloud contratado por la institución | **(a)/(b) institucional**; **no** SaaS de un tercero de pago bajo la responsabilidad del proyecto | Política de protección de datos y ENS |
| ADR-4 | Identidad | (a) OIDC del hospital; (b) SAML; (c) proveedor propio | **(a)/(b)** | Capacidades de TI del centro |
| ADR-5 | Estructura | (a) monolito modular; (b) microservicios | **(a)**: equipo reducido, menos superficie operativa | Escala real |
| ADR-6 | Cliente | (a) mantener JS sin build; (b) introducir build/TypeScript | **(a) a corto plazo**; reevaluar al refactorizar `app.js` (705 líneas) | Tamaño del equipo y mantenibilidad |
| ADR-7 | Canal de contacto | (a) cuestionario web autenticado; (b) SMS institucional; (c) voz de tercero | **(a) primero** (sin coste y menor riesgo), (b)/(c) como adaptadores tras EIPD y consentimiento | Requisitos regulatorios del canal |
| ADR-8 | IA generativa | (a) ausente; (b) autoalojada, solo asistiva | **(a) hasta nuevo aviso**; (b) solo con política N3 aprobada | Valor demostrado y evaluación de riesgos |
| ADR-9 | FHIR | (a) fachada de lectura; (b) lectura/escritura; (c) solo CSV | **(a)** tras mapeo y validación local, **(c)** como vía mínima | Interfaces reales del centro |
| ADR-10 | Esquema | (a) JSON Schema por tipo + versionado; (b) sin esquema | **(a)** | — |

---

## 8. Marco de reutilización de componentes (ítem 14)

**D.** Solo hay evidencia en el repositorio de `preparadorconsulta` (`42402cb`), `cmo-vih-app` (`c963da9`) y MAPEX-ADHEFAR Hub (`8750436e`, solo enlazado). **No hay evidencia alguna de HIV Prescribing Cascade Auditor, CambiosTAR ni RXplain.** No se asume su estado, licencia ni calidad.

**Marco propuesto para decidir caso a caso** (a completar cuando el usuario aporte los datos):

| Criterio | Pregunta | Si «no/desconocido» |
|---|---|---|
| Titularidad | ¿Quién ostenta los derechos y bajo qué licencia o acuerdo? (el autor puede no ser el único titular si hubo financiación/contrato institucional) | No reutilizar código; solo ideas documentadas |
| Atribución | ¿Se mantendrá la autoría original? (exigencia ya expresada en `legal.js`) | Bloquea |
| Compatibilidad técnica | ¿Dominio puro/ES modules sin dependencias? | Reescribir con especificación |
| Madurez clínica | ¿Hay validación o uso asistencial documentado? | Tratar como prototipo; no hereda confianza |
| Riesgo regulatorio | ¿Cambia la finalidad prevista del conjunto? (p. ej. un auditor de cascada de prescripción o de cambios de TAR es soporte a la decisión terapéutica) | Evaluar con asesoría antes de integrar |

**Hipótesis de encaje (a confirmar; NO es una auditoría de esos proyectos):**
- *CambiosTAR* y *HIV Prescribing Cascade Auditor*: por su nombre, apuntan a reglas sobre prescripción/cambios de régimen → serían **N1 (lógica clínica)** y por tanto exigirían gobernanza de reglas y reevaluación de finalidad prevista; podrían alimentar episodios TAR y eventos de cambio.
- *RXplain*: por su nombre, explicabilidad/educación farmacéutica `[NO VERIFICADO]`; podría servir como contenido de N3 o de hoja de paciente solo si es de lectura/borrador con revisión.
- *MAPEX-ADHEFAR Hub*: hoy solo enlazado (`recursos.js`); su integración como contenido (cuestionarios, materiales) requiere el permiso expreso y atribución (`legal.js`).

Para pasar de hipótesis a plan: el usuario debe indicar **repositorio, licencia, titularidad y estado de cada uno** (CURRENT_STATE_AUDIT §6).

---

## 9. Trayectoria de migración (estrangulador, sin eliminar funcionalidad)

1. **Fase A — Preparar:** extraer dominio puro (`packages/dominio`) desde `src/` conservando rutas y comportamiento; definir JSON Schema por evento; introducir versión de esquema y migraciones; corpus dorado; registro de reglas.
2. **Fase B — Puerto de comandos:** sustituir `RepositorioDemo.leer/guardar` por un puerto **de comandos**; implementar un adaptador `localStorage` (demo) y uno de servidor. La demo seguirá funcionando sin servidor.
3. **Fase C — Backend mínimo en staging** con datos sintéticos: OIDC de prueba, RBAC, aislamiento, auditoría; suite de aislamiento.
4. **Fase D — Entradas reales controladas:** ingesta por CSV/FHIR con seudonimización, solo tras EIPD y autorización.
5. **Fase E — Seguimiento activo:** cuestionarios N2 + canal institucional.

**Garantías:** no se elimina ninguna funcionalidad actual; el modo demostración persiste como ruta sin backend con el mismo dominio.

---

## 10. Fuera de alcance de esta arquitectura

Prescripción, cambio de tratamiento automático, diagnóstico, uso de datos reales sin autorización, envío masivo sin consentimiento, cualquier claim regulatorio o de validación.
