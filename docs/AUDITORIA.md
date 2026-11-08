# Auditoría y mapa de reutilización — antes del MVP

Referencia examinada en solo lectura: ramonmorillo/preparadorconsulta, commit 42402cb6875cad7881b52406a4253f2960260a14 (08/11/2026). Destino inicialmente sin commits ni código. No se modifica el original.

| Archivo | Hallazgo | Decisión |
|---|---|---|
| app/nucleo.js | v2.1.0, funciones puras, fechas UTC, PDC con arrastre por grupo, detector explicable, planificador literal y auditor mecánico | Adaptar validación de fechas y separación funcional. Reescribir PDC por episodio y componente; no arrastrar entre TAR. No reutilizar lector por expresiones regulares: evitar inferencias clínicas de notas. |
| app/app.js | DOM, estado mutable de una consulta, registro de actuaciones, impresión y exportación JSON | Reutilizar patrones de escape y descarga; desarrollar navegación longitudinal, formularios cerrados y repositorio de demostración independiente. |
| app/cima.js | Cliente público AEMPS: búsqueda/ficha, puede devolver resultados parciales | No activar en fase 1. Futuro adaptador de catálogo autorizado, nunca fuente de dispensación ni prueba de toma. |
| datos/biblioteca/vih.json | Catálogo acumulativo por nivel, fuente cmo-vih-app c963da9; declara discrepancia con niveles propios | Copia literal con metadatos. Mostrar discrepancia y selección profesional; no asignar nivel ni prescribir. |
| datos/guia/vih.json | Guion SEFH MAPEX 2023, cap. 4, pp. 24–34, preguntas con página/ancla | Copia literal y visualización con atribución. No incorporar escala PAM ni calcular puntuaciones. |
| datos/reglas/reglas.json | v0.2.0: 180 días y 0,9; interpretación temporal pendiente de validar | Conservar parámetros como demostrativos configurables y versionados, sin plazos automáticos ni clasificación clínica. |
| pruebas/nucleo.test.mjs | Paridad con calculadora, 147/180 VIH, negaciones, literalidad, seguimiento, CIMA | Mantener estrategia de pruebas puras; añadir episodios, componentes, duplicados, histórico inmutable, instantáneas y transiciones. No confundir paridad con validación clínica. |

## Desarrollo específico
Eventos anexados por paciente: nivel asignado, tratamiento, visita/experiencia, lote CSV, actuación/estado, informe/estado. Informes congelan entrada, reglas y resultado. Almacenamiento local con interfaz sustituible; sin servidor clínico, autenticación ni envío. Solo identificadores DEMO generados y opciones sintéticas; CSV de esquema cerrado. Exportación para evaluación técnica, no interoperabilidad FHIR validada.

## Autoría y permisos
Autor: Dr. Ramón Morillo Verdugo. Adaptaciones CMO: SEFH. La referencia no contiene LICENSE: no se presume licencia abierta ni se añade una. La reutilización solicitada se documenta con origen y commit; aclarar permisos antes de redistribución o piloto. Las fuentes clínicas y sus derechos se mantienen. No se ha verificado aquí el PDF original ni validado los criterios.
