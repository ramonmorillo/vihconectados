# CURRENT_STATE_AUDIT — Auditoría del estado actual de vihconectados

| | |
|---|---|
| Estado del documento | **BORRADOR PARA REVISIÓN Y APROBACIÓN** (no implementa nada) |
| Fecha | 2026-11-25 |
| Base auditada | rama `claude/affectionate-goodall-ub6062`, commit `1208ef4` (v0.3.0, 2026-11-09), 60 ficheros versionados |
| Modo | Solo lectura. Único código ejecutado: `npm test`, `npm run check` y un script de sondeo en el *scratchpad* fuera del repositorio (no modifica nada) |
| Convención de estado | **IMPLEMENTADO** · **SIMULADO** (existe la interfaz/flujo pero no el efecto real) · **PARCIAL** · **PENDIENTE** (no existe) |
| Convención de capas | **D** dato objetivo (verificable en el repositorio) · **I** interpretación profesional · **R** recomendación |

> Este documento no declara cumplimiento normativo ni validación clínica de ninguna parte del sistema. Cuando una conclusión depende de información que no está en el repositorio, se marca `[DATO PENDIENTE]` o `[REQUIERE REFERENCIA]`.

> **Actualización 2026-11-25 (tras aprobar el backlog):** las actuaciones **A06** y **A04** están implementadas. F-11 queda mitigada en visibilidad (el episodio inyectable es ahora una señal pendiente «NO MONITORIZADO»; la detección de administraciones perdidas sigue pendiente de A13/B08) y F-16 queda resuelta (sin nivel por defecto). Se añade un corpus dorado de 26 casos pendiente de firma independiente. **A07** (dominio/interfaz y puerto por comandos) está implementada: F-02 queda resuelta en lo relativo a la lógica de formularios (no así la división de `app.js`) y F-27 en lo relativo al contrato del puerto. **A14** (cuestionarios declarativos y escalado) queda redactada como borrador sin aprobar. **A13** (especificación LA-TAR) y **A15** (modelo de evidencia y triangulación) están redactadas como borradores sin aprobar. **A03** (registro de reglas versionado) y **A08** (esquemas cerrados, lista blanca y migraciones) también están implementadas: F-12 queda resuelta en el cliente y F-03 en lo relativo a migraciones. El resto de hallazgos describe el estado auditado en el commit `1208ef4`. Detalle en `docs/VALIDACION.md`.

---

## 0. Alcance, método y límites de la auditoría

**D.** Se leyeron íntegramente: `src/motor.js`, `almacen.js`, `temporal.js`, `dispensaciones.js`, `senales.js`, `revision-datos.js`, `adherencia.js`, `consulta.js`, `registro-manual.js`, `acceso.js`, `legal.js`, `cima.js`, `medicacion.js`, `informes.js`, `demo.js`, `servidor.mjs`, `package.json`, los datos de `datos/` (parcialmente), toda la documentación de `docs/*.md` (salvo `MANUAL_USO.md`, no analizado) y el inventario y títulos de las pruebas. Del resto (`app.js`, `desktop.js`, `vista-*.js`, CSS) se revisaron esquemas, funciones y búsquedas dirigidas, no línea a línea.

**D.** Ejecutado por esta auditoría: `npm test` → 55/55 pruebas superadas; `npm run check` → sintaxis correcta. **No** se ejecutaron las pruebas de navegador (`npm run test:browser`, 6 guiones Playwright): sus resultados se citan de la documentación del repositorio y no están verificados aquí.

**Límites explícitos (no verificables desde esta sesión):**
- Los repositorios hermanos (`preparadorconsulta`, `cmo-vih-app`, `adhefarmapexhub`) están fuera del alcance de GitHub concedido a la sesión. Solo se conoce lo que `docs/AUDITORIA.md` y `docs/VALIDACION.md` dicen de ellos.
- **HIV Prescribing Cascade Auditor, CambiosTAR y RXplain no se mencionan en ningún fichero de este repositorio** (búsqueda textual sin resultados). No se ha podido auditar su reutilización: véase §5, área 14.
- No hay datos clínicos, de uso real ni de rendimiento: toda afirmación sobre utilidad asistencial es hipótesis.

---

## 1. Resumen ejecutivo

**D.** vihconectados 0.3.0 es una aplicación web de demostración sin dependencias de ejecución (solo `playwright` como `devDependency`), módulos ES nativos servidos por un servidor Node estático (`servidor.mjs`), con persistencia en `localStorage` (`src/almacen.js:47-63`, clave `vihconectados.demo.v1`) y datos exclusivamente sintéticos. Contiene un motor determinista de cobertura PDC para TAR oral, un registro de eventos solo-anexar con correcciones, gestión de señales con huella de evidencia, una consulta guiada CMO con seguimiento de plan, informes congelados e interfaz de cohorte.

