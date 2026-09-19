/**
 * Coordinacion entre los scrolls PROGRAMATICOS (deep link, tap en un
 * resultado de busqueda) y el MOTOR DE PAGINADO del feed (`MobileFeed.tsx`).
 *
 * Por que un modulo y no un `useRef`:
 * antes esto era `isProgrammaticScrollRef` dentro de `FeedInner`, asi que
 * `SearchSheet` (que vive en OTRO subarbol, fuera del feed) no tenia forma
 * de avisar "este scroll lo dispare yo, no lo corrijas". El resultado era
 * que el motor de snap disparaba un `scrollTo` correctivo justo encima del
 * scroll programatico -> pelea de scrolls -> salto visible.
 *
 * Semantica de TTL en vez de booleano:
 * un `scrollTo` programatico normalmente termina en un evento `scrollend`,
 * que es quien "consume" la marca. Pero si el destino ya coincide con la
 * posicion actual, el navegador NO scrollea y NO emite `scrollend`: un flag
 * booleano quedaria encendido para siempre y se tragaria la proxima
 * correccion legitima del usuario. Con TTL la marca caduca sola.
 */

/** Ventana de validez de una marca de scroll programatico. */
const PROGRAMMATIC_SCROLL_TTL_MS = 1500;

let pendingUntil = 0;

/** Marca que el proximo `scrollend` proviene de un scroll programatico. */
export function beginProgrammaticScroll(ttlMs: number = PROGRAMMATIC_SCROLL_TTL_MS): void {
  pendingUntil = Date.now() + ttlMs;
}

/**
 * Consume la marca. Devuelve `true` si el `scrollend` actual corresponde a
 * un scroll programatico vigente (y por lo tanto NO hay que corregirlo).
 */
export function consumeProgrammaticScroll(): boolean {
  if (pendingUntil === 0 || Date.now() > pendingUntil) {
    pendingUntil = 0;
    return false;
  }
  pendingUntil = 0;
  return true;
}

/** Limpia la marca (usado al desmontar el feed). */
export function resetProgrammaticScroll(): void {
  pendingUntil = 0;
}
