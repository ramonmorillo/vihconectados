# FHIR_MAPPING — Mapeo de eventos a HL7 FHIR (actuación A12)

| | |
|---|---|
| Estado | **BORRADOR DOCUMENTAL.** No hay código FHIR ni API. Nada de lo que sigue está aprobado ni validado oficialmente |
| Fecha | 2026-11-26 |
| Versión FHIR supuesta | R4 (4.0.1) `[VERIFICAR con el centro: versión y guía de implementación nacional que usen sus sistemas]` |
| Qué se ha comprobado | Solo coherencia estructural local de 4 ejemplos sintéticos (`pruebas/fhir.test.mjs`). **No** se ha ejecutado el validador oficial (§6) |
| Qué NO se afirma | Conformidad con ningún perfil, guía nacional ni terminología. No hay interoperabilidad probada |

**Lectura:** esto es una **propuesta de proyección** del modelo interno (eventos, `docs/ESQUEMAS_EVENTOS.md`) a recursos FHIR, siguiendo el principio P8 de `TARGET_ARCHITECTURE_V2.md` («el modelo canónico interno se proyecta a FHIR»). Que un campo «se pueda» mapear no significa que deba intercambiarse: eso depende de la finalidad prevista (D-G05) y de la EIPD.

---

## 1. Dato objetivo / interpretación / recomendación

| Tipo | Contenido |
|---|---|
| **Dato objetivo** | Los 16 tipos de evento existen y tienen esquema cerrado (`src/esquemas-eventos.js`). No existe ninguna proyección a FHIR en el código. Los 4 ejemplos de `pruebas/fhir/` cumplen la cardinalidad mínima de R4 y usan los conjuntos de valores de `status` de R4 |
| **Interpretación** | Los recursos candidatos (§2) son una elección razonable para cada evento, pero varias correspondencias son discutibles y se señalan como tales |
| **Recomendación** | No construir B15 (fachada) hasta conocer las interfaces del centro (D-G03) y validar estos ejemplos con el validador oficial (§6) |

## 2. Tabla evento → recurso

«Encaje»: **directo** (el recurso existe para eso) · **parcial** (hay pérdida o convención propia) · **sin recurso** (no debe exportarse o no tiene equivalente).

| Evento | Recurso candidato | Encaje | Correspondencias principales | Huecos explícitos |
|---|---|---|---|---|
| `tratamiento` | `MedicationRequest` (o `MedicationStatement` si el centro no gestiona la prescripción) | parcial | `fecha`→`authoredOn`; `tar`/`medicamentos`→`medication[x]`; `subject`→`Patient` | `modalidad` (oral/inyectable) no tiene campo propio; `confirmado` (confirmación del profesional) no tiene equivalente directo; el código del medicamento exige terminología `[REQUIERE REFERENCIA: sistema de codificación nacional de medicamentos]` |
| `importacion` (cada fila de `filas`/`entradas`) | `MedicationDispense` | directo | `fecha`→`whenHandedOver`; `dias`→`daysSupply` (UCUM `d`); `componente`→`medication[x]`; `origen`/`id_origen`→`identifier` | **`episodio` no existe en FHIR**: es una construcción interna que delimita el cálculo del PDC. El **PDC no se almacena**: se deriva, y no debe exportarse como dato primario |
| `correccion_dispensacion` | `MedicationDispense` con `status = entered-in-error` y `Provenance` | parcial | `referencia`→el recurso corregido; `sustitucion`→nuevo `MedicationDispense`; `motivo`→`Provenance.reason` | La semántica «evento que corrige a otro sin borrarlo» se reproduce con `Provenance`; requiere convención acordada |
| `evaluacion_adherencia` | `Observation` | parcial | `periodo_*`→`effectivePeriod`; `fecha`→`issued`; `resultado`→`value[x]`; `metodo`→`method` | **No hay código estándar** para «valoración declarativa de adherencia»: se usa un código local (`urn:vihconectados:demo:codigos`). Declarar esto como un instrumento validado sería falso |
| `nivel` (CMO manual) | `Observation` con código local | parcial | `nivel`→`value[x]` | No existe estándar para el nivel CMO; además el repositorio solo modela un nivel 1–3 sin dimensiones C/M/O (CAP-12) |
| `visita` (experiencia) | `Observation` o `QuestionnaireResponse` | parcial | 5 dominios cerrados→componentes | **No es un PROM/PREM validado** (CAP-09): no debe mapearse a códigos de instrumentos validados |
| `consulta` | `Encounter` + `CarePlan` | parcial | `fecha`→`period`; `problema`/`objetivo`→`CarePlan.addresses`/`goal` | La consulta mezcla visita, problema, objetivo y plan en un evento; su descomposición exige decisión del equipo `[DATO PENDIENTE]` |
| `actuacion`, `estado_actuacion`, `seguimiento_consulta` | `CarePlan.activity` o `Task` | parcial | `texto`→`description`; `estado`→`status` | Los estados internos no coinciden con los de FHIR: requiere tabla de correspondencia aprobada |
| `gestion_senal` | `Task` (o `Flag`) más `Provenance` | parcial | `estado`→`status`; `motivo`→`statusReason` | La **huella de evidencia** y la **versión de la regla** (`reglas`) no tienen campo: irían en extensión o `Provenance.entity` |
| `informe`, `informe_paciente` | `DocumentReference` (el contenido congelado como adjunto) o `Composition` | parcial | `fecha`→`date`; `formato`→`content.attachment.contentType` | La **instantánea congelada** (CAP-21) debe viajar íntegra; reconstruirla con recursos sueltos perdería su carácter de copia exacta |
| `estado_comunicacion` | `Communication` / `Task` | parcial | `estado`→`status` | Estados simulados (CAP-16): no representan una comunicación real con otro profesional |
| `revision_alertas`, `configuracion` | — | sin recurso | — | Son estado interno de la aplicación; **no exportar** |

