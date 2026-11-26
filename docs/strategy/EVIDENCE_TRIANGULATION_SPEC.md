# EVIDENCE_TRIANGULATION_SPEC — Modelo de evidencia, procedencia y triangulación de fuentes (actuación A15)

| | |
|---|---|
| Estado | **BORRADOR TÉCNICO PARA REVISIÓN CLÍNICA. La matriz de triangulación NO está aprobada por el comité** |
| Fecha | 2026-11-25 |
| Qué es | Un esquema ejecutable de «afirmación» y una **propuesta** de cómo comparar fuentes de datos entre sí |
| Qué NO es | No es un motor (backlog B09), no calcula adherencia, no infiere causas y no recomienda tratamiento. No está conectado a la aplicación |
| Archivos | `src/esquema-evidencia.js` · `pruebas/evidencia/{triangulacion,ejemplos-triangulacion,afirmaciones-ejemplo}.json` · `pruebas/evidencia.test.mjs` |

---

## 0. Estado frente a los criterios de aceptación de A15

| # | Criterio | Estado | Detalle |
|---|---|---|---|
| 1 | Esquema de «afirmación» (fuente, fecha efectiva, procedencia, confianza) | **Cumplido** | `src/esquema-evidencia.js`: cerrado, con 8 fuentes y 15 magnitudes; 15 ejemplos sintéticos válidos |
| 2 | Matriz de concordancia/discordancia **aprobada por el CCR**, **sin inferir adherencia ni causalidad** | **Propuesta técnica cumplida; aprobación PENDIENTE** | La ausencia de inferencia no depende de la buena voluntad: la protegen invariantes comprobados por pruebas (§8). Aprobar la matriz es una decisión del comité |
| 3 | Ejemplos sintéticos para cada combinación relevante | **Cumplido** | 27 ejemplos de triangulación (las 20 combinaciones evaluables de los 5 pares, 5 con datos insuficientes y 2 de analítica no comparable), 5 ejemplos numéricos de eventos de suministro y 15 afirmaciones |
| 4 | Definición de eventos que alteran la necesidad de suministro (ingreso, suspensión, receta externa…) | **Definido; sin implementar** | 8 eventos con efecto y condiciones (§5). El motor actual no los consume (`motor.js`). Su efecto exige aprobación (D-E04, D-E05) |

Mientras no apruebe el comité, **nada de este documento puede alimentar una señal** ni mostrarse como resultado clínico.

---

## 1. Principios

1. **Tres capas, nunca mezcladas.** *Dato* (lo que dice una fuente) → *interpretación* (acuerdo o desacuerdo entre fuentes, como hipótesis) → *recomendación* (decisión clínica, **fuera de este modelo**). Este modelo solo llega a la segunda.
2. **Se comparan datos, no conductas.** El resultado dice si dos fuentes coinciden, no si el paciente «cumple».
3. **Sin puntuación ni índice compuesto.** Cada par de fuentes se presenta por separado; no existe una «adherencia global» (D-E08).
4. **Lo que falta no se rellena.** Un dato ausente o no comparable produce «insuficiente» o «no comparable».
5. **Las hipótesis son explicaciones a explorar,** redactadas sin afirmar causa.
6. **Las acciones son de revisión,** no terapéuticas (§6.4).
7. **Sin texto libre.** Todo valor es un código, un número o un vocabulario cerrado (minimización de datos de salud; las afirmaciones de VIH son datos especialmente sensibles).

---

## 2. Afirmación

Una **afirmación** es lo que una fuente dice, con cuándo se aplica, de dónde viene y cuánta confianza merece como *dato*.

