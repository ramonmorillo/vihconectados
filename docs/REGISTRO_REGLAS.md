# Registro de reglas clínicas versionado (actuación A03)

Estado: implementado en `src/reglas.js`. **Ninguna regla está validada clínicamente**; el registro hace explícito y verificable ese estado, no lo cambia. La gobernanza prevista (comité clínico, aprobación, revisor independiente) está en `docs/strategy/CLINICAL_GOVERNANCE.md`.

## Qué contiene

Una ficha por regla y versión: `id`, `version`, `tipo` (`metrica` o `senal`), `vigente_desde/hasta`, `descripcion`, `fuente`, `estado_validacion`, `parametros` (valor, unidad, mínimo y máximo), `poblacion`, `exclusiones`, `riesgos` y `aprobacion` (comité, revisor independiente, fecha y acta).

| Regla | Tipo | Parámetros | Estado |
|---|---|---|---|
| `pdc_oral` | métrica | ventana 180 días (1–730) | Pendiente de validación profesional |
| `cobertura_demo` | señal | umbral 0,9 (0–1) | Pendiente de validación profesional |
| `datos_fuera_episodio` | señal | — | Pendiente de validación profesional |
| `experiencia_referida` | señal | — | Pendiente de validación profesional |
| `sin_datos` | señal | — | Pendiente de validación profesional |
| `tar_inyectable_no_evaluable` | señal | — | Pendiente de validación profesional |

La ventana y el umbral son los mismos valores que antes (heredados de `preparadorconsulta`, véase `docs/AUDITORIA.md`): A03 no cambia ningún valor ni comportamiento de cálculo. Su justificación clínica sigue sin existir en este repositorio `[REQUIERE REFERENCIA]`.

## Garantías que verifican las pruebas (`pruebas/registro-reglas.test.mjs`)

- **Una ficha no se edita para cambiar un parámetro.** Los valores de cada `regla@versión` están fijados en la prueba: editarlos sin cambiar de versión la hace fallar.
- **No se puede declarar validación sin aprobación.** `validarRegistro` rechaza cualquier estado superior a «Pendiente» sin comité, revisor independiente, fecha y acta. Se ejecuta al cargar el módulo.
- Una única versión vigente por regla; sin fichas duplicadas; parámetros dentro de su rango; el conjunto (`conjunto.incluye`) coincide con las versiones vigentes.
- El registro está congelado en profundidad.
- Toda señal emitida tiene ficha: `regla` (id), `version` y `estado` proceden del registro. Si faltara una ficha, la señal indica «Sin ficha de regla; no validada» y la prueba falla.
- El conjunto de parámetros histórico `{version, ventana, umbral, validacion}` conserva exactamente su forma y orden, porque forma parte de la huella de evidencia de las señales ya gestionadas: cambiarla las reabriría todas.

## Cómo cambiar un parámetro o una regla

1. Cerrar la ficha vigente (`vigente_hasta`) y **añadir una ficha nueva** con otra versión; actualizar `conjunto.version` y `conjunto.incluye`.
2. Añadir la línea de la nueva versión en `PARAMETROS_FIJADOS` de la prueba.
3. Cambiar `estado_validacion` solo si el comité aprobó la regla: rellenar `aprobacion` con comité, revisor independiente, fecha y acta.
4. Revisar el corpus dorado (`pruebas/corpus-dorado/`) y registrar el cambio como control de cambios (`CLINICAL_GOVERNANCE.md` §4).

## Informes

Cada informe nuevo incluye `reglas_aplicadas` (copias de id, versión, tipo y estado de cada regla vigente en ese momento), de modo que un informe conserva las versiones con las que se emitió aunque el registro evolucione. El texto para historia clínica lista cada regla; la hoja impresa muestra un resumen agrupado por versión y estado (el informe breve debe seguir cabiendo en una página A4). Los informes anteriores a A03 no tienen el campo y siguen mostrándose igual.

## Parámetros elegidos por el usuario (Modelo y reglas)

Antes, el diálogo asignaba la versión `demo-local-<marca de tiempo>`: la misma ventana y umbral producían versiones distintas cada vez. Ahora:

- Con los valores vigentes se usa el conjunto del registro.
- Con otros valores, la versión es determinista, p. ej. `demo-1+mod(ventana=90;umbral=0.8)`, y el estado pasa a **«Parámetros modificados por el usuario; sin validación»** para las reglas con parámetros (`pdc_oral`, `cobertura_demo`); las demás conservan su estado.
- Una sesión guardada con la versión antigua se normaliza al cargar. Las gestiones de señal hechas bajo una versión `demo-local-…` pueden volver a figurar como pendientes si se vuelven a ver con esos parámetros: es el comportamiento previsto cuando cambia la evidencia.

La pestaña «Modelo y reglas» muestra la tabla del registro con versión y estado.

## Por qué un módulo JavaScript y no un fichero JSON

El motor necesita las reglas de forma síncrona en el navegador y en las pruebas de Node. Cargar un JSON habría exigido `fetch` asíncrono o atributos de importación JSON, con riesgo de compatibilidad. Un módulo de datos puro (`src/reglas.js`, sin dependencias) es servido por el servidor existente sin cambios. Si en la arquitectura V2 el registro pasa a ser un recurso de servidor, el esquema de ficha se conserva.

## Límites

- El registro documenta las reglas; no las valida ni sustituye la aprobación clínica.
- `descripcion`, `fuente`, `poblacion`, `exclusiones` y `riesgos` los redactó el auditor a partir del código y de la documentación: **el comité debe revisarlos**.
- La regla `tar_inyectable_no_evaluable` refleja una decisión de seguridad de A06 pendiente de confirmación por el comité.
