/** Puerto para un futuro proveedor institucional. Este módulo no autentica ni autoriza usuarios reales. */
export const MODO_ACCESO = "demostracion";
export const contextoDemostracion = () =>
  Object.freeze({
    modo: MODO_ACCESO,
    autenticado: false,
    usuarioId: null,
    hospitalId: null,
    roles: Object.freeze([]),
  });
/** El adaptador institucional deberá obtener estos datos de una sesión verificada por el servidor. */
export class AccesoDemostracion {
  async obtenerContexto() {
    return contextoDemostracion();
  }
  async iniciarSesion() {
    throw Error(
      "Acceso institucional no habilitado. La demostración no necesita usuario ni contraseña.",
    );
  }
  async cerrarSesion() {
    return contextoDemostracion();
  }
}
export const ROLES_PREVISTOS = Object.freeze([
  "farmacia",
  "infecciosas",
  "gestor_hospital",
]);
