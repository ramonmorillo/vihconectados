# Arquitectura: dominio, interfaz y puerto de comandos (actuación A07)

Estado: implementado. Es una reorganización **sin cambio de comportamiento visible**: los 8 recorridos de navegador y las pruebas unitarias existentes pasan sin modificar sus expectativas. Prepara el camino al backend institucional (B01) y no lo sustituye: la validación sigue ejecutándose en el navegador.

## 1. Regla de capas

```
 Interfaz (navegador)                Dominio (puro)                       Almacenamiento
 ────────────────────                ───────────────                      ──────────────
 app.js, desktop.js, legal.js,       motor, temporal, dispensaciones,     localStorage
 portada.js, vista-*.js,             senales, consulta, adherencia,       (inyectado por la interfaz)
 revision-datos.js,                  informes, reglas, almacen,                  ▲
 registro-manual.js,                 esquemas-eventos, migraciones,              │
 medicacion.js                       conciliacion, eventos-formulario,    RepositorioLocal
        │                            seleccion-tar, comandos,             consultar() / ejecutar(comando)
        │  repo.ejecutar(comando)    repositorio, cima, demo, …                  ▲
        └────────────────────────────────►│─────────────────────────────────────┘
                 dependencia: interfaz → dominio, nunca al revés
```

**Por defecto, todo módulo de `src/` es de dominio.** Solo es de interfaz el que figura en la lista de `pruebas/arquitectura.test.mjs`. Un módulo nuevo nace, por tanto, obligado a no tocar el navegador.

Lo que comprueba esa prueba (sobre el texto fuente, sin comentarios):

1. Ningún módulo de dominio referencia `document`, `window`, `localStorage`, `sessionStorage`, `location` ni `navigator`.
2. Ningún módulo de dominio importa un módulo de interfaz.
3. `revision-datos.js`, `registro-manual.js` y `medicacion.js` no importan funciones de validación, planificación o escritura (`anexar`, `planificarDispensaciones`, `validarDispensacion`, `leerCSV`, `modalidadTar`…) y usan los módulos puros.
4. `app.js` y `vista-consulta.js` no importan funciones de escritura y `app.js` no llama a `repo.leer()` ni a `repo.guardar()`.

## 2. Qué se movió al dominio

| Antes (dentro del formulario) | Ahora (módulo puro) | Qué hace |
|---|---|---|
| Cierre `crearGuardadoConciliado` con decisiones y acceso al DOM | `conciliacion.js` · `crearSesionConciliacion` | Conserva las decisiones mientras no cambien las entradas; devuelve `conflictos`, `sin_cambios` o `listo` (con el evento). **No escribe ni pinta** |
| Construcción de entradas dentro de `abrirDispensacionManual` | `conciliacion.js` · `entradasManuales` | Entradas válidas a partir de los valores del formulario |
| Lectura del CSV y huella SHA-256 dentro de `abrirCSVConciliado` | `conciliacion.js` · `entradasDesdeCSV`, `huellaTexto` | |
| Construcción de eventos dentro de los formularios | `eventos-formulario.js` | `construirCorreccion`, `construirGestionSenal`, `construirEvaluacionManual` |
| Estado de la selección de TAR dentro de `abrirSeleccionTar` | `seleccion-tar.js` · `crearSeleccionTar` | Añadir, quitar, duplicados, máximo de 8, mezcla de vías y evento de tratamiento |

La interfaz conserva lo suyo: HTML, eventos del DOM, mensajes y la búsqueda en CIMA (que sigue en `cima.js`).

## 3. Puerto de repositorio por comandos

Contrato (lo que un servidor institucional deberá implementar):

| Operación | Significado |
|---|---|
| `consultar()` | Copia del modelo de lectura (la base actual) |
| `ejecutar(comando)` → `{db, resultado}` | Valida el comando y lo aplica sobre el estado **actual del almacenamiento**; solo persiste si es válido |
| `hayDatos()` | ¿Existe ya una base guardada? |
| `diagnostico` | Resultado de la última lectura: migración y eventos no conformes (A08) |