| Campo | Contenido | Quién lo fija |
|---|---|---|
| `fuente` | Una de 8 (§2.1) | Productor |
| `magnitud` | Qué se afirma; solo las magnitudes de su fuente | Productor |
| `valor` | Estructura cerrada propia de la magnitud (códigos y números) | Productor |
| `fecha_efectiva` | `{inicio, fin}`: intervalo `[inicio, fin)`; `fin` nulo = puntual | Productor |
| `procedencia` | `sistema_origen`, `id_origen`, `lote_id`, `huella`, `metodo_captura` y `actor` (función y usuario) | Productor |
| `confianza` | `nivel` (alta, media, baja, desconocida) y `motivos` (vocabulario cerrado) | Regla (D-E03) |
| `corrige` | `{afirmacion_id, motivo}` si sustituye a otra; el original se conserva | Productor |
| `id`, `conocida_en`, `estado` | **Reservados:** los asigna el sistema (reloj de servidor, F-13) | Sistema |

`fecha_efectiva` (cuándo ocurrió o a qué periodo se refiere) y `conocida_en` (cuándo lo supo el sistema) son dos fechas distintas: es el modelo bitemporal de `TARGET_ARCHITECTURE_V2.md`.

### 2.1 Fuentes y magnitudes

| Fuente | Magnitudes | Naturaleza |
|---|---|---|
| `dispensacion_hospitalaria` | `dias_suministro` | Objetiva, pasiva (disponibilidad) |
| `dispensacion_externa` | `dias_suministro` | Objetiva, a menudo incompleta |
| `administracion_registrada` | `administracion_la` | Objetiva (TAR de acción prolongada; `LA_TAR_CLINICAL_SPEC.md`) |
| `cita` | `asistencia` | Objetiva |
| `autoinforme` | `dificultad_referida`, `valoracion_adherencia` | Declarativa |
| `valoracion_profesional` | `nivel_cmo` | Profesional |
| `analitica` | `carga_viral` | Objetiva, retardada e indirecta |
| `contexto_clinico` | `ingreso_hospitalario`, `suspension_prescrita`, `suministro_viaje`, `perdida_o_sustitucion`, `fin_de_seguimiento`, `stock_inicial`, `transicion_con_solapamiento` | Objetiva; modifica la evaluabilidad |

### 2.2 Modo entrada y modo almacenado

Como en `ESQUEMAS_EVENTOS.md` (A08): en modo **entrada** `id`, `conocida_en` y `estado` se rechazan como campos reservados; en modo **almacenado** son obligatorios. Los campos no previstos se rechazan a todos los niveles (también `procedencia`, `actor` y `valor`), de modo que un dato identificativo no puede colarse.

### 2.3 Correspondencia con los datos actuales (sin migrar nada)

| Dato actual | Afirmación equivalente | Observación |
|---|---|---|
| Filas de `importacion` (con `origen`, `id_origen`, huella del lote) | `dispensacion_hospitalaria / dias_suministro` | `origen`, `id_origen` y huella ya existen: son la procedencia |
| `correccion_dispensacion` | `corrige` | Mismo patrón: el original se conserva |
| `visita.experiencia` (barrera, dificultad, efecto) | `autoinforme / dificultad_referida` | `carga` y `preferencia` no se mapean (no intervienen en señales) |
| `evaluacion_adherencia` | `autoinforme / valoracion_adherencia` | El método «Registro externo revisado» no es autoinforme: decidir su fuente (D-E11) |
| `nivel` | `valoracion_profesional / nivel_cmo` | Ver D-E07 (circularidad) |
| `registrado` | `conocida_en` | Hoy lo fija el cliente (F-13) |

---

## 3. Confianza

La **confianza es una propiedad del dato, no del paciente**: dice cuánto fiarse de que el registro refleja lo que su fuente dijo, no si el paciente toma o no la medicación.

El esquema impone coherencias mínimas (verificadas por pruebas): una confianza **alta** no admite `captura_manual`, `sin_identidad_de_origen`, `dato_incompleto`, `dato_antiguo` ni `sistema_externo_no_verificado`; **baja** y **desconocida** exigen al menos un motivo.

**Rúbrica propuesta (sin aprobar; D-E03):**