**I (fortalezas reales, defendibles).**
1. Núcleo de dominio razonablemente puro y portable (`motor`, `temporal`, `dispensaciones`, `senales`, `consulta`, `adherencia`): es el activo con más valor de reutilización hacia un backend.
2. Disciplina de honestidad clínica poco habitual en demos: la cobertura se separa de la adherencia, los parámetros se etiquetan «pendiente de validación», PDC nulo ≠ PDC 0, las valoraciones manuales no alteran el PDC.
3. Semántica temporal explícita (fecha efectiva vs. `registrado`, corte inclusivo/exclusivo) y trazabilidad por eventos con correcciones no destructivas.
4. Diseño de acceso institucional bien razonado (`docs/ACCESO_HOSPITALARIO.md`) con pruebas de aceptación previas definidas.

**I (brechas críticas respecto al objetivo VIHconectados 2.0).**
1. **No existe backend, identidad, autorización, auditoría ni multicentro**: la plataforma no puede manejar un solo dato real.
2. **El TAR de acción prolongada es invisible, no «no evaluable»**: un episodio inyectable no genera señal pendiente (hallazgo F-11, confirmado por sondeo).
3. **No hay triangulación de fuentes**: solo dispensación declarada + experiencia categórica. Sin analíticas, citas, ingresos ni otras fuentes.
4. **No hay seguimiento activo entre consultas**: ni cuestionarios, ni canal, ni planificación.
5. **El modelo CMO está reducido a un nivel 1–3 asignado a mano**: no se registran las tres dimensiones Capacidad–Motivación–Oportunidad (F-23).
6. **Enfermería no existe como actor** (F-26).
7. **Integridad de datos en el límite de confianza**: el comando `anexar` acepta eventos sin validar de varios tipos y un evento malformado inutiliza el cálculo del paciente (F-12, confirmado).

**R.** Antes de añadir capacidades (voz, IA, canal), cerrar tres fundamentos: (a) finalidad prevista y frontera regulatoria, (b) verificación independiente y versionado de las reglas clínicas, (c) separación dominio/UI + puerto de repositorio hacia un backend. Detalle en `PRIORITIZED_BACKLOG.md` (diez primeras actuaciones).

---

## 2. Inventario y métricas

| Métrica | Valor | Fuente |
|---|---|---|
| Ficheros versionados | 60 | `git ls-files` |
| Líneas `src/*.js` | ≈ 2 330 (app.js 705; motor.js 279; demo.js 177; almacen.js 173; informes.js 169; cima.js 145; medicacion.js 138); varios módulos con líneas muy largas (plantillas HTML en una línea) | `wc -l` |
| Dependencias de ejecución | 0 | `package.json` |
| Dependencias de desarrollo | `playwright 1.65.0` (fijada por `package-lock.json`) | `package.json` |
| Pruebas unitarias | 55 (`node --test pruebas/*.test.mjs`), todas superadas hoy | ejecución propia |
| Pruebas de navegador | 6 guiones Playwright, no ejecutados por la auditoría | `package.json` script `test:browser` |
| CI | **inexistente** (sin `.github/`) | `ls -a` |
| Licencia del repositorio | **inexistente** (sin `LICENSE`); texto legal declara «vocación de cesión» sin formalizarla | `legal.js`, `README.md` |
| Ramas remotas | `feat/fase-1` y la rama de trabajo; **sin `main`** | `git branch -a`; `docs/REVISION.md` |
| Frameworks / build | ninguno (módulos ES servidos directamente) | `README.md` |

---

## 3. Matriz de capacidades: implementada / simulada / parcial / pendiente

