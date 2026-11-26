/**
 * Puerto de repositorio por comandos y su adaptador de demostración (actuación A07; docs/ARQUITECTURA.md).
 *
 * Contrato del puerto (lo que un servidor institucional deberá implementar):
 *   consultar()        → copia del modelo de lectura (la base actual)
 *   ejecutar(comando)  → { db, resultado }; el comando se valida y se aplica sobre el estado ACTUAL del
 *                        almacenamiento, y solo se persiste si es válido
 *   hayDatos()         → ¿existe ya una base guardada?
 *   diagnostico        → resultado de la última lectura (migración y eventos no conformes)
 *
 * No hay `leer()`/`guardar(db)`: quien llama ya no decide cómo queda la base entera. Una consecuencia
 * comprobada por pruebas: dos sesiones sobre el mismo almacenamiento ya no se pisan, porque cada comando parte
 * del estado guardado y no de una copia que la sesión tenía en memoria.
 *
 * El adaptador recibe el almacenamiento por inyección (`localStorage` en el navegador); este módulo no lo toca.
 */
import { RepositorioDemo } from "./almacen.js";
import { aplicarComando } from "./comandos.js";

export class RepositorioLocal {
  #almacen;
  constructor(storage) {
    this.#almacen = new RepositorioDemo(storage);
  }
  get diagnostico() {
    return this.#almacen.diagnostico;
  }
  hayDatos() {
    return this.#almacen.storage.getItem(this.#almacen.key) != null;
  }
  consultar() {
    return this.#almacen.leer();
  }
  ejecutar(comando) {
    const actual = this.#almacen.leer();
    const { db, resultado } = aplicarComando(actual, comando);
    this.#almacen.guardar(db);
    return { db, resultado };
  }
}
