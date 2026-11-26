# RISK_REGISTER — Registro de riesgos preliminar

| | |
|---|---|
| Estado | **BORRADOR PRELIMINAR. No es un archivo de gestión de riesgos conforme a ISO 14971** · 2026-11-25 |
| Escenario de evaluación | Uso previsto **E2** (señales de apoyo al seguimiento con datos reales) y, donde se indica, **E3** (seguimiento activo). El estado actual (demo sintética) tiene riesgo clínico bajo porque no se usa con pacientes (`legal.js`) |
| Origen de las puntuaciones | **Juicio profesional provisional del auditor**, sin datos de frecuencia ni validación clínica. Deben recalibrarse con el CCR (`CLINICAL_GOVERNANCE.md`) y datos reales del piloto |

**Escalas (cualitativas, provisionales).** Probabilidad **P**: 1 remota · 2 baja · 3 posible · 4 probable · 5 muy probable. Severidad **S** (impacto en el paciente/organización): 1 despreciable · 2 menor · 3 moderada · 4 grave · 5 crítica. **Puntuación = P × S**: 1–5 bajo · 6–11 medio · 12–19 alto · 20–25 crítico.

Los controles «existentes» están respaldados por evidencia del repositorio; los «propuestos» remiten a `PRIORITIZED_BACKLOG.md`. **Un control propuesto no reduce el riesgo hasta implementarse y verificarse.**

---

## 1. Riesgos clínicos y de producto