| # | Capacidad | Estado | Evidencia |
|---|---|---|---|
| C1 | PDC oral con intersección de componentes, arrastre intra-episodio, ventana configurable | **IMPLEMENTADO** (parámetros no validados) | `motor.js:142-208`; `motor.test.mjs` (cobertura exacta, multicomponente, cambio de TAR, ventana) |
| C2 | Episodios de TAR y corte por cambio de régimen | **IMPLEMENTADO** | `motor.js:69-73,154-195`; `almacen.js:70-82` |
| C3 | Dispensaciones: CSV cerrado, entrada manual, deduplicación, conciliación, correcciones por anulación/sustitución | **IMPLEMENTADO** | `motor.js:93-141`; `dispensaciones.js`; `revision-datos.js`; `confianza.test.mjs` |
| C4 | Procedencia de dispensación (`origen`, `id_origen`, huella SHA-256 del CSV) | **PARCIAL** (opcional; sin actor ni reloj de servidor) | `motor.js:113`; `revision-datos.js` (`crypto.subtle.digest`) |
| C5 | TAR de acción prolongada (administración, ventanas, retrasos, carga) | **PENDIENTE** (catálogo + exclusión del PDC únicamente) | `motor.js:75-79,158-161`; `cima.js:20`; `docs/REGISTRO_MANUAL.md` |
| C6 | Señales: cobertura baja, datos fuera de episodio, experiencia referida, sin datos, TAR inyectable no evaluable | **IMPLEMENTADO** (umbral demo, sin validación) | `motor.js:209-267`; `senales.js` |
| C7 | Gestión de señales con huella de evidencia y reapertura | **IMPLEMENTADO** | `senales.js` (`evaluarSenales`, `validarGestionSenal`); `confianza.test.mjs` |
| C8 | Triangulación de fuentes (analíticas, citas, ingresos, interacciones, prescripción) | **PENDIENTE** | ninguna fuente adicional en el código; `INTEGRACION_STITCH.md`: «No existen carga viral, CD4, FG…» |
| C9 | Experiencia del paciente (5 dominios categóricos) | **PARCIAL** (no es PROM/PREM validado) | `motor.js:16-42` |
| C10 | Valoración manual de adherencia (periodo, método, % declarado) | **IMPLEMENTADO** (declarativa) | `adherencia.js`; no altera PDC ni señales por diseño |
| C11 | Cuestionarios adaptativos, mensajería, voz, IA conversacional | **PENDIENTE** | sin código; `preferencia: "Seguimiento telefónico simulado"` es solo una opción de lista (`motor.js:37-41`) |
| C12 | Nivel CMO (1–3) | **SIMULADO** (asignación manual, sin dimensiones C/M/O) | `almacen.js:21-45,140-141`; búsqueda de «capacidad/motivación/oportunidad» solo halla texto de ayuda (`app.js:335`) |
| C13 | Intervenciones CMO (biblioteca literal) y actuaciones | **PARCIAL** | `datos/biblioteca-vih.json` (acumulativa; discrepancia declarada); `almacen.js:142-152` |
| C14 | Plan: problema → objetivo → actuación → responsable → revisión → resultado | **IMPLEMENTADO** (objetivo en texto libre) | `consulta.js`; `consulta.test.mjs` |
| C15 | Reestratificación / cambio de nivel con motivo | **PENDIENTE** (`nivel` es evento sin motivo ni regla) | `almacen.js:140-141` |
| C16 | Coordinación Farmacia–Infecciosas: estados pendiente→resuelto | **SIMULADO** (sin envío, sin acuse) | `motor.js:43-49,268-279`; `legal.js` condiciones |
| C17 | Enfermería como actor | **PENDIENTE** | `consulta.js:3` (`RESPONSABLES`), `acceso.js` (`ROLES_PREVISTOS`) |
| C18 | Autenticación, roles, aislamiento multicéntrico, auditoría protegida | **PENDIENTE** (diseño documentado) | `acceso.js` (adaptador de demostración); `ACCESO_HOSPITALARIO.md` |
| C19 | Backend, base de datos, copias y recuperación | **PENDIENTE** | `servidor.mjs` solo sirve estáticos |
| C20 | HL7 FHIR / integración con sistemas hospitalarios | **PENDIENTE** | `PILOTO.md`: «JSON propio, no FHIR validado»; sin código |
| C21 | Informes profesionales y hoja de paciente (instantánea congelada, PDF por impresión) | **IMPLEMENTADO** (demo) | `informes.js`; `cima-informes.test.mjs` |
| C22 | Consulta de catálogo CIMA/AEMPS | **PARCIAL** (CORS/disponibilidad real no verificada) | `cima.js`; `VALIDACION.md` v0.2 |
| C23 | IA generativa | **AUSENTE por diseño** (no hay llamadas a LLM) | búsqueda textual; `legal.js` (privacidad) |
| C24 | Gestión de riesgos, QMS, ficheros técnicos MDR | **PENDIENTE** | no hay artefactos; `REGULATORY_READINESS.md` los define |

---

## 4. Hallazgos por área (D = dato, I = interpretación, R = recomendación)

Gravedad: **Crítica** (bloquea el objetivo o es riesgo clínico/seguridad), **Alta**, **Media**, **Baja**.

### Área 1 — Arquitectura, modularidad, deuda técnica y escalabilidad

**F-01 (fortaleza) Núcleo de dominio portable.** D: `motor.js`, `temporal.js`, `dispensaciones.js`, `senales.js`, `consulta.js`, `adherencia.js`, `informes.js` no tocan el DOM; `almacen.js` los compone como comandos que devuelven un nuevo estado (`copia(db)`). I: es el punto de partida correcto para un servidor que re-ejecute exactamente la misma validación. R: preservarlo como paquete de dominio compartido cliente/servidor.

**F-02 (Media) Mezcla de dominio y UI.** D: `revision-datos.js` contiene la lógica de conciliación (`crearGuardadoConciliado`) con acceso directo a `document.getElementById('conciliacionDispensaciones')`; `registro-manual.js` y `medicacion.js` combinan formularios con reglas; `app.js` (705 líneas) mantiene estado global mutable (`db`, `seleccion`, `reglas`, `app.js:62-93`) y construye HTML por plantillas de texto. I: dificulta pruebas unitarias del flujo de conciliación y bloquea la reutilización en un servicio. R: extraer los planificadores a funciones puras; dejar en vistas solo la presentación (backlog A07).