| Nivel | Criterio de partida |
|---|---|
| Alta | Fuente primaria, importación validada, identidad de origen presente, sin motivos incompatibles |
| Media | Captura manual, autoinforme o valoración profesional; o identidad de origen ausente |
| Baja | Dato incompleto, antiguo, declarado por un tercero o no verificable |
| Desconocida | No se puede determinar |

La función que deriva el nivel a partir de los motivos **no se implementa** aquí: es una regla clínica que debe aprobar el comité y registrarse en el registro de reglas (A03).

---

## 4. Procedencia

La procedencia responde a quién lo dijo, por qué canal y desde qué sistema. Reutiliza lo que el repositorio ya tiene (`origen`, `id_origen`, huella SHA-256 del CSV) y añade lo que falta: el **actor** (F-14: hoy ningún evento registra quién lo originó) y el **método de captura**.

Funciones de actor: Farmacia Hospitalaria, Infecciosas, **Enfermería**, Paciente y Sistema. (Enfermería no existe hoy en el código: F-26, A17.)

---

## 5. Eventos que alteran la necesidad de suministro

Son hechos del contexto que cambian **qué días son evaluables** o **cuánto suministro hay**, sin decir nada sobre la conducta del paciente. Sin ellos, el PDC actual confunde «no se necesitaba medicación» o «se obtuvo en otro sitio» con «no hay cobertura».

### 5.1 Efectos posibles

| Efecto | Qué hace |
|---|---|
| `excluye_del_denominador` | Los días del intervalo se retiran **del numerador y del denominador**: no son evaluables |
| `aporta_cobertura` | Se trata como una dispensación: aporta días desde su fecha efectiva |
| `cierra_episodio` | El seguimiento termina en la fecha efectiva; los días posteriores dejan de ser evaluables |
| `marca_incertidumbre` | No cambia el cálculo; marca el periodo como dudoso para quien lo interprete |

### 5.2 Eventos definidos

| Evento (fuente / magnitud) | Efecto | Requiere | Ejemplo numérico |
|---|---|---|---|
| Ingreso hospitalario (`contexto_clinico / ingreso_hospitalario`) | `excluye_del_denominador` | Intervalo `[inicio, fin)` | S01 |
| Suspensión prescrita (`contexto_clinico / suspension_prescrita`) | `excluye_del_denominador` | Intervalo | S02 |
| **Dispensación externa** (`dispensacion_externa / dias_suministro`) | `aporta_cobertura` | Fecha, componente, días y sistema de origen | S03 |
| Existencias iniciales (`contexto_clinico / stock_inicial`) | `aporta_cobertura` | Fecha de inicio, componente y días | S04 |
| Fin de seguimiento: fallecimiento, traslado, pérdida de seguimiento o alta (`contexto_clinico / fin_de_seguimiento`) | `cierra_episodio` | Fecha efectiva y motivo codificado | S05 |
| Suministro de viaje (`contexto_clinico / suministro_viaje`) | `aporta_cobertura` (se marca como acumulación) | Fecha y días | — |
| Pérdida o sustitución (`contexto_clinico / perdida_o_sustitucion`) | `marca_incertidumbre` | Fecha y componente | — |
| Transición con solapamiento (`contexto_clinico / transicion_con_solapamiento`) | `marca_incertidumbre` | Intervalo | — |

### 5.3 Ejemplos numéricos (ventana de 30 días hasta el 31 de enero; TAR_A desde el 1 de enero)

| ID | Evento | Sin el evento | Con el evento | Cómo se obtuvo |
|---|---|---|---|---|
| S01 | Ingreso 21–30 ene; dispensación de 20 días desde el 1 ene | 20 de 30 | **20 de 20** | Sin evento: motor actual. Con evento: se retiran 10 días de numerador y denominador (semántica propuesta) |
| S02 | Suspensión 11–20 ene; dispensaciones de 10 días el 1 y el 21 ene | 20 de 30 | **20 de 20** | Ídem |
| S03 | Dispensación externa de 10 días el 11 ene; hospitalaria de 10 días el 1 ene | 10 de 30 | **20 de 30** | Ambos con el motor actual (la externa es una dispensación más) |
| S04 | Existencias de 15 días el 1 ene; primera dispensación el 16 ene | 15 de 30 | **30 de 30** | Ambos con el motor actual |
| S05 | Traslado el 21 ene; dispensación de 20 días desde el 1 ene | 20 de 30 | **20 de 20** | Sin evento: motor actual. Con evento: seguimiento cerrado el 21 ene |

