# Corpus dorado de PDC (actuación A04)

Casos sintéticos con **resultado esperado deducido a mano** de la definición operativa (`pdc.json`, campo `definicion`), usados para verificar `src/motor.js` con un criterio distinto al de las pruebas escritas por su implementador. Ejecución: `npm test` (`pruebas/corpus-dorado.test.mjs`).

## Estado de la revisión

| Criterio de aceptación de A04 | Estado |
|---|---|
| Al menos un caso por familia de `docs/strategy/VALIDATION_MASTER_PLAN.md` §2.1 | **Cumplido** para 7 de 8 familias (26 casos). **LA-TAR queda pendiente** de la especificación clínica A13: no se inventan ventanas |
| Resultados esperados fijados antes de ejecutar el motor | **Cumplido** por el autor del corpus: se escribieron en `pdc.json` con su razonamiento y solo después se ejecutó el motor. No hubo ninguna discrepancia que corregir |
| **Firmados por un segundo revisor independiente** | **PENDIENTE.** El autor del corpus conocía `motor.js`; no es un oráculo independiente en sentido estricto. Hasta que firme un segundo profesional, el corpus es *propuesto*, no *validado* |
| Se ejecuta con `npm test` | Cumplido |
| Discrepancias registradas con decisión del CCR | Sin discrepancias hasta la fecha |

## Familia LA-TAR

Los casos de TAR de acción prolongada están en `la-tar.json` (25 casos propuestos, calculados a mano desde las fichas técnicas de Vocabria y Rekambys). **No tienen ejecutor**: el módulo LA-TAR no existe (B08). `pruebas/corpus-la-tar.test.mjs` solo comprueba la coherencia de los esperados con una aritmética de calendario independiente. Requieren la misma revisión independiente y la aprobación del comité (`docs/strategy/LA_TAR_CLINICAL_SPEC.md`).

## Qué demuestra y qué no

- **Demuestra** que, para estos 26 escenarios, el motor devuelve exactamente lo que dice la definición operativa escrita, y que un segundo algoritmo (simulación de stock día a día) coincide con el cálculo manual.
- **Demuestra** que el corpus detecta defectos reales: se introdujeron mutaciones en una copia del motor y se comprobó que las pruebas fallan.

| Mutación en el motor (copia, no en el repositorio) | Casos que fallan |
|---|---|
| Sin arrastre de sobrante | 2 |
| Suma de componentes en lugar de intersección | 2 |
| PDC `null` sustituido por 0 | 3 |
| Ventana con un día menos | 20 |
| Corte inclusivo (el día de corte cuenta) | 17 |
| El episodio no se corta en el siguiente TAR | 4 |
| Dispensación del día de corte `<` → `<=` | 0 — **mutante equivalente**: ese suministro empieza en el corte y el bucle solo recorre días anteriores, por lo que no cambia ningún resultado observable. No es una laguna |

- **No demuestra** que 180 días, 0,9 o la definición de PDC sean clínicamente adecuados: eso es validación clínica (`VALIDATION_MASTER_PLAN.md`), no analítica.
- **No cubre** ingresos, interrupciones, farmacia externa, dosis ni LA-TAR (el motor no los modela).

## Cómo debe revisarlo el segundo revisor (hoja de revisión)

1. **No lea `src/motor.js` ni `pruebas/corpus-dorado.test.mjs` antes de revisar.** Lea solo el campo `definicion` de `pdc.json`.
2. Para cada caso, calcule `cubiertos` y `total` (y `excluidos`) a partir de `pasos`, `corte` y `ventana`, p. ej. en una hoja de cálculo, sin mirar `esperado` ni `razonamiento`.
3. Compare con `esperado`. Anote cada discrepancia en la tabla; no corrija el JSON ni el motor hasta que el CCR decida cuál de los dos tiene razón.
4. Valore también si la **definición operativa** es la que el CCR quiere (denominador, arrastre, exclusiones). El corpus solo verifica coherencia con ella.

| Caso | Calculado por el revisor (cubiertos/total) | ¿Coincide? | Observaciones |
|---|---|---|---|
| G01 … K02 | | | |

Revisor: `[DATO PENDIENTE]` · Fecha: `[DATO PENDIENTE]` · Firma: `[DATO PENDIENTE]`

## Cómo añadir un caso

1. Escriba primero `esperado` y `razonamiento` a partir de la definición, **antes** de ejecutar el motor.
2. Complete `pasos` (flujo real de comandos), `efectivas` (dispensaciones vigentes tras duplicados y correcciones, para el oráculo secundario) y `senales`.
3. Ejecute `npm test`. Si el motor discrepa, no ajuste el esperado para que pase: abra una discrepancia (`docs/strategy/CLINICAL_GOVERNANCE.md` §4).
4. Un cambio de parámetros o de definición clínica exige nueva versión de regla (A03) y revisión del corpus.
