# TRACEABILITY_MATRIX — Matriz de trazabilidad (actuación A02)

| | |
|---|---|
| Estado | Documento de trabajo. Describe **qué existe** y **qué lo verifica**; no certifica nada |
| Fecha | 2026-11-26 (commit de partida de la auditoría: `1208ef4`) |
| Para qué sirve | Que cualquier afirmación del tipo «esto está implementado» pueda seguirse hasta el código, la prueba que lo comprueba y el riesgo que cubre |
| Cómo se mantiene | `pruebas/trazabilidad.test.mjs` falla si un módulo de `src/` o una prueba no figura aquí, si una referencia no existe, o si una capacidad «implementada» no tiene módulo y prueba |

**Estados** (más finos que los de `CURRENT_STATE_AUDIT.md`): **IMPLEMENTADO** · **PARCIAL** · **SIMULADO** (la interfaz existe, el efecto no) · **ESPECIFICADO** (hay especificación y esquema ejecutable, **sin motor** y sin aprobar) · **PENDIENTE** (no existe).

**Lectura honesta:** «implementado» significa que el código existe y que las pruebas que se citan lo comprueban. **No** significa validado clínicamente: ninguna regla lo está (`REGISTRO_REGLAS.md`).

---

## 1. Matriz

| ID | Capacidad | Estado hoy | Módulos | Pruebas | Riesgos | Backlog |
|---|---|---|---|---|---|---|
| CAP-01 | Cobertura de dispensación del TAR oral (PDC) | IMPLEMENTADO (parámetros sin validar) | `src/motor.js`, `src/reglas.js` | `pruebas/motor.test.mjs`, `pruebas/corpus-dorado.test.mjs`, `pruebas/registro-reglas.test.mjs`, `pruebas/navegador.mjs` | R03, R04 | A03, A04 |
| CAP-02 | Episodios de TAR y corte por cambio de régimen | IMPLEMENTADO | `src/motor.js`, `src/almacen.js` | `pruebas/motor.test.mjs`, `pruebas/corpus-dorado.test.mjs` | R04, R12 | A04 |
| CAP-03 | Dispensaciones: CSV, entrada manual, deduplicación, conciliación y correcciones | IMPLEMENTADO | `src/dispensaciones.js`, `src/conciliacion.js`, `src/revision-datos.js`, `src/registro-manual.js` | `pruebas/confianza.test.mjs`, `pruebas/conciliacion.test.mjs`, `pruebas/motor.test.mjs`, `pruebas/confianza.mjs`, `pruebas/registro-manual.mjs` | R22 | A07 |
| CAP-04 | Procedencia, semántica temporal y trazabilidad por eventos | PARCIAL (sin actor ni reloj de servidor) | `src/temporal.js`, `src/esquemas-eventos.js`, `src/migraciones.js` | `pruebas/esquemas-eventos.test.mjs`, `pruebas/confianza.test.mjs`, `pruebas/esquemas.mjs` | R14, R20, R21 | A08, B04 |
| CAP-05 | TAR de acción prolongada | PARCIAL (visible como «no monitorizado»; especificado, sin motor) | `src/motor.js`, `src/cima.js`, `src/seleccion-tar.js` | `pruebas/seguridad-clinica.test.mjs`, `pruebas/corpus-la-tar.test.mjs`, `pruebas/registro-manual.test.mjs`, `pruebas/registro-manual.mjs` | R01 | A06, A13, B08 |
| CAP-06 | Señales de alerta | IMPLEMENTADO (umbral sin validar) | `src/senales.js`, `src/motor.js` | `pruebas/confianza.test.mjs`, `pruebas/seguridad-clinica.test.mjs`, `pruebas/registro-reglas.test.mjs` | R03, R08 | A03, A06 |
| CAP-07 | Gestión de señales (huella de evidencia y reapertura) | IMPLEMENTADO | `src/senales.js`, `src/eventos-formulario.js` | `pruebas/confianza.test.mjs`, `pruebas/conciliacion.test.mjs`, `pruebas/confianza.mjs` | R08 | A07 |
| CAP-08 | Triangulación de fuentes y modelo de evidencia | ESPECIFICADO (sin motor, no conectado) | `src/esquema-evidencia.js` | `pruebas/evidencia.test.mjs` | R02, R36, R37, R38 | A15, B09 |
| CAP-09 | Experiencia del paciente (cinco dominios cerrados) | PARCIAL (no es un PROM/PREM validado) | `src/motor.js` | `pruebas/motor.test.mjs`, `pruebas/publico.test.mjs` | R06 | A19 |
| CAP-10 | Valoración manual de adherencia (declarativa, sin efecto sobre el PDC) | IMPLEMENTADO | `src/adherencia.js`, `src/registro-manual.js`, `src/eventos-formulario.js` | `pruebas/registro-manual.test.mjs`, `pruebas/conciliacion.test.mjs` | R02 | A19 |
| CAP-11 | Cuestionarios declarativos y reglas de escalado | ESPECIFICADO (sin motor ni canal; ninguno activable) | `src/esquema-cuestionario.js` | `pruebas/cuestionarios.test.mjs` | R09, R39, R40, R41 | A14, B12, B13 |
| CAP-12 | Nivel CMO (asignación manual) | SIMULADO (sin las dimensiones C/M/O) | `src/almacen.js` | `pruebas/seguridad-clinica.test.mjs`, `pruebas/publico.test.mjs` | R05 | A16, B16 |
| CAP-13 | Intervenciones CMO y actuaciones | PARCIAL (biblioteca literal con discrepancia declarada) | `src/consulta.js`, `src/vista-consulta.js`, `datos/biblioteca-vih.json` | `pruebas/consulta.test.mjs`, `pruebas/consulta.mjs` | R06 | A16 |
| CAP-14 | Plan, objetivo, seguimiento y cierre | IMPLEMENTADO (objetivo en texto libre) | `src/consulta.js`, `src/comandos-consulta.js` | `pruebas/consulta.test.mjs`, `pruebas/consulta.mjs` | R07 | B16 |
| CAP-15 | Reestratificación con motivo | PENDIENTE | — | — | R05 | B16 |
| CAP-16 | Coordinación Farmacia–Infecciosas (estados simulados) | SIMULADO | `src/informes.js`, `src/motor.js` | `pruebas/motor.test.mjs`, `pruebas/cima-informes.test.mjs` | R08 | B11 |
| CAP-17 | Enfermería como actor y matriz de permisos | PENDIENTE | — | — | R21 | A17, B11 |
| CAP-18 | Autenticación, roles y aislamiento multicéntrico | PENDIENTE (contrato y diseño) | `src/acceso.js` | `pruebas/publico.test.mjs`, `pruebas/publico.mjs` | R17 | B02, B03 |
| CAP-19 | Persistencia y puerto de repositorio por comandos | PARCIAL (en el navegador; sin servidor) | `src/comandos.js`, `src/repositorio.js`, `src/almacen.js` | `pruebas/comandos.test.mjs`, `pruebas/motor.test.mjs`, `pruebas/navegador.mjs` | R13, R15, R16 | A07, B01, B05 |
| CAP-20 | Interoperabilidad HL7 FHIR | ESPECIFICADO (mapeo documental y 4 ejemplos; sin código; validación oficial NO ejecutada) | `docs/strategy/FHIR_MAPPING.md` | `pruebas/fhir.test.mjs` | R25 | A12, B15 |
| CAP-21 | Informes profesional y de paciente (instantánea congelada) | IMPLEMENTADO | `src/informes.js`, `src/vista-informes.js` | `pruebas/cima-informes.test.mjs`, `pruebas/motor.test.mjs`, `pruebas/navegador.mjs` | R19 | A09 |
| CAP-22 | Catálogo CIMA y selección del TAR | PARCIAL (acceso en vivo no verificado) | `src/cima.js`, `src/medicacion.js`, `src/seleccion-tar.js` | `pruebas/cima-informes.test.mjs`, `pruebas/conciliacion.test.mjs`, `pruebas/registro-manual.mjs` | R25, R26 | A07 |
| CAP-23 | Ausencia de IA generativa en la ruta clínica | AUSENTE por diseño (sin prueba automática que lo garantice) | `src/legal.js` | `pruebas/arquitectura.test.mjs` | R10 | A21 |
| CAP-24 | Gestión de riesgos, calidad y expediente regulatorio | PENDIENTE (solo documentos de planificación) | `docs/strategy/REGULATORY_READINESS.md`, `docs/strategy/RISK_REGISTER.md` | — | R27, R28 | A01, C01, C02 |
| CAP-25 | Registro de reglas clínicas versionado | IMPLEMENTADO (ninguna regla validada) | `src/reglas.js` | `pruebas/registro-reglas.test.mjs`, `pruebas/reglas.mjs` | R03 | A03 |
| CAP-26 | Esquemas cerrados de evento y migración de formato | IMPLEMENTADO | `src/esquemas-eventos.js`, `src/migraciones.js` | `pruebas/esquemas-eventos.test.mjs`, `pruebas/esquemas.mjs` | R14 | A08 |
| CAP-27 | Regla de capas dominio/interfaz | IMPLEMENTADO | `src/conciliacion.js`, `src/eventos-formulario.js` | `pruebas/arquitectura.test.mjs` | R14 | A07 |
| CAP-28 | Cohorte de demostración y actualización aditiva | IMPLEMENTADO | `src/demo.js` | `pruebas/publico.test.mjs`, `pruebas/publico.mjs` | R13 | A07 |
| CAP-29 | Interfaz, portada, información legal y estación de seguimiento | IMPLEMENTADO | `src/app.js`, `src/desktop.js`, `src/portada.js`, `src/legal.js` | `pruebas/desktop.test.mjs`, `pruebas/desktop.mjs`, `pruebas/publico.mjs`, `pruebas/navegador.mjs` | R24 | A18 |
| CAP-30 | Recursos externos (MAPEX-ADHEFAR Hub) | IMPLEMENTADO (solo enlace y atribución) | `src/recursos.js` | `pruebas/publico.test.mjs` | R29 | A11 |
| CAP-31 | Gobernanza de decisiones abiertas | IMPLEMENTADO (registro; ninguna decisión resuelta) | `docs/strategy/DECISIONS_REGISTER.md` | `pruebas/decisiones.test.mjs` | R27, R30 | A01 |
| CAP-32 | Trazabilidad entre capacidades, código y pruebas | IMPLEMENTADO | `docs/strategy/TRACEABILITY_MATRIX.md` | `pruebas/trazabilidad.test.mjs` | R33 | A02 |
| CAP-33 | Integración continua y ausencia de dependencias de ejecución | IMPLEMENTADO (el flujo existe; su ejecución en GitHub no se ha podido comprobar desde esta sesión) | `.github/workflows/ci.yml` | `pruebas/ci.test.mjs` | R33 | A05 |
| CAP-34 | Manifiesto con hash y exportación mínima de informes | IMPLEMENTADO (el hash detecta alteración accidental; no es una firma) | `src/exportacion.js` | `pruebas/exportacion.test.mjs`, `pruebas/navegador.mjs` | R19 | A09 |