**Lectura importante.** En S01, S02 y S05 el PDC «sube» porque dejan de evaluarse días que no eran evaluables, no porque el paciente haya «mejorado». El sistema debe mostrar siempre los días excluidos y su motivo. Un evento **nunca** convierte por sí mismo una discordancia en coherencia: cambia qué se está comparando.

**Estado de implementación.** El motor actual no consume estos eventos: `datos_fuera_episodio` y la conciliación son lo más cercano. S03 y S04 funcionan hoy si se registran como dispensaciones; los efectos de exclusión (S01, S02, S05) requieren cambiar el motor y su corpus (A04) bajo control del comité.

---

## 6. Matriz de triangulación (PROPUESTA)

### 6.1 Dimensiones y polaridad

Cada dimensión resume las afirmaciones de una fuente en un **nivel**, y cada nivel tiene una **polaridad**: favorable, desfavorable, insuficiente o no comparable. La polaridad solo dice si el *dato* apunta a lo esperado o no; no es un juicio sobre el paciente.

| Dimensión | Niveles → polaridad |
|---|---|
| **DISP** · Disponibilidad (PDC de dispensación) | alta → favorable · baja → desfavorable · no evaluable → insuficiente |
| **AUTO** · Dificultades referidas | sin dificultades → favorable · con dificultades → desfavorable · no explorado → insuficiente |
| **VIR** · Carga viral | suprimida → favorable · no suprimida → desfavorable · no comparable → no comparable · ausente → insuficiente |
| **ASIS** · Asistencia a la cita | asistida → favorable · no asistida → desfavorable · ausente → insuficiente |

### 6.2 Regla de resolución (sin opiniones)

1. Si alguna dimensión es **insuficiente** → resultado `insuficiente`, acción `esperar_datos`.
2. Si alguna es **no comparable** → `no_comparable`, acción `esperar_datos`.
3. Misma polaridad favorable → `coherente_favorable`; misma polaridad desfavorable → `coherente_desfavorable`; polaridades distintas → `discordante`.

El resultado sale de la polaridad. Lo que se propone al comité es el **contenido de cada celda** (acción e hipótesis), no el cálculo.

### 6.3 Pares y celdas

Se presentan cinco pares; **no se combinan en una puntuación**. `X | Y` = polaridad de la primera y de la segunda dimensión.

**DISP × AUTO**

| DISP \| AUTO | Resultado | Acción | Hipótesis a explorar |
|---|---|---|---|
| favorable \| favorable | coherente favorable | ninguna | — |
| favorable \| desfavorable | discordante | explorar con el paciente | H-TOL, H-ACC, H-DISP-NO-TOMA |
| desfavorable \| favorable | discordante | verificar calidad de datos | H-SUM-EXT, H-CTX, H-DAT, H-AUTO-SESGO |
| desfavorable \| desfavorable | coherente desfavorable | revisión profesional | — |

**DISP × VIR**

| DISP \| VIR | Resultado | Acción | Hipótesis |
|---|---|---|---|
| favorable \| favorable | coherente favorable | ninguna | — |
| favorable \| desfavorable | discordante | revisión profesional | H-VIR-OTRA, H-DISP-NO-TOMA, H-DAT |
| desfavorable \| favorable | discordante | verificar calidad de datos | H-SUM-EXT, H-CTX, H-DAT, H-VIR-NO-CONCL |
| desfavorable \| desfavorable | coherente desfavorable | revisión profesional | — |

