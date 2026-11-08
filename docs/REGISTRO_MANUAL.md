# Combinaciones CIMA y dos registros manuales

El selector ya conservaba hasta ocho medicamentos, pero solo admitía la vía oral. El incremento hace visible la selección múltiple y amplía el catálogo a la vía intramuscular con límites explícitos.

## Comportamiento

- **Registrar cambio TAR → + Añadir otro medicamento** conserva los anteriores, numera la selección y muestra su vía. No admite registros CIMA repetidos ni mezcla de fases orales/intramusculares; modificar la selección exige volver a confirmar la revisión. Los episodios antiguos sin `modalidad` siguen siendo orales.
- Las presentaciones intramusculares admitidas por el filtro ATC se guardan como `modalidad: inyectable`. No se deducen dosis, días de suministro, ventanas ni administraciones. Sus intervalos se detallan en `cobertura.excluidos` y se omiten del numerador y denominador del PDC oral. Si no queda intervalo oral, PDC es null, no cero. Al volver a un episodio oral no se recuperan sobrantes de otro episodio.
- **Registrar dispensación manual** permite fecha y días por medicamento de un episodio oral (1–400); dejar un componente vacío significa no registrarlo. Reutiliza la validación CSV, deduplicación y rechazo atómico de conflictos. El almacenamiento vuelve a validar el comando y añade un evento `importacion` con fuente `Entrada manual`, fecha, UUID y filas. No se inventa hash de archivo. Los duplicados exactos no suman cobertura ni añaden eventos vacíos.
- **Registrar valoración manual** añade un evento `evaluacion_adherencia`: fecha, periodo [inicio, fin), método cerrado, resultado referido y porcentaje opcional 0–100. Fecha final del periodo ≤ fecha de evaluación. El porcentaje es declarado, no derivado ni validado como cuestionario; no modifica el PDC ni activa umbrales. Se admite cero y se distingue de no estimado (null).
- Resumen, Cobertura TAR y Experiencia permiten registrar y consultar las valoraciones. La cohorte y los informes profesionales muestran la última aplicable al corte, por fecha y orden de registro para empates. Los informes existentes conservan sus instantáneas; las anotaciones nuevas no los modifican.
- Se retira la etiqueta de producto `CMO · MAPEX` del menú y el nombre compuesto de portada, metadatos, modelo, citación de la herramienta e informes. Se mantienen las funciones CMO y las atribuciones a las publicaciones originales en sus apartados de fuentes.

No hay dependencias nuevas, backend, migración destructiva ni cambios a los umbrales demo existentes. Los campos son sintéticos y no se añaden datos identificativos.

## Validación

- `npm test`: 34 pruebas, incluidas seis nuevas sobre catálogo intramuscular, exclusión del PDC, transiciones de episodios, deduplicación/conflictos, validación de valoraciones, corte temporal e informes congelados.
- `npm run check`: incluye los nuevos módulos `adherencia.js` y `registro-manual.js`.
- `npm run test:browser`: conserva los recorridos clásico, público y desktop, e incorpora `pruebas/registro-manual.mjs` para selección de dos medicamentos orales y dos intramusculares, duplicados, dispensación multicomponente, valoración con y sin porcentaje, persistencia tras recarga, informes, cohorte, móvil y retirada de la etiqueta del menú.
- La impresión conserva el informe breve de prueba en una página A4. La valoración solo añade su sección al PDF cuando hay una registrada.
- Capturas de los formularios inspeccionadas en `/tmp/vih-cima-dos-farmacos.png` y `/tmp/vih-adherencia-manual.png`.

CIMA se intercepta con fichas ficticias en las pruebas de navegador; no se verifica disponibilidad/CORS ni se presenta una combinación concreta como clínicamente validada. El soporte de inyectables de este incremento es catálogo y valoración referida, no monitorización de administraciones.