**F-03 (Alta) Persistencia monobloque sin migraciones.** D: `RepositorioDemo.guardar` serializa toda la base en una clave (`almacen.js:60-62`); `leer()` lanza «Almacenamiento incompatible» si `formato` difiere (`almacen.js:52-59`); cada informe embebe `eventos` completos del paciente (`informes.js`, `informe()`: `eventos: p.eventos.filter(e => !esInforme(e))`). I: crecimiento superlineal por informe y por señal (la «huella» de `evaluarSenales` es la cadena canónica completa, no un hash); la cuota de `localStorage` (≈5 MB, dependiente del navegador `[DATO PENDIENTE de medir]`) es un techo duro; un cambio de formato bloquea la carga en lugar de migrar. `docs/PILOTO.md` ya documenta que no es un almacén clínico. R: versionado de esquema con migraciones (A08), hash de evidencia en lugar de cadena completa (A09/A15) y persistencia de servidor (B05).

**F-04 (Media) Sin integración continua, licencia ni linter.** D: no existe `.github/`, `LICENSE`; el script `check` enumera a mano 23 ficheros con `node --check` (solo sintaxis). I: riesgo de deriva (ya hay deriva documental, F-34) y de ficheros sin comprobar. R: CI mínimo y licencia decidida por el autor (A05, A11).

**F-05 (Media, solo desarrollo) Servidor estático.** D: `servidor.mjs` escucha en `0.0.0.0`, sin TLS; lista blanca por expresión regular (`index.html`, `src/[a-z-]+.(js|css)`, `datos/*.json`, PDF); CSP restrictiva (`script-src 'self'`, `connect-src 'self' https://cima.aemps.es`), `X-Content-Type-Options`, `no-store`. I: apto como servidor de demostración; no es una base de despliegue. `docs/PILOTO.md` lo declara. Faltan `Referrer-Policy`, `Permissions-Policy` y HSTS (en un futuro entorno con TLS). R: no endurecer este servidor; sustituirlo en la arquitectura V2.

**F-06 (Baja) Escalabilidad de cálculo.** D: `cobertura` itera día a día con `Set` por componente (`motor.js:167-185`); ventana acotada a 730 días (`validarReglas`). `historialDispensaciones` usa `filas.find` por corrección (O(n·m)). I: adecuado para un paciente; sin problema a la escala de una cohorte hospitalaria si se calcula en servidor con índices. R: sin acción inmediata; medir en B.

### Área 2 — Motor de cobertura TAR, PDC, persistencia, episodios y dispensaciones

**F-07 (D/I) Definición del PDC.** D: PDC = días con *todos* los componentes cubiertos / días del intervalo, ventana por defecto 180 días, umbral 0,9 (`motor.js:5-10`), `REGLAS.validacion = "Pendiente de validación profesional"`. Denominador: máximo entre inicio de ventana y primer TAR; no se recorta al primer suministro (`motor.js:147-150`). Arrastre de sobrantes dentro de componente y episodio (`libre`, `motor.js:169-181`); nuevo episodio corta el arrastre. I: es un PDC «conservador» razonable y bien explicado; **el umbral del 90 % y la ventana de 180 días proceden de una calculadora previa (`docs/AUDITORIA.md`, `datos/reglas` de referencia v0.2.0) y no tienen justificación clínica en este repositorio** `[REQUIERE REFERENCIA]`. R: tratarlos como hipótesis y versionarlos (A03).

**F-08 (Alta) Omisiones clínicas del modelo de cobertura.** D: `docs/PILOTO.md` y `docs/CONFIANZA_DATOS.md` reconocen ausencia de ingresos, interrupciones, fallecimiento, pérdidas, solapamientos de cambio, recetas externas y stock inicial; solo un régimen oral activo por día. I: un PDC por debajo del umbral por ingreso hospitalario o por dispensación en otro centro generará falsos positivos; una dispensación grande por «acaparamiento» generará falsos negativos. Impacto sobre alertas: no cuantificado `[DATO PENDIENTE: no hay datos reales]`. R: diseñar modelo de «eventos que alteran la necesidad de suministro» (ingreso, suspensión, viaje, receta externa) con procedencia (A15).

**F-09 (Media) Correcciones solo para dispensaciones.** D: el único evento de corrección es `correccion_dispensacion` (`almacen.js:104-118`); `tratamiento` exige fecha posterior al último inicio (`almacen.js:72-77`); `nivel`, `visita`, `actuacion`, `consulta` no tienen anulación/sustitución. I: una fecha de inicio de TAR errónea o un nivel mal asignado no pueden corregirse sin crear un episodio nuevo o un estado inconsistente; el historial «solo anexar» sin mecanismo de corrección generalizado es una limitación asistencial. R: evento de corrección genérico con referencia, motivo y actor (diseño en `TARGET_ARCHITECTURE_V2.md` §3; implementación B01/B04).

**F-10 (Media) Unidad «días» sin trazabilidad a pauta.** D: `dias` entero 1–400 (`motor.js:112`); no se registran comprimidos, posología ni formato; «no se deducen días del envase» (`registro-manual.js` texto). I: correcto como principio de prudencia, pero un futuro conector deberá convertir unidades de dispensación a días con una regla explícita y auditable. R: especificar la conversión en el contrato de ingesta (B06).