**DISP × ASIS**

| DISP \| ASIS | Resultado | Acción | Hipótesis |
|---|---|---|---|
| favorable \| favorable | coherente favorable | ninguna | — |
| favorable \| desfavorable | discordante | explorar con el paciente | H-ACC, H-CITA-OTRA |
| desfavorable \| favorable | discordante | verificar calidad de datos | H-SUM-EXT, H-CTX, H-DAT |
| desfavorable \| desfavorable | coherente desfavorable | revisión profesional | — |

**AUTO × VIR**

| AUTO \| VIR | Resultado | Acción | Hipótesis |
|---|---|---|---|
| favorable \| favorable | coherente favorable | ninguna | — |
| favorable \| desfavorable | discordante | revisión profesional | H-AUTO-SESGO, H-DIF-NO-REF, H-VIR-OTRA |
| desfavorable \| favorable | discordante | explorar con el paciente | H-TOL, H-VIR-NO-CONCL |
| desfavorable \| desfavorable | coherente desfavorable | revisión profesional | — |

**AUTO × ASIS**

| AUTO \| ASIS | Resultado | Acción | Hipótesis |
|---|---|---|---|
| favorable \| favorable | coherente favorable | ninguna | — |
| favorable \| desfavorable | discordante | explorar con el paciente | H-CITA-OTRA, H-DIF-NO-REF, H-ACC |
| desfavorable \| favorable | discordante | explorar con el paciente | H-TOL, H-ACC |
| desfavorable \| desfavorable | coherente desfavorable | revisión profesional | — |

**Criterio de diseño que se propone al comité:** cuando la **disponibilidad** es la fuente desfavorable frente a otra favorable, la acción es *verificar primero la calidad de los datos* (suministro externo, ingresos, error de captura) antes de interpretar nada.

### 6.4 Hipótesis y acciones

| Código | Hipótesis (posible explicación que el profesional puede explorar) |
|---|---|
| H-SUM-EXT | Suministro obtenido fuera del registro del sistema (otra farmacia, receta externa o existencias previas) |
| H-CTX | Días con ingreso hospitalario, suspensión o viaje que no constan en el sistema |
| H-DAT | Dato incompleto, desfasado o con error de captura o de importación |
| H-AUTO-SESGO | El autoinforme es una fuente declarativa y puede infradeclarar o sobredeclarar |
| H-DIF-NO-REF | Dificultades no referidas o no exploradas con suficiente detalle |
| H-TOL | Dificultades de tolerabilidad o de toma que pueden coexistir con medicación disponible |
| H-ACC | Barreras de acceso, logísticas o personales no relacionadas con la medicación |
| H-DISP-NO-TOMA | La disponibilidad de medicación no equivale a toma |
| H-VIR-OTRA | Factores virológicos o analíticos independientes de la toma (resistencias, interacciones, variación del laboratorio) |
| H-VIR-NO-CONCL | Una analítica es un resultado indirecto y distante de la toma; no la mide |
| H-VIR-TIEMPO | La analítica no corresponde al periodo de disponibilidad evaluado |
| H-CITA-OTRA | Inasistencia por motivos ajenos a la medicación |

| Acción | Significado |
|---|---|
| ninguna | Sin acción de revisión derivada |
| esperar_datos | Falta algún dato o no es comparable |
| verificar_calidad_de_datos | Comprobar calidad y completitud antes de interpretar |
| explorar_con_el_paciente | Explorar en la siguiente ocasión de contacto |
| revision_profesional | Revisión por un profesional con los datos que respaldan el resultado |

**Ninguna acción es terapéutica.** La prioridad y el responsable de cada acción los decide el comité (D-E06).

### 6.5 Trazabilidad obligatoria de cualquier resultado

Todo resultado debe enlazar a las `afirmaciones` que lo sustentan, a la **regla y versión** del registro (A03, con estado «Pendiente de validación profesional» mientras no se apruebe) y a los parámetros usados (umbral de PDC, umbral de carga viral, ventana). Sin esos enlaces no se muestra.