| ID | Riesgo | Causa / evidencia | Consecuencia | P | S | Punt. | Controles existentes | Controles propuestos | Estado |
|---|---|---|---|:-:|:-:|:-:|---|---|---|
| R01 | **Paciente en TAR inyectable sin ninguna señal ante una administración perdida/retrasada** *(2026-11-25: A06 hace visible el episodio como «NO MONITORIZADO» y pendiente de revisión; **no** detecta administraciones perdidas, que exige A13/B08. A13 (borrador, sin aprobar) define el cálculo de ventana y omisión a partir de la ficha técnica. Puntuación a recalibrar por el CCR, no reducida aquí)* | `componentes()` → `[]` para inyectable; PDC `null`; señal `tar_inyectable_no_evaluable` es categoría `aviso` y no cuenta como pendiente (`motor.js:75-78,158-161`; `senales.js`; sondeo confirmado) | Fallo virológico y resistencias no anticipados; falsa tranquilidad | 5 | 5 | **25** | Aviso textual en informe y panel; exclusión explícita del PDC (`REGISTRO_MANUAL.md`) | A06 (estado «no monitorizado» visible), A13 (módulo LA-TAR), B08 | Abierto |
| R02 | **Falsa tranquilidad por PDC alto** (disponibilidad ≠ toma) | PDC mide dispensación; no hay biomarcadores ni autoinforme integrados | Se omite apoyo a un paciente que no toma | 4 | 4 | 16 | Textos «no demuestra toma» en alertas e informes (`motor.js`, `informes.js`) | Triangulación (A15, B09); no usar «adherencia» como etiqueta del PDC | Abierto |
| R03 | **Parámetros no validados generan falsos positivos/negativos** | Umbral 0,9 y ventana 180 d heredados; `REGLAS.validacion` pendiente | Fatiga de alertas o casos omitidos | 4 | 4 | 16 | Parámetros configurables y versionados en el informe; etiquetas de «demostrativo» | A03 (registro de reglas), A04 (corpus dorado), A20 (validación fase 0) | Abierto |
| R04 | **PDC bajo por causas no modeladas** (ingreso, suspensión, farmacia externa, stock inicial) | `docs/PILOTO.md`, `CONFIANZA_DATOS.md` | Falsos positivos; trabajo inútil; pérdida de confianza | 4 | 3 | 12 | Aviso «0 % = ausencia de cobertura registrada» | A15 (eventos de necesidad de suministro), B06 (ingesta) | Abierto |
| R05 | **Estratificación CMO incorrecta o infraespecificada** | Nivel 1–3 manual; sin dimensiones C/M/O; **nivel «3» por defecto** (`almacen.js:21`) | Intervención de baja intensidad a quien necesita más | 3 | 4 | 12 | La vista usa `nivelHasta` (null si no hay nivel); doc afirma no inferir nivel | A06 (retirar valor por defecto), A16 (CMO por dimensiones) | Abierto |
| R06 | **Contenido CMO erróneo o desactualizado** | Biblioteca acumulativa con discrepancia; anclas no cotejadas (`PILOTO.md`) | Intervenciones inadecuadas | 3 | 3 | 9 | Literalidad y metadatos de origen; selección profesional | Revisión por CCR; cotejo de fuentes | Abierto |
| R07 | **Sesgo de automatización** (el profesional sigue la señal sin juicio) | Textos de señal categóricos; sin priorización validada | Sobretratamiento o infratratamiento | 3 | 3 | 9 | «No acredita falta de toma»; gestión con motivo obligatorio | Formación; registro de discrepancias; niveles de autonomía L0–L3 (`CLINICAL_GOVERNANCE.md` §6) | Abierto |
| R08 | **Fatiga de alertas por falta de priorización y volumen** | Señales sin severidad (`CONSULTA_SEGUIMIENTO.md`) | Alertas ignoradas | 4 | 3 | 12 | Reapertura solo si cambia la evidencia; separación aviso/datos/asistencial | Priorización clínica aprobada (no por IA); métricas de carga | Abierto |
| R09 | **Mensaje al paciente equivocado, no recibido o malinterpretado** (E3) | Aún no existe canal; futuro riesgo | Revelación involuntaria de condición (estigma VIH); confusión | 3 | 5 | 15 | — (no existe canal) | Consentimiento y EIPD (C03, C08); plantillas aprobadas; canal web autenticado primero (B12) | Previsto |
| R10 | **Alucinación o error de IA generativa** (si se introduce) | N3 no existe hoy | Información clínica incorrecta al profesional/paciente | 3 | 4 | 12 | Ausencia de IA por diseño (F-29) | Política N3 (A21); separación arquitectónica; revisión humana obligatoria | Previsto |
| R11 | **Exclusión de pacientes con brecha digital** | Canal digital prioritario; dimensión *Oportunidad* del CMO | Inequidad en el seguimiento | 3 | 3 | 9 | — | Alternativas no digitales; participación de pacientes | Previsto |
| R12 | **Tratamiento de población excluida** (menores, embarazo, estudios clínicos, otros TAR) | Exclusiones no modeladas | Aplicación de reglas fuera de su dominio | 3 | 3 | 9 | Alcance «TAR oral/IM» y avisos | Ficha de regla con exclusiones (`CLINICAL_GOVERNANCE.md` §4) | Abierto |
| R36 | **Una discordancia entre fuentes se lee como «el paciente no toma» (juicio de valor, estigma, sesgo de automatización)** | Salida de triangulación (A15); solo hay hipótesis, pero se muestran en pantalla | Trato diferenciado, pérdida de confianza, decisiones clínicas sesgadas | 3 | 4 | 12 | Vocabulario cerrado y neutro; sin puntuación compuesta ni etiqueta de adherencia; invariantes léxicos comprobados por pruebas (`evidencia.test.mjs`); la salida no se muestra al paciente | Prueba de usabilidad (C07); formación; D-E10 | Previsto |
| R37 | **Circularidad: la valoración profesional (nivel CMO) se usa como fuente y después condiciona la triangulación** | Posible inclusión de `nivel_cmo` como dimensión | Refuerzo de la propia estratificación; sesgo de confirmación | 2 | 3 | 6 | `nivel_cmo` queda fuera de la matriz inicial (propuesta D-E07) | Decisión del comité; A16 | Previsto |
| R38 | **Eventos de contexto mal registrados (ingreso, suspensión) excluyen días y inflan el PDC** | Efecto `excluye_del_denominador` (A15); sin fuente fiable | PDC aparentemente alto por días no evaluables; falsa tranquilidad | 3 | 3 | 9 | Los eventos no se aplican en el motor actual; la propuesta exige mostrar siempre los días excluidos y su motivo | Confianza mínima y fuente exigida (D-E04); revisión por el comité | Previsto |
| R39 | **Un paciente comunica un problema grave por cuestionario y nadie lo revisa a tiempo** (falsa sensación de cobertura asistencial) | Canal de seguimiento activo (A14); protocolos de respuesta aún sin responsable ni plazo | Retraso en atender un problema importante | 3 | 5 | 15 | Aviso de no urgencia y cierre sin promesa de plazo (textos propuestos, sin aprobar); vía «solicita contacto» en los ejemplos; ningún cuestionario es activable sin protocolos aprobados (`esActivable`, comprobado por pruebas) | Aprobación de los protocolos con plazo (D-Q01); formación; prueba de usabilidad (C07); canal con revisión garantizada | Previsto |
| R40 | **Sobrecontacto del paciente y escalados innecesarios** (fatiga del paciente y de los profesionales) | Escalado automático por respuestas | Abandono del seguimiento; alertas ignoradas | 3 | 3 | 9 | Preguntas cerradas y breves (2–5 por camino en los ejemplos); cada regla de escalado debe dispararse en algún camino y no en todos (prueba) | Límite de frecuencia (D-Q06); métricas de carga en N2 | Previsto |
| R41 | **Instrumento con licencia o contenido de terceros incluido sin autorización** | Cuestionarios nuevos | Infracción de derechos; pérdida de credibilidad | 2 | 3 | 6 | Un instrumento licenciado exige titular y autorización (validación); guarda léxica de nombres de escalas (heurística) | Revisión de contenido por el comité; decisión de instrumentos (A19) | Previsto |

