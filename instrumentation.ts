// Instrumentação desativada: não registramos mais logs em arquivo para evitar uso de fs/path no Edge.
// Mantemos o arquivo para evitar import errors em runtimes que esperam sua existência.
export function register() {
  // noop
}