---

## 7. Ejemplos

- `pruebas/evidencia/afirmaciones-ejemplo.json`: 15 afirmaciones completas, una por cada pareja fuente–magnitud.
- `pruebas/evidencia/ejemplos-triangulacion.json`: 27 casos (T01–T27) con el resultado esperado **escrito a mano antes de ejecutar nada**, y 5 de eventos de suministro (S01–S05).

Los dos umbrales del contexto son **ilustrativos**: el del PDC reproduce el valor demostrativo de la regla `cobertura_demo` (pendiente de validación) y el de carga viral (50 copias/mL) reproduce la definición de «virológicamente suprimido» que usan las fichas técnicas de Vocabria y Rekambys en su indicación. El valor operativo lo decide el comité (D-E01). La analítica solo se considera comparable si cae dentro de la ventana del PDC; el margen lo decide el comité (D-E02).

---

## 8. Qué verifican las pruebas

`pruebas/evidencia.test.mjs` (15 pruebas):

| Garantía | Cómo se comprueba |
|---|---|
| El esquema de afirmación es cerrado | Campos no previstos, obligatorios ausentes, vocabularios y magnitudes ajenas a la fuente se rechazan en todos los niveles |
| Las afirmaciones no admiten texto libre | Los valores son códigos con patrón y longitud acotados; los motivos de corrección son un vocabulario cerrado |
| Coherencia de la confianza | La confianza alta no admite motivos incompatibles; baja y desconocida exigen motivo |
| La matriz es completa | Las 5 parejas × todos los niveles se resuelven; ninguna celda queda sin definir |
| Las celdas son coherentes | El resultado sale de la polaridad; toda discordancia lleva ≥2 hipótesis y una acción; las coincidencias favorables no llevan acción |
| **No se califica la conducta ni se afirman causas** | Búsqueda léxica en todos los textos: «no adherente», «incumplimiento», «abandono», «debido a», «demuestra», «confirma», imperativos terapéuticos… |
| **No existe puntuación compuesta** | Ninguna clave del modelo contiene puntuación, índice o nivel global |
| Los ejemplos escritos a mano cumplen la matriz | 27 casos |
| Los eventos de suministro | El PDC «sin evento» coincide con el motor real; el «con evento» con el cálculo propuesto |

**Sensibilidad de las pruebas.** Se introdujeron 11 defectos en una copia fuera del repositorio (acción de una celda, texto que califica conducta, clave de puntuación, resultado de una celda, hipótesis, restricciones del esquema, ejemplos y cálculos erróneos). Las pruebas detectaron 10; el undécimo (intervalo obligatorio de ingreso, suspensión y solapamiento) **no estaba cubierto**: se añadió una prueba y ahora se detecta.

**Límites de esas pruebas.** Comprueban la coherencia interna y la ausencia de lenguaje inferencial. No demuestran que la matriz sea clínicamente adecuada. Que una hipótesis sea neutra en su redacción no garantiza que no se malinterprete en pantalla: eso exige la prueba de usabilidad (C07).

---

## 9. Decisiones abiertas para el comité