---

## 2. Riesgos de datos, integridad y seguridad

| ID | Riesgo | Causa / evidencia | Consecuencia | P | S | Punt. | Controles existentes | Controles propuestos | Estado |
|---|---|---|---|:-:|:-:|:-:|---|---|---|
| R13 | **Uso de datos reales en la demo** (localStorage sin cifrado ni control de acceso) | `RepositorioDemo` (`almacen.js:47-63`); `legal.js` lo desaconseja | Brecha de datos de VIH | 3 | 5 | 15 | Avisos legales; textos «solo sintéticos»; sin identificadores en CSV (rechazo de columnas ajenas); longitudes máximas | B01–B05 antes de cualquier dato real; revisión de avisos | Abierto |
| R14 | **Evento malformado envenena el cálculo del paciente** *(2026-11-25: A08 rechaza la entrada malformada y hace tolerante la lectura de la ya guardada; controles de cliente, no de servidor)* | `anexar` acepta `importacion` sin filas (`almacen.js:159-168`); `historialDispensaciones` → `TypeError` (sondeo confirmado) | Denegación de servicio por paciente; datos inaccesibles | 3 | 3 | 9 | Validación de otros tipos | A08 (esquemas cerrados y lista blanca) | Abierto |
| R15 | **Pérdida de datos** (borrado del navegador, cuota, sin copia) | `localStorage`; fallo de cuota documentado (`motor.test.mjs` «fallo de almacenamiento visible») | Pérdida de historial | 4 | 3 | 12 (demo) | Fallo visible; exportación manual | B05 (persistencia, copias, recuperación probada) | Abierto |
| R16 | **Manipulación deliberada del historial local** | Datos en el navegador editables (`PILOTO.md`) | Registros falsificados | 2 | 4 | 8 | Anexado solo-anexar en la interfaz (no es control de seguridad) | B04 (auditoría protegida), servidor autoritativo | Abierto |
| R17 | **Fuga entre hospitales** (futuro multicentro) | No existe aislamiento (`acceso.js`); diseño en `ACCESO_HOSPITALARIO.md` | Violación de confidencialidad entre centros | 2 | 5 | 10 | Diseño y pruebas de aceptación definidas (documento) | B02, B03; pruebas de aislamiento en CI; revisión independiente | Previsto |
| R18 | **Texto libre con datos personales** | `objetivo`, `observaciones`, `motivo`, `instrucciones` (`consulta.js`, `informes.js`) | Datos identificativos en registros y exportaciones | 4 | 3 | 12 | Límites de longitud y rótulo «sintético» | Política de texto libre y detección (A21, C03) | Abierto |
| R19 | **Exportaciones y informes con exceso de datos** | `informe()` incluye todos los eventos; `descargar({...db})` | Fuga y no minimización | 3 | 3 | 9 | Aviso de revisión previa a compartir | A09 (manifiesto y minimización) — implementado el modo mínimo y el manifiesto con hash; **falta decidir el modo predeterminado (D-G16)** y el informe almacenado sigue embebiendo todos los eventos | Parcialmente mitigado |
| R20 | **Procedencia temporal e identidad no fiables** | `id` y `registrado` generados en cliente (`almacen.js:169-170`) | No se puede reconstruir «qué se sabía y cuándo» | 3 | 3 | 9 | Fecha efectiva vs. registro | B01, B04 | Abierto |
| R21 | **Actor no registrado** (sin responsabilidad trazable) | Eventos sin usuario (`F-14`) | No se puede atribuir una decisión clínica | 4 | 3 | 12 (con datos reales) | `autor` literal en informe (no es actor) | B02, B04 | Abierto |
| R22 | **Dispensación duplicada o mal conciliada** | Clave fecha+episodio+componente; conciliación manual | PDC sobrestimado/subestimado | 3 | 3 | 9 | Conciliación explícita; identidad de origen; huella (`confianza.test.mjs`) | Ingesta automática con procedencia (B06) | Mitigado parcialmente |
| R23 | **Errores de fecha/zona horaria** | UTC en el motor; `hoy()` usa fecha local (`app.js:65`) | Corte desplazado un día | 2 | 3 | 6 | Pruebas de fechas UTC (`motor.test.mjs`) | Prueba de zona horaria en CI; fecha de corte explícita | Abierto |
| R24 | **XSS por contenido externo (CIMA, texto libre)** | `innerHTML` con `esc()` | Ejecución de script en el navegador clínico | 2 | 4 | 8 | CSP sin `unsafe-inline`; `esc`; pruebas de escape (`desktop.test.mjs`, `cima-informes.test.mjs`) | Modelo de amenazas redactado (A10, borrador sin revisar); auditoría de las 25 asignaciones a `innerHTML` y revisión independiente (C06) | Mitigado parcialmente |
| R25 | **Dependencia de CIMA/AEMPS** (disponibilidad, CORS, cambios de formato) | Acceso en vivo no verificado (`VALIDACION.md` v0.2) | Imposible registrar TAR; datos de catálogo erróneos | 3 | 2 | 6 | Error visible sin registrar medicación; instantánea de consulta | Caché controlado del catálogo con procedencia; verificación en el entorno del centro | Abierto |
| R26 | **Filtro ATC/vía incompleto** (p. ej. vías no intramusculares; códigos por revisar) | `cima.js:18-20` | Un antirretroviral válido no se puede registrar | 3 | 2 | 6 | Mensaje de rechazo con orientación | Revisión del filtro con farmacéuticos `[REQUIERE REFERENCIA]` | Abierto |