### Transversal

| Aspecto | Propuesta | Hueco |
|---|---|---|
| Paciente | `Patient.identifier` con **seudónimo** únicamente. Sin nombre, fecha de nacimiento ni contacto | La relación seudónimo ↔ historia clínica la gestiona el centro; fuera del alcance |
| Bitemporalidad | `fecha` (efectiva)→`effective[x]`/`whenHandedOver`; `registrado`→`Provenance.recorded` | FHIR no distingue de forma nativa fecha efectiva y de registro en todos los recursos |
| Procedencia y confianza | `Provenance` con fuente y actor | No hay actor identificado en el modelo actual (CAP-04, F-xx): el campo `agent` quedaría vacío `[DATO PENDIENTE]` |
| Señales **no monitorizado** (inyectables) | Sin mapeo | Es una conclusión derivada del sistema, no un hecho clínico: **no debe exportarse como dato** |

## 3. Principios del mapeo

1. **Solo hechos, no conclusiones derivadas.** Se proyectan dispensaciones, tratamientos y valoraciones registradas; no el PDC, las señales ni el nivel calculado.
2. **Nada de terminologías inventadas.** Donde no hay código verificado se usa texto o un sistema local `urn:vihconectados:…`, y se marca como hueco.
3. **Sin datos identificativos.** Solo seudónimo.
4. **Los huecos se declaran.** Un campo sin equivalente se documenta, no se fuerza en un recurso inadecuado.

## 4. Ejemplos sintéticos

En `pruebas/fhir/`: `Patient`, `MedicationRequest`, `MedicationDispense` y `Observation`. Datos inventados, sin persona real. Usan solo sistemas locales y UCUM; el medicamento va como texto.

## 5. Perfiles y terminologías (todos pendientes)

| Elemento | Estado |
|---|---|
| Guía de implementación nacional (España) | `[REQUIERE REFERENCIA]` no verificada |
| Codificación nacional de medicamentos (CIMA/CN) como `CodeableConcept.coding` | `[REQUIERE REFERENCIA]` |
| Código para valoración de adherencia, nivel CMO, experiencia | No existe estándar conocido por el autor `[VERIFICAR]`; se usa código local |
| Código de la carga viral / CD4 (B10) | Fuera de alcance de A12 |

## 6. Validación oficial: PENDIENTE

- **Criterio de aceptación 2 de A12 NO cumplido.** Se descargó el validador oficial de HL7 (`validator_cli.jar`, fuera del repositorio) pero **su ejecución fue bloqueada por el control de permisos de la sesión** y no se ha eludido. El archivo no está verificado por suma de control.
- **Qué hace falta:** que el autor (o quien disponga de entorno controlado) ejecute el validador contra `pruebas/fhir/*.json` con `-version 4.0.1`, anote versión y suma de control del validador, y registre los avisos. Un resultado con **avisos** (no errores) es esperable: los ejemplos no declaran perfiles.
- **Mientras tanto** la afirmación correcta es «los ejemplos cumplen una comprobación estructural local», **no** «validan con HL7».

## 7. Decisiones abiertas que condicionan este documento

D-G03 (centro piloto y sus sistemas) · D-G05 (finalidad prevista: determina qué se intercambia) · D-E09 (minimización de datos) · ADR-9 de `TARGET_ARCHITECTURE_V2.md` (fachada de lectura vs. CSV).
