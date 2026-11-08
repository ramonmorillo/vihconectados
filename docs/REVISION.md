# Propuesta de revisión

Título: MVP sintético longitudinal de vihconectados, fase 1

El repositorio destino estaba vacío. Esta rama incorpora el mapa de reutilización de preparadorconsulta y una aplicación web modular para demostrar el seguimiento Farmacia–Infecciosas con tres casos ficticios: cobertura continua, huecos de dispensación y cambio de TAR. Conserva eventos anteriores, separa episodios/componentes, valida CSV y fija instantáneas de informes. El circuito de comunicación es simulado; las fuentes CMO se atribuyen y los criterios pendientes de validación permanecen identificados.

Validación: 16 pruebas de motor, almacenamiento e informes; recorrido Chromium de escritorio/móvil con importación, duplicados, visita, estados, exportación y preparación de impresión. Sintaxis e instalación congelada correctas. Referencia: 13 pruebas pasadas y árbol sin modificar. Detalle y límites en VALIDACION.md.

Revisión sugerida: auditar primero AUDITORIA.md; después motor.js y sus pruebas, almacen.js/informes.js, interfaz y documentos de piloto. No es apto para uso clínico; no se ha añadido ningún servicio externo, dato real o envío.

La rama feat/fase-1 está subida. La creación de PR requiere una rama base y acceso a la API de GitHub; en esta sesión no existe main y la API devuelve Forbidden. No se ha creado una base artificial ni se ha publicado el entorno.