### Área 3 — TAR de acción prolongada

**F-11 (Crítica) El TAR inyectable genera un hueco silencioso.** D (confirmado por sondeo reproducible): con un episodio `modalidad: "inyectable"`, `componentes()` devuelve `[]` (`motor.js:75-78`), la cobertura lo excluye (`motor.js:158-161`, `pdc: null`), y la única señal es `tar_inyectable_no_evaluable` con categoría `aviso` (`senales.js`), que **no cuenta como pendiente**: `pendientesSenales(...)` devuelve 0. I: para un paciente en cabotegravir/rilpivirina inyectable, una administración perdida o retrasada no produce señal alguna, y el panel no la contará entre pendientes. Es el caso de uso estratégico de VIHconectados 2.0 y hoy su comportamiento es el opuesto al deseable (el sistema «calla»). R: hasta que exista el módulo LA-TAR, mostrar el episodio inyectable como *no monitorizado* con prominencia (estado explícito en panel y cohorte), no como aviso silencioso (A06), y especificar el dominio LA-TAR (A13).

**F-11b (Alta) Limitaciones de modelado de fases.** D: `modalidadTar` impide mezclar oral e intramuscular en un episodio y pide «registrar por separado las fases» (`cima.js:21-26`); `docs/REGISTRO_MANUAL.md`: «No se deducen dosis, días de suministro, ventanas ni administraciones». El filtro ATC es `^(J05A(E|F|G|J|R)|J05AX(08|09|12|29)$)` y exige `intramuscular === true` (`cima.js:18-20`). I: no se contemplan inicio con fase oral previa, dosis de carga, intervalos mensual/bimestral, ventanas de tolerancia, reinicios tras retraso largo ni vías no intramusculares (p. ej. subcutánea). Si algún fármaco de acción prolongada de vía subcutánea debe soportarse, requiere verificar códigos ATC y vías en CIMA `[REQUIERE REFERENCIA: ficha técnica vigente]`. R: especificación clínica del dominio LA-TAR con panel experto antes de codificar (A13).

### Área 4 — Calidad, integridad, trazabilidad y procedencia

**F-12 (Crítica para backend) El comando `anexar` no valida varios tipos y un evento malformado envenena el cálculo.** D (confirmado): `almacen.js:159-168` admite sin comprobar contenido los tipos `importacion` (si no es conciliada ni «Entrada manual»), `informe`, `informe_paciente`, `revision_alertas`, `configuracion`. Un `{tipo:"importacion", fuente:"X"}` es aceptado y luego `cobertura()` lanza `Cannot read properties of undefined (reading 'forEach')` (por `e.filas.forEach` en `historialDispensaciones`). I: en la demo local el riesgo es nulo (el usuario controla su navegador), pero **esta es exactamente la superficie que un backend no puede heredar**: el servidor debe revalidar cada comando y rechazar tipos sin esquema. `docs/ACCESO_HOSPITALARIO.md` ya lo exige (§Autorización); hoy el código no lo cumple. R: esquema cerrado por tipo de evento, lista blanca y rechazo por defecto (A08/B01).

**F-13 (Alta) Procedencia temporal e identidad generadas en cliente.** D: `e.id = crypto.randomUUID(); e.registrado = new Date().toISOString();` (`almacen.js:169-170`). I: sin reloj de servidor, `registrado` no es una prueba de cuándo se supo algo; una vista del tipo «qué se sabía entonces» no es fiable (`CONFIANZA_DATOS.md` lo reconoce: «no se implementa una segunda consulta»). R: reloj, UUID e idempotencia en servidor (B01, B04).

**F-14 (Alta) Los eventos no registran actor.** D: en `anexar`, `crearPaciente`, `consulta`, `gestion_senal`, `informe` no existe campo de usuario; `informes.js` fija `autor: "Dr. Ramón Morillo Verdugo"` y `destino: "Infecciosas (simulado)"`. `RESPONSABLES` son funciones, no personas (`consulta.js:3`). I: sin actor no hay trazabilidad de decisión clínica ni responsabilidad; el autor literal en el informe debe convertirse en el usuario autenticado. R: modelo de actor (id de usuario, pertenencia, función) en todos los eventos (B02, B04).

**F-15 (fortaleza) Semántica temporal y trazabilidad ya modeladas.** D: `fecha` efectiva vs. `registrado`; `aplicable(e, fin)`; informes `temporal: "efectiva-v1"`; correcciones que conservan el original; reimportación idempotente por huella y por identidad de origen; conflictos atómicos (`temporal.js`, `dispensaciones.js`, `confianza.test.mjs`: 14 pruebas). I: es un modelo bitemporal parcial. R: formalizarlo como contrato de dominio (fecha efectiva, fecha de conocimiento) en el esquema V2.