---

## 3. Riesgos de proyecto, regulatorios y organizativos

| ID | Riesgo | Causa / evidencia | Consecuencia | P | S | Punt. | Controles existentes | Controles propuestos | Estado |
|---|---|---|---|:-:|:-:|:-:|---|---|---|
| R27 | **Clasificación regulatoria errónea o tardía** | Finalidad prevista no definida (F-30) | Retirada, sanciones, pérdida de confianza | 3 | 5 | 15 | Avisos en demo | A01, C01, C02 | Abierto |
| R28 | **Incompatibilidad del modelo de cesión multicéntrica con la exención «in-house»** | «Vocación de cesión» sin formalizar (`legal.js`) | Imposibilidad de desplegar en otros centros sin CE | 3 | 4 | 12 | Texto de no-afirmación | C02 (decisión de ruta) | Abierto |
| R29 | **Titularidad/licencia no resueltas** (sin `LICENSE`; fuentes de terceros) | `AUDITORIA.md`, `legal.js`, `README.md` | Bloqueo legal de reutilización o difusión | 3 | 3 | 9 | Atribuciones y avisos | A11 | Abierto |
| R30 | **Dependencia de una persona (bus factor)** | Autoría y conocimiento concentrados | Parálisis del proyecto | 3 | 4 | 12 | Documentación extensa en `docs/` | Gobernanza (`CLINICAL_GOVERNANCE.md`), A02, CI | Abierto |
| R31 | **Sobrealcance** (querer igualar a un competidor comercial) | `COMPETITIVE_GAP_ANALYSIS.md` | Producto inacabado, riesgo de seguridad | 4 | 3 | 12 | Fases y puertas en el *roadmap* | `PRODUCT_ROADMAP.md` | Abierto |
| R32 | **Promesas de validación no respaldadas** (marketing/difusión) | Cultura de avisos actual es prudente | Pérdida de credibilidad y riesgo legal | 2 | 4 | 8 | Textos prudentes en `legal.js` y `PILOTO.md` | Revisión de comunicaciones por CCR | Mitigado parcialmente |
| R33 | **Falta de CI y deriva documental** | Flujo `.github/workflows/ci.yml` creado (A05), **ejecución en GitHub sin comprobar**; trazabilidad con guardas (A02) | Regresiones y descripciones erróneas | 4 | 2 | 8 | Pruebas unitarias, matriz de trazabilidad y registro de decisiones con guardas automáticas | Comprobar una ejecución real de la CI | Parcialmente mitigado |
| R34 | **Piloto sin aprobación ética o de protección de datos adecuada** | No iniciado | Invalidez y sanciones | 2 | 5 | 10 | Condiciones previas en `PILOTO.md` | C03, C04 | Previsto |
| R35 | **Rechazo por los usuarios** (carga adicional, mala usabilidad) | Sin pruebas de usabilidad con profesionales | Abandono | 3 | 3 | 9 | Pruebas funcionales de interfaz | C07; participación temprana | Abierto |

---

## 4. Lectura global

**Prioridad de tratamiento (por puntuación y por bloqueo del objetivo):**
1. **R01** (inyectables sin señal) — única puntuación crítica; además es el objetivo estratégico.
2. **R02, R03, R09, R13, R27** — afectan a seguridad clínica, privacidad o viabilidad regulatoria.
3. **R04, R05, R08, R10, R15, R18, R21, R28, R30, R31** — se tratan en las fases de fundamentos y plataforma.

**Observación metodológica.** La mayor parte de los riesgos altos de datos (R13–R21) **son consecuencia de que no hay backend**, no de defectos de la demo. Su tratamiento no es parchear la demo, sino no usarla con datos reales hasta que existan controles institucionales (condición ya declarada en `PILOTO.md`).

**Pendiente:** recalibrar P y S con el CCR; añadir aceptabilidad de riesgo y análisis beneficio–riesgo (requisitos de ISO 14971 `[VERIFICAR]`); añadir peligros específicos del canal y del modelo LA-TAR cuando estén especificados.
