# Confianza en los datos y gestión de señales

Base: `9ea247c` (feat/fase-1, PR #3 integrada). No había PR abiertas al iniciar. Se verificaron en código los selectores sin corte, la deduplicación por fecha/episodio/componente y la falta de estado individual de señales. Sin AGENTS.md en el checkout. No se cambian umbrales, diseño, datos existentes, infraestructura ni dependencias.

## Semántica temporal

- Hechos clínicos y estados: fecha efectiva <= corte. Cobertura: intervalos UTC [inicio, corte), día de corte excluido. Un TAR que empieza exactamente en el corte ya puede figurar como tratamiento vigente, pero todavía no aporta días a la cobertura anterior; la interfaz explicita ambos límites.
- `fecha` es la fecha efectiva y `registrado` el momento de anexado. Los registros antiguos sin fecha efectiva usan su fecha de registro como referencia visible; no se les asignan fechas clínicas retroactivas. Si no hay ninguna fecha, no se aplican a un corte histórico. Nivel desconocido se muestra sin dato, no se infiere nivel 3.
- Las vistas reconstruyen el periodo con la información disponible actualmente. Las dispensaciones se recortan por sus fechas de fila y las correcciones tienen efecto retrospectivo: no se implementa una segunda consulta «qué se sabía en aquel momento». Esa lectura permanece disponible en las instantáneas guardadas, que no se recalculan ni migran.
- TAR, nivel, última visita, valoración manual, actuaciones y estados de comunicación comparten el corte. Los estados nuevos no pueden preceder a su actuación/informe ni a una transición anterior. La historia distingue fechas y muestra los eventos aplicables; el historial completo permanece en la exportación.
- Los informes nuevos marcan `temporal: efectiva-v1`. Los anteriores conservan su contenido y la interpretación de sus instantáneas. Los datos fuente permanecen anexados e identificables, incluidas correcciones y fechas de registro.

## Correcciones

En **Cobertura TAR → Dispensaciones y correcciones → Corregir / anular**:

1. Seleccionar anulación o sustitución, indicar motivo sintético y revisar fecha, episodio, componente y días corregidos.
2. Se añade `correccion_dispensacion`, con referencia al original, motivo, sustitución opcional, primera fecha efectiva afectada, fecha original y timestamp de registro. No se cambia el evento inicial.
3. La proyección identifica filas por `id-del-evento:índice`, también para lotes antiguos: es una referencia derivada, sin escribir IDs falsos en datos históricos.
4. Estados visibles: vigente, sustituida y anulada. Cada sustitución se puede volver a corregir; no se puede volver a anular un original ya retirado. El cálculo solo usa las hojas vigentes de la cadena.
5. Se conserva la identidad de origen. Una sustitución que coincide con otra entrega exige confirmar expresamente que son independientes. No se permite reutilizar la identidad de otra entrega.

## Identidad, reimportación y conciliación

- CSV clásico de cuatro columnas compatible. Se admite además el esquema cerrado `fecha;episodio;componente;dias;origen;id_origen`. Los dos campos de origen se aportan juntos; identificadores técnicos sintéticos, sin información personal.
- Misma identidad de origen y contenido: reimportación, sin sumar. Identidad existente con contenido distinto: conflicto que requiere corregir el registro, no sobrescribirlo. Dos IDs de origen diferentes permiten entregas del mismo día.
- Sin identidad suficiente, una coincidencia por fecha/episodio/componente se presenta dentro del formulario. Se debe escoger «duplicado de esta referencia» o «otra entrega legítima» y aportar motivo. Se contempla también la coincidencia entre filas del mismo archivo. Ninguna fila del lote se guarda mientras haya decisiones pendientes.
- La reimportación de un archivo ya guardado se reconoce por SHA-256 y la igualdad de las filas normalizadas originales; no resucita originales anulados/sustituidos. Los archivos históricos sin esta evidencia pueden requerir conciliación explícita una primera vez.
- CSV y entrada manual usan el mismo planificador, y el comando vuelve a validar todas las decisiones al anexar. Una conciliación que omite todas las filas conserva un evento de auditoría con las decisiones; una reimportación inequívoca no añade un evento vacío.
- El adaptador `importarCSV` anterior se mantiene para construir escenarios y compatibilidad técnica. Los formularios operativos usan `leerCSV` + `planificarDispensaciones` + el comando conciliado. No hay una API de escritura institucional; esta validación local sigue siendo de demostración.

## Señales

La condición calculada no se modifica por revisarla. Su gestión es un evento independiente `gestion_senal` con regla, evidencias, fecha efectiva, estado, motivo y vínculo opcional a actuación:

- pendiente (derivado al no existir gestión aplicable);
- revisada;
- justificada;
- actuacion (requiere una actuación existente aplicable al corte);
- cerrada.

La huella canónica incluye reglas, intervalo, episodios, suministros y correcciones efectivos, y la visita que fundamenta una señal de experiencia. No incluye reloj, renderizado, exportaciones ni anotaciones ajenas a esa evidencia. Cambiar el intervalo, reglas o datos efectivos requiere revisión nueva si la condición sigue presente. Añadir una dispensación futura no reabre una señal histórica. Si la condición deja de existir no se presenta como pendiente, pero se conserva su gestión en la historia.

Avisos metodológicos (sin intervalo oral evaluable o TAR intramuscular fuera del PDC), calidad de datos y señales asistenciales se etiquetan por separado. Contadores y mesa incluyen solo pendientes asistenciales/de calidad; la cohorte permite filtrar avisos y señales gestionadas. Las revisiones globales antiguas se conservan sin inventar un vínculo individual que nunca tuvieron.

## Validación y recorrido

- `npm test`: 48 pruebas superadas, 14 nuevas en `pruebas/confianza.test.mjs`.
- `npm run check`: incluye los cuatro módulos nuevos.
- `npm run test:browser`: recorridos clásico, público, desktop, registro manual y confianza. Se ha actualizado la prueba manual para exigir conciliación explícita de las coincidencias sin ID.
- Nuevo recorrido: corte histórico con TAR/nivel/visita futuros, cierre persistente y reapertura por evidencia nueva, dos entregas del mismo día, sustitución y anulación, reimportación por identidad/huella e informe congelado. Interacción con teclado y sin desbordamiento global a 1440/390px. Capturas inspeccionadas en `/tmp/vih-confianza-dispensaciones.png` y `/tmp/vih-confianza-mobile.png`.
- Tras los últimos ajustes de fechas y huella canónica se repitieron pruebas unitarias, sintaxis y el recorrido específico de confianza.

Revisión manual: ejecutar `npm start`, abrir un caso, retroceder el corte, comprobar TAR y nivel; en Cobertura TAR registrar una entrega repetida y conciliarla; corregir/anular desde la tabla; volver a Resumen, gestionar una señal y recargar con el mismo corte; añadir datos efectivos distintos y comprobar nueva revisión. Los informes guardados conservan sus resultados originales.

Sin backend, migración destructiva, datos reales, nuevos umbrales, ventanas de inyectables, visita guiada, analíticas, merge o despliegue. Teclado y pruebas de software no equivalen a auditoría completa de accesibilidad ni validación clínica.