**F-16 (Media) Nivel CMO por defecto «3».** D: `crearPaciente(db, nivel = "3", fechaNivel)` (`almacen.js:21`); `motor.nivel(p)` devuelve `"3"` si no hay evento (`motor.js:86-88`, función sin llamadores en `src/`). `docs/CONFIANZA_DATOS.md` afirma «nivel desconocido se muestra sin dato, no se infiere nivel 3» (la vista usa `nivelHasta`, que devuelve `null`; confirmado por `temporal.js`). I: contradicción entre documentación y valor por defecto de creación; el nivel 3 es el de menor intensidad de seguimiento, de modo que un valor por defecto subestima. R: exigir nivel explícito o permitir «sin estratificar»; eliminar código muerto (A06).

**F-17 (Media) Sin esquema formal ni manifiesto de exportación.** D: `descargar({ ...db, reglas }, "vihconectados-demo.json")` (`app.js:630-631`) exporta la base completa sin firma/hash ni JSON Schema; los informes JSON incluyen todo el historial. I: un fichero exportado no es verificable ni mínimo (minimización RGPD). R: manifiesto con versión de esquema y hash; exportaciones por finalidad (A09).

### Área 5 — Señales de alerta y triangulación de fuentes

**F-18 (Alta) Cinco reglas, dos fuentes.** D: `cobertura_demo`, `datos_fuera_episodio`, `experiencia_referida`, `sin_datos`, `tar_inyectable_no_evaluable` (`motor.js:209-267`). La regla de experiencia se activa si barrera, dificultad o efecto no son «No explorada/Sin…» (`motor.js:240-256`); `carga` y `preferencia` no intervienen. La valoración manual de adherencia «no genera umbrales, alertas ni diagnósticos» por diseño (`registro-manual.js`). I: hoy no hay triangulación; la discordancia entre «PDC alto» y «dificultades referidas» (o viceversa) no se explota como señal. El valor diferencial de VIHconectados estará precisamente en combinar fuentes con procedencia y nivel de confianza. R: modelo de evidencia + reglas de concordancia/discordancia (A15), tras definir fuentes disponibles (B06/B10).

**F-19 (fortaleza) Gestión de señales con evidencia canónica.** D: `evaluarSenales` calcula `evidencia` (JSON canónico de reglas, intervalo, detalle, suministros, correcciones, visita) y `reabierta` si la evidencia cambia; `validarGestionSenal` exige motivo (≤300) y actuación válida. I: evita «cerrar para siempre» una señal cuyo fundamento cambió; buen mecanismo anti-fatiga y de reapertura. Pendiente: la huella es una cadena larga, no un hash, y no incluye una evaluación de severidad. R: hash de evidencia, severidad/prioridad solo tras validación clínica.

**F-20 (Media) Sin priorización ni severidad.** D: `docs/CONSULTA_SEGUIMIENTO.md`: «sin prioridad clínica automática». I: decisión prudente hoy; con volúmenes reales, la bandeja sin priorización generará fatiga de alertas. R: diseñar prioridad por reglas clínicas aprobadas, nunca por IA generativa (`CLINICAL_GOVERNANCE.md`).

### Área 6 — Seguimiento activo entre consultas

**F-21 (Crítica para el objetivo) No existe el componente.** D: no hay cuestionarios, planificador, canal, recordatorios ni respuesta del paciente en `src/`; `EXPERIENCIA` son cinco listas cerradas de 3–5 opciones registradas por un profesional durante una visita (`motor.js:16-42`); `ADHEFAR` solo enlaza recursos (`recursos.js`). I: la «experiencia» actual no es un PROM/PREM validado (el propio `PILOTO.md` lo reconoce); el valor de LOLA/TUCUVI está precisamente en la capa que aquí falta. R: motor declarativo de cuestionarios con ramificación y reglas de escalado, sin IA, desacoplado del canal (A14).

### Área 7 — Modelo CMO, intervenciones, objetivos y reevaluación

**F-22 (fortaleza) Ciclo plan–actuación–seguimiento–cierre.** D: `consulta.js` (`validarConsulta`, `validarSeguimiento`, `estadoConsulta`, `agendaConsultas`), 7 pruebas en `consulta.test.mjs`; resultado del objetivo (`RESULTADOS`) separado de la ejecución de la actuación. I: cubre la fase «intervención y reevaluación» con trazabilidad.

**F-23 (Alta) CMO reducido a un entero 1–3.** D: `nivel` ∈ {"1","2","3"} (`almacen.js:140-141`); no hay registro de Capacidad, Motivación ni Oportunidad por separado; `PROBLEMAS` (6 categorías) no se mapean a dimensiones; la biblioteca se ofrece como texto opcional (`datos/biblioteca-vih.json`). I: **conforme a la comprobación metodológica CMO, un sistema que solo trabaja un nivel agregado, sin dimensiones, es una estratificación incompleta y debe presentarse como tal**. Además, no hay datos de validación del modelo CMO en VIH aportados al repositorio: es hipótesis de trabajo, no modelo validado `[DATO PENDIENTE]`. R: modelar las tres dimensiones con instrumentos/criterios aprobados por el equipo MAPEX (el usuario debe aportar la rejilla de puntuación; no se inventa) (A16).

