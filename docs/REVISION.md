# Propuesta de revisión

## Ampliación 0.3

Portada pública con acceso libre y una explicación del futuro acceso individual por hospital; sin cuentas ficticias ni recogida de credenciales. Adaptador de demostración y diseño documentado de identidad, pertenencias, roles, autorización y separación de datos en servidor.

Se añaden seis apartados legales y un pie común con autoría, condiciones, privacidad real del almacenamiento/consultas externas, aviso legal, fuentes/citación y accesibilidad. El enfoque procede de los avisos del autor en MAPEX-ADHEFAR; no se presume cesión, aval, licencia ajena ni conformidad jurídica certificada.

Cohorte sintética renovada con experiencias y visitas longitudinales, cambio de TAR y multicomponente. Nuevos casos en blanco o por escenario; actualización aditiva e idempotente para navegadores con datos anteriores. No se reescriben historiales ni informes. Validación: 26 pruebas unitarias y dos recorridos Chromium.


## Ampliación 0.2

Entrada de TAR desde el catálogo CIMA/AEMPS con ficha, presentación y confirmación del régimen; conserva metadatos en cada episodio y adapta el CSV por medicamento. Se mantienen los ejemplos y los informes anteriores sin reescribirlos.

Informes A4 con composición diferenciada para profesional y paciente, hoja opcional con instrucciones manuales revisadas, cita y recurso MAPEX-ADHEFAR. Texto para copiar a historia con alternativa manual al portapapeles. Se enlaza el hub con atribución y sin contexto clínico.

Validación: 22 pruebas unitarias y recorrido Chromium, incluyendo PDF A4 reales y paginación breve/extensa. CIMA se prueba con respuestas sintéticas; su acceso real está bloqueado por la red de este ejecutor. Revisar especialmente `cima.js`, `medicacion.js`, `componentes()` en el motor, los informes y su CSS. Los PDF son impresión del navegador, no firma ni prescripción.

## Entrega inicial 0.1


Título: MVP sintético longitudinal de vihconectados, fase 1

El repositorio destino estaba vacío. Esta rama incorpora el mapa de reutilización de preparadorconsulta y una aplicación web modular para demostrar el seguimiento Farmacia–Infecciosas con tres casos ficticios: cobertura continua, huecos de dispensación y cambio de TAR. Conserva eventos anteriores, separa episodios/componentes, valida CSV y fija instantáneas de informes. El circuito de comunicación es simulado; las fuentes CMO se atribuyen y los criterios pendientes de validación permanecen identificados.

Validación: 16 pruebas de motor, almacenamiento e informes; recorrido Chromium de escritorio/móvil con importación, duplicados, visita, estados, exportación y preparación de impresión. Sintaxis e instalación congelada correctas. Referencia: 13 pruebas pasadas y árbol sin modificar. Detalle y límites en VALIDACION.md.

Revisión sugerida: auditar primero AUDITORIA.md; después motor.js y sus pruebas, almacen.js/informes.js, interfaz y documentos de piloto. No es apto para uso clínico; no se ha añadido ningún servicio externo, dato real o envío.

La rama feat/fase-1 está subida. La creación de PR requiere una rama base y acceso a la API de GitHub; en esta sesión no existe main y la API devuelve Forbidden. No se ha creado una base artificial ni se ha publicado el entorno.
