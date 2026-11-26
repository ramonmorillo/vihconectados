# Esquemas cerrados de eventos, formato de la base y migraciones (actuación A08)

Estado: implementado en `src/esquemas-eventos.js` y `src/migraciones.js`, conectados en `src/almacen.js`. La validación sigue ejecutándose **en el navegador**: es un control de integridad de la demostración, no de seguridad. Un backend institucional debe volver a ejecutarla en el servidor (actuación B01).

## Qué resuelve

La auditoría detectó que `anexar` aceptaba sin validar el contenido cinco tipos de evento y que un `{tipo:"importacion", fuente:"X"}` inutilizaba el cálculo del caso (`TypeError` en `historialDispensaciones`). Ahora:

1. **Todo evento que se anexa tiene un esquema cerrado**: tipo conocido, campos permitidos, campos obligatorios y tipo de dato. Un campo no previsto, un campo obligatorio ausente o un tipo sin esquema se rechazan.
2. **`id` y `registrado` son campos reservados**: los asigna el sistema; un llamador no puede fijarlos.
3. **Las importaciones directas de filas** (antes sin validar) se comprueban contra los episodios, igual que las conciliadas.
4. **La lectura es tolerante**: un evento antiguo malformado ya no bloquea el arranque ni el cálculo; se conserva y se avisa.
5. **El formato de la base está versionado** y `leer()` migra el anterior sin perder nada.

## Qué validan los esquemas y qué no

Validan la **forma**. Los **valores** y las **fechas** siguen validándose en las reglas de negocio de `anexar`, para conservar sus mensajes de error (p. ej. «Nivel inválido», «Fecha no válida», «Experiencia no válida»). Una clave con valor `undefined` equivale a ausente.

Los esquemas exigen solo los campos que las reglas de negocio no comprueban con un mensaje específico. Por eso `seguimiento_consulta` solo exige `consulta` y `fecha`: `validarSeguimiento` revisa antes si el plan ya está cerrado y explica cada campo restante.

| Tipo | Obligatorios | Otros campos permitidos |
|---|---|---|
| `nivel` | `nivel` | `fecha` |
| `tratamiento` | `fecha`, `tar` | `medicamentos`, `modalidad`, `confirmado` |
| `visita` | `fecha`, `experiencia` (objeto cerrado: barrera, dificultad, efecto, carga, preferencia) | — |
| `consulta` | `fecha`, `problema`, `objetivo`, `responsable`, `revision`, `revisado`, `actuacion` | `visita`, `evaluacion`, `reglas` (derivado al guardar: `contexto`) |
| `seguimiento_consulta` | `consulta`, `fecha` | `estado`, `resultado`, `observaciones`, `responsable`, `revision` |
| `gestion_senal` | `fecha`, `regla`, `evidencia`, `estado`, `motivo` | `actuacion`, `reglas` |
| `correccion_dispensacion` | `referencia`, `motivo` | `sustitucion` (fila cerrada o null), `coincidencia_confirmada` (derivados: `fecha`, `fecha_original`) |
| `importacion` | `filas`, o `entradas` si `conciliada` es verdadera | `fuente`, `duplicadas`, `resoluciones`, `huella`, `conflictos`, `decisiones`, `reimportacion`, `conciliada` |
| `evaluacion_adherencia` | `fecha`, `periodo_inicio`, `periodo_fin`, `metodo`, `resultado` | `porcentaje` (número o null) |
| `actuacion` | `texto`, `estado` | `fecha`, `nivel`, `fuente` |
| `estado_actuacion` | `actuacion`, `estado` | `fecha` |
| `estado_comunicacion` | `informe`, `estado` | `fecha` |
| `informe` | `fecha`, `formato`, `paciente`, `cobertura`, `alertas` | `temporal`, `version`, `aviso`, `autor`, `destino`, `nivel`, `reglas_aplicadas`, `informes_previos`, `eventos` |
| `informe_paciente` | los de `informe` y `plan` | `recurso` |
| `revision_alertas` | `resultado` | `fecha`, `alertas`, `reglas` |
| `configuracion` | — | `fecha`, `reglas` |

Una fila de dispensación es un objeto cerrado: `fecha`, `episodio`, `componente`, `dias` (entero) obligatorios; `linea`, `origen`, `id_origen` opcionales. Una columna adicional (p. ej. un dato identificativo) se rechaza.

`configuracion` no tiene productor en la aplicación actual. Se mantiene aceptado, con un esquema mínimo, para no eliminar una capacidad existente.

## Formato de la base y migración

- **Formato actual:** `vihconectados/demo@2` (más `esquema_eventos: 1`). El anterior, `vihconectados/demo@1`, se sigue leyendo. La clave de `localStorage` (`vihconectados.demo.v1`) no cambia.
- **La migración solo añade metadatos** (`formato`, `esquema_eventos`, `migracion.desde`). No modifica, reordena ni elimina ningún evento. Una prueba compara los eventos byte a byte con la cohorte demo y con una base que contiene los 16 tipos.
- **Leer no escribe.** Una base del formato anterior se migra en memoria; el almacenamiento queda intacto hasta la primera escritura.
- **Primera escritura:** antes de sobrescribir, se guarda una copia íntegra de la base anterior en `vihconectados.demo.v1.copia-previa` (una sola vez; no se sobrescribe). Si no cabe por la cuota de `localStorage`, la escritura continúa: la base nueva conserva todos los eventos.
- **Formato desconocido o JSON dañado** (p. ej. escrito por una versión posterior): `leer()` lanza «Almacenamiento incompatible…» y la aplicación muestra «No se pudo iniciar… No se han borrado sus datos». No se modifica nada.
- **Volver a una versión anterior** de la aplicación después de la primera escritura: esa versión no lee `demo@2`. Para recuperar los datos, copie el contenido de `vihconectados.demo.v1.copia-previa` en `vihconectados.demo.v1` desde las herramientas del navegador.

## Diagnóstico de datos ya guardados

`diagnosticarBase` revisa cada evento almacenado contra el esquema (admite `id`, `registrado` y los campos derivados) y devuelve los no conformes. **Solo informa; no descarta nada.** La interfaz muestra un aviso al cargar con el primer ejemplo. Un evento `importacion` sin `filas` ya no inutiliza el caso: se trata como si no aportara suministros, y el aviso indica que existe.

## Cómo añadir o cambiar un tipo de evento

1. Añadir o modificar su entrada en `ESQUEMAS`.
2. Añadir su muestra en `MUESTRAS` de `pruebas/esquemas-eventos.test.mjs` (la prueba falla si faltan tipos).
3. Hacer que la base de `baseCompleta()` lo genere con el productor real: es la prueba de que el esquema acepta todo lo que la aplicación produce.
4. Si el cambio no es compatible con eventos ya guardados, añadir una migración en `PASOS` y subir el formato. Nunca editar ni borrar eventos.

## Límites

- Validación solo en cliente: no protege frente a manipulación deliberada del almacenamiento ni sustituye la validación de servidor.
- Los esquemas no validan los valores clínicos; eso lo hacen las reglas de negocio y, en su día, el comité clínico.
- La copia previa duplica el tamaño de la base en `localStorage` hasta que se elimine.
- Cambios de comportamiento respecto a antes de A08: campos no previstos, `id`/`registrado` aportados por el llamador e importaciones directas con filas incompatibles con sus episodios se rechazan; el formato exportado pasa a `demo@2`.