**F-24 (Media) Biblioteca CMO con discrepancia conocida.** D: `datos/biblioteca-vih.json` es acumulativa por nivel (commit `c963da9` de `cmo-vih-app`) con `intervenciones_nivel_propio`; `PILOTO.md`: discrepancia pendiente y anclas no comprobadas contra el PDF SEFH; `guia-vih.json` conserva `huella_pdf`. I: aceptable como texto de apoyo, no como regla. R: revisión clínica y cotejo con la fuente antes de uso (CLINICAL_GOVERNANCE).

**F-25 (Media) Objetivos sin indicador.** D: `objetivo` es texto libre ≤500 (`consulta.js:6,12`); la reevaluación es un resultado categórico manual. No hay evento «cambio de nivel con motivo» ni regla de reestratificación. I: no se puede medir de forma agregada qué objetivos se logran ni evaluar el impacto CMO. R: objetivos con tipo/indicador/valor meta opcionales y evento de cambio de nivel con motivo (B16).

### Área 8 — Coordinación Farmacia, Infecciosas y Enfermería

**F-26 (Alta) Enfermería ausente; coordinación simulada.** D: `RESPONSABLES = ['Farmacia Hospitalaria', 'Infecciosas', 'Equipo compartido']` (`consulta.js:3`); `ROLES_PREVISTOS = ['farmacia','infecciosas','gestor_hospital']` (`acceso.js`); estados de comunicación `pendiente→comunicado→recibido→valorado→resuelto` con botón de simulación y texto «No se envía nada» (`motor.js:43-49`, README). I: la coordinación es un registro manual unilateral; no existen acuse del destinatario, asignación a persona, plazos ni bandeja por rol. R: rol Enfermería y matriz de permisos definidos junto con los tres servicios (A17) y modelo de tareas con asignación, acuse y escalado (B11).

### Área 9 — Backend institucional

**F-27 (Crítica para el objetivo; bien diseñada en papel).** D: `acceso.js` solo contiene `AccesoDemostracion` (contexto sin usuario/hospital/roles, `iniciarSesion` rechazado) y el contrato; `docs/ACCESO_HOSPITALARIO.md` define pertenencias, SSO/OIDC, RBAC, `hospital_id` obligatorio con restricciones compuestas, auditoría y cinco pruebas de aceptación. `docs/PILOTO.md` lista 9 condiciones previas. I: el diseño es sólido y honesto (no simula seguridad); falta toda la implementación. El puerto actual `leer()/guardar(db)` entrega la base completa y **no es válido como contrato servidor** (el propio documento lo reconoce: «reemplazar localStorage por una API no basta»). R: contrato por comandos (A07/B01).

### Área 10 — HL7 FHIR e integración

**F-28 (Alta) Sin FHIR ni integración.** D: no hay código FHIR; `PILOTO.md` propone `Patient/MedicationRequest/MedicationDispense/CarePlan/Communication` «según perfiles acordados»; `AUDITORIA.md`: «No FHIR validado». I: la pregunta previa no es técnica sino de fuentes: qué sistema de farmacia y de historia clínica tiene el centro y qué interfaces expone `[DATO PENDIENTE: el usuario/centro debe aportarlo]`. R: mapeo documentado de eventos → recursos y validación con herramientas abiertas antes de cualquier conexión (A16).

### Área 11 — Lógica clínica, automatizaciones e IA generativa

**F-29 (fortaleza) Separación implícita, no formalizada.** D: ninguna llamada a LLM ni analítica en `src/` (búsqueda textual); el motor es determinista y explicable (`alertas` genera texto con numerador/denominador y versión); `legal.js` declara ausencia de IA generativa y analítica. I: es una línea base excelente que conviene **blindar como regla de arquitectura** antes de añadir canal conversacional. R: política de tres niveles (clínico determinista / automatización / IA asistiva) y control de cambios (TARGET_ARCHITECTURE_V2 §4; CLINICAL_GOVERNANCE).

### Área 12 — Finalidad prevista, MDR, privacidad, riesgos y supervisión humana

**F-30 (Alta) Finalidad prevista no definida formalmente.** D: textos de uso («apoyo a revisión profesional», «uso institucional, docente y científico, no comercial») en `README.md` y `legal.js`; `REGLAS.validacion`; avisos «No validado para uso clínico» en informes. No hay declaración de finalidad prevista, clasificación ni gestión de riesgos. I: mientras el sistema calcule señales para decidir seguimiento clínico, la cualificación regulatoria depende de la finalidad prevista que se declare, no de cómo se la llame. Véase `REGULATORY_READINESS.md`. R: redactar y aprobar la finalidad prevista como primera actuación (backlog A01).