| ID | Decisión | Propuesta provisional (no aprobada) |
|---|---|---|
| D-E01 | Polaridad y umbrales de cada dimensión: PDC (regla `cobertura_demo`) y carga viral (valor, unidad y criterio de «suprimida») | PDC: la regla vigente; carga viral: decidir con Infecciosas |
| D-E02 | Comparabilidad temporal de la analítica con la ventana del PDC (margen) | La analítica debe caer en la ventana (margen 0) |
| D-E03 | Rúbrica de confianza y confianza mínima para que una afirmación active una discordancia o un evento de suministro | §3 como punto de partida; una confianza baja nunca dispara prioridad alta |
| D-E04 | Efecto de ingreso y suspensión (excluir del denominador) y fuente exigida | Excluir, solo con fuente de confianza ≥ media |
| D-E05 | Dispensación externa: qué fuentes se aceptan y cómo se concilian con la hospitalaria (duplicados) | Misma conciliación que el CSV, con procedencia explícita |
| D-E06 | Prioridad y responsable de cada acción | Sin proponer valores |
| D-E07 | Si el nivel CMO puede entrar como fuente (riesgo de circularidad: la valoración profesional condiciona luego la triangulación) | Fuera de la matriz inicial |
| D-E08 | Confirmar la prohibición de puntuaciones o índices compuestos | Prohibidos |
| D-E09 | Retención y minimización de afirmaciones de autoinforme y analítica (EIPD) | Definir en la EIPD (C03) |
| D-E10 | Si algo de la triangulación se muestra alguna vez al paciente | No, salvo decisión expresa |
| D-E11 | Persistencia: ¿la afirmación es un tipo de evento nuevo en `ESQUEMAS` o una proyección derivada de los eventos actuales? Y la fuente del método «Registro externo revisado» | Proyección derivada primero; decidir al implementar B09 |
| D-E12 | Catálogo de códigos (`motivo_codigo` de suspensión, motivos de corrección) | Catálogo cerrado definido por el comité |
| D-E13 | Varias afirmaciones de la misma fuente en la ventana: ¿la más reciente, la más desfavorable? | Los ejemplos usan «cualquier dificultad referida» y «cualquier cita no asistida»; **es una elección de las pruebas, no una propuesta clínica** |

---

## 10. Integración con el resto del plan

- **A03:** cada regla de triangulación tendrá ficha en el registro, con estado «Pendiente de validación profesional» hasta su aprobación.
- **A08:** si se persiste como eventos, cada tipo nuevo necesita esquema cerrado y su muestra (D-E11).
- **A13:** `administracion_registrada` y la dispensación del kit son fuentes de la discordancia dispensación–administración; no se incluyen en la matriz inicial.
- **A16:** el nivel CMO por dimensiones (Capacidad, Motivación, Oportunidad) sustituirá a `nivel_cmo` cuando exista (D-E07).
- **B06, B09, B10:** ingesta de dispensaciones y analíticas con procedencia; motor de triangulación.
- **Regulatorio (`REGULATORY_READINESS.md`):** presentar discordancias como hipótesis para revisión profesional encaja en E2; cualquier recomendación automática o contacto con el paciente basado en ellas cambia el escenario.

---

## 11. Revisión y aprobación

| Revisor | Función | Fecha | Matriz de §6 (aprobada / con cambios / rechazada) | D-E resueltas | Observaciones | Firma |
|---|---|---|---|---|---|---|
| `[DATO PENDIENTE]` | | | | | | |
| `[DATO PENDIENTE]` | | | | | | |

Aprobación del comité: `[DATO PENDIENTE]` · Acta: `[DATO PENDIENTE]`.

---

## 12. Riesgos y límites

- **Interpretación indebida.** Una discordancia puede leerse como «el paciente no toma» (estigma, juicio de valor). Mitigan el lenguaje cerrado, la ausencia de puntuación y la formación; no lo elimina. Ver R36 en `RISK_REGISTER.md`.
- **Falsa tranquilidad.** «Coherente favorable» no demuestra toma ni control clínico: dos fuentes que coinciden pueden coincidir en el error.
- **Calidad de datos.** Toda la matriz depende de la calidad de las fuentes; por eso la verificación de datos es la primera acción cuando falla la disponibilidad.
- **Datos de salud.** Autoinforme y analíticas son datos especialmente sensibles (VIH); la retención y el acceso exigen EIPD antes de cualquier uso real.
- **Alcance.** Cinco pares y cuatro dimensiones. No cubre interacciones, comorbilidad, factores sociales ni TAR inyectable más allá de lo dicho en §10.
- **Sin evidencia de utilidad.** No hay datos de que la triangulación mejore resultados; es una hipótesis que evalúa `VALIDATION_MASTER_PLAN.md`.