---

## 2. Cómo leer los vacíos

- **PENDIENTE sin módulo ni prueba** (CAP-15, CAP-17): son las brechas reales. No hay nada que verificar porque no existe.
- **ESPECIFICADO** (CAP-08, CAP-11, CAP-20): hay un esquema o un mapeo con ejemplos, pero **ningún motor**; las pruebas comprueban coherencia interna, no un comportamiento del sistema. En CAP-20 ni siquiera se ha ejecutado el validador oficial de FHIR.
- **CAP-23** es la única afirmación **negativa** («no hay IA»): se sostiene por inspección del código y por la regla de capas, pero **no hay una prueba específica** que falle si alguien añade una llamada a un modelo. La prevé A21.
- **«Pruebas»** incluye los guiones de navegador (`.mjs` sin `.test`), que no se ejecutan con `npm test` sino con `npm run test:browser`.

## 3. Qué tiene que ocurrir para que una capacidad pase a «validada»

Ninguna fila lo está. Para que lo sea hacen falta, como mínimo: aprobación del comité de sus reglas (`DECISIONS_REGISTER.md`), el corpus dorado revisado por un segundo profesional, y la evidencia que fije la finalidad prevista (`INTENDED_PURPOSE_DECISION.md`, `VALIDATION_MASTER_PLAN.md`).