**No existen `leer()` ni `guardar(db)`** en el puerto. `RepositorioDemo` (`almacen.js`) sigue existiendo como almacenamiento de bajo nivel dentro del adaptador `RepositorioLocal`; la interfaz no lo usa.

### Comandos (`src/comandos.js`)

Esquema cerrado: un campo no previsto, un obligatorio ausente o un tipo incorrecto se rechazan. Los valores los validan, como antes, las reglas de dominio.

| Comando | Campos | `resultado` | Sustituye a |
|---|---|---|---|
| `sembrar_demo` | — | `sembrado` | Cargar la cohorte inicial la primera vez |
| `crear_caso` | `nivel?`, `fecha_nivel?` | `paciente` | `crearPaciente` |
| `crear_caso_escenario` | `escenario` | `paciente` | `crearCasoEscenario` |
| `actualizar_cohorte` | — | `anadidos` | `incorporarCohorte` |
| `anexar_evento` | `paciente`, `evento` | `paciente`, `evento` | `anexar` (el evento se valida con su esquema, A08) |
| `registrar_consulta` | `paciente`, `datos`, `reglas` | `paciente`, `evento` | `registrarConsulta` (compuesto: se guarda una sola vez) |
| `registrar_seguimiento` | `paciente`, `datos` | `paciente`, `evento` | `registrarSeguimiento` (compuesto) |

`aplicarComando(db, comando)` es **puro**: no modifica la base recibida y lanza si algo falla. Es el candidato natural para ejecutarse igual en cliente y servidor (B01).

### Propiedades comprobadas por pruebas (`pruebas/comandos.test.mjs`)

- **Un comando inválido no escribe nada:** ni una sola llamada a `setItem`, ni siquiera la migración de una base del formato anterior ni su copia previa.
- **Dos sesiones sobre el mismo almacenamiento no se pisan.** Con el modelo anterior, cada sesión escribía la base completa que tenía en memoria y la segunda borraba lo que había hecho la primera; la prueba reproduce esa actualización perdida con `RepositorioDemo` y demuestra que con comandos se conservan ambos eventos. Es una mejora real respecto a antes, no solo una reorganización.
- Los comandos compuestos no dejan nada a medias.
- La migración de formato (A08) funciona a través de los comandos.

## 4. Cómo añadir una escritura nueva

1. Si es un evento nuevo: esquema en `esquemas-eventos.js` (A08). Si es una operación nueva: entrada en `COMANDOS` y su rama en `aplicarComando`.
2. Si hay lógica de formulario (construir el evento, validar entradas): módulo puro con pruebas, no dentro del formulario.
3. La interfaz llama a `ejecutar({...})` (en `app.js`) o recibe `ejecutar`/`guardar: add` como parámetro. Nunca importa funciones de escritura.
4. Prueba en `comandos.test.mjs` y, si procede, recorrido de navegador.

## 5. Límites y deuda pendiente

- **Sigue siendo cliente.** `RepositorioLocal` valida y persiste en el navegador: un usuario con acceso al almacenamiento puede saltarse el puerto. El servidor (B01) debe volver a ejecutar `aplicarComando` con autenticación, actor y reloj propios.
- **No es una transacción entre pestañas.** Cada comando lee el estado guardado y lo escribe de vuelta; entre ambos pasos puede intercalarse otra sesión (ventana mucho más estrecha que antes, pero no cero). Un servidor necesita control de concurrencia (versión del agregado o idempotencia).
- **`app.js` no se ha dividido** (≈ 700 líneas, estado global y plantillas de texto). A07 separó la lógica de dominio de los formularios y la escritura del puerto, no la composición de las vistas (hallazgo F-02, parcialmente resuelto).
- Los módulos de interfaz siguen leyendo funciones de dominio para **mostrar** (`episodios`, `componentes`, `nombreTar`, `evaluarSenales`…): leer es legítimo; lo que no pueden es decidir ni escribir.
- La interfaz sigue compartiendo `esc` desde `vista-informes.js`; no es un problema de dominio.
- Los comandos no llevan todavía actor, identificador de idempotencia ni reloj de servidor (B01, B04).