**F-31 (Media) Privacidad: buenas prácticas en la demo, sin marco para datos reales.** D: sin cookies ni analítica; CIMA recibe solo texto de búsqueda/nº de registro (`cima.js`); entradas libres (`objetivo`, `observaciones`, `motivo`, `instrucciones`) limitadas por longitud y etiquetadas «sintético»; ficheros descargados quedan fuera de control. I: los campos de texto libre son el principal vector de datos personales accidentales en un entorno real. R: política de texto libre (minimización, detección, retención) en la EIPD (C03).

### Área 13 — Estrategia de pruebas y validación

**F-32 (Media) Pruebas de software sólidas, sin oráculo independiente.** D: 55 pruebas unitarias superadas; cubren aritmética de PDC, cortes, deduplicación, correcciones, escape HTML, transiciones y flujos de consulta. `docs/VALIDACION.md` reconoce paridad con la calculadora de referencia (13 pruebas) y que «paridad ≠ validación». I: el implementador y el autor de las pruebas son el mismo; no existe un corpus de casos con resultados calculados por otra vía. R: corpus dorado y comprobación independiente del PDC (A04).

**F-33 (Media) Sin cobertura de código ni pruebas de seguridad automatizadas.** D: sin medición de cobertura, SAST ni auditoría de dependencias en CI; XSS: pruebas de escape en `desktop.test.mjs`/`cima-informes.test.mjs`. I: adecuado para demo. R: modelo de amenazas y pruebas de autorización cuando exista backend (A10, B).

**F-34 (Baja) Deriva documental.** D: `docs/VALIDACION.md` termina en v0.3.0 con «26 pruebas» (hoy 55); `docs/PILOTO.md` aún dice «Solo se admite TAR oral con un episodio activo» cuando ya se registran TAR intramusculares (`REGISTRO_MANUAL.md`); el README inicial describe «Fase 1». I: riesgo de que revisores o centros lean información obsoleta. R: matriz de trazabilidad con versiones (A02).

### Área 14 — Reutilización de HIV Prescribing Cascade Auditor, CambiosTAR, RXplain, MAPEX-ADHEFAR Hub

**F-35 (D) Lo que consta en este repositorio:**
- **preparadorconsulta** (commit `42402cb`): fuente auditada de funciones de PDC/fechas, datos de biblioteca y guion; sin `LICENSE`; el propio `docs/AUDITORIA.md` indica «no se presume licencia abierta».
- **cmo-vih-app** (commit `c963da9`): origen de `datos/biblioteca-vih.json`.
- **MAPEX-ADHEFAR Hub** (commit `8750436e`): solo enlazado en `src/recursos.js` y textos de `legal.js`; «no se importó su código» (`VALIDACION.md`).
- **HIV Prescribing Cascade Auditor, CambiosTAR, RXplain**: **sin ninguna mención**. No es posible evaluar qué componentes son reutilizables, ni su licencia, titularidad ni calidad.

**I.** Cualquier propuesta de reutilización de los tres primeros sería especulativa. **R.** Ver `TARGET_ARCHITECTURE_V2.md` §8 (marco de reutilización) y la lista de datos mínimos que se necesitan del usuario (§6 de este documento).

---

## 5. Discrepancias entre documentación y código

| Declaración | Realidad observada | Gravedad |
|---|---|---|
| «Nivel desconocido… no se infiere nivel 3» (`CONFIANZA_DATOS.md`) | `crearPaciente(db, nivel="3")` asigna 3 por defecto (`almacen.js:21`) | Media |
| «Solo se admite TAR oral» (`PILOTO.md`) | Se registran TAR intramusculares (`REGISTRO_MANUAL.md`, `cima.js`) | Baja |
| «26 pruebas» (`VALIDACION.md`) | 55 pruebas actuales | Baja |
| «Validar también IDs… y cada comando» (`ACCESO_HOSPITALARIO.md`, requisito para el futuro servidor) | `anexar` acepta sin validar cinco tipos de evento (F-12); es un requisito futuro, no una afirmación sobre el código actual | Alta (para backend) |
| Nombre de «Fase 1 · v0.3.0» | Cuatro incrementos posteriores (0.3.x) sin cambio de versión (`VERSION = "0.3.0"` en `motor.js:4`) | Baja |

---

## 6. Información mínima que necesito del usuario (solo la imprescindible)

1. **Finalidad prevista deseada para 2.0** (¿apoyo organizativo/logístico, apoyo a la decisión clínica, seguimiento automatizado del paciente?). Determina la ruta regulatoria (`REGULATORY_READINESS.md`).
2. **Rejilla/criterios CMO en VIH** que el equipo MAPEX considere vigentes y su situación de validación. Sin ellos no se modelan las dimensiones C/M/O.
3. **Estado de los proyectos hermanos** (HIV Prescribing Cascade Auditor, CambiosTAR, RXplain): repositorio, titularidad de derechos y licencia. Sin esto, la reutilización queda como marco, no como plan.
4. **Sistemas del centro piloto** (farmacia, historia clínica, laboratorio) y existencia de un sponsor institucional. Condiciona FHIR e infraestructura.
5. **Visibilidad del repositorio** (público/privado) para decidir CI gratuito y licencia.
