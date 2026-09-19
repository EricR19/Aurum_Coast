'use client';

import { useEffect, useRef } from 'react';

/**
 * Chrome Android's toolbar/gesture bar can occupy screen space that CSS
 * `dvh`/`svh` don't reflect reliably on nested elements. `visualViewport`
 * reports the real visible height live, so we mirror it into a CSS var
 * (`--app-height`) that `.h-screen-snap` consumes.
 *
 * Performance:
 * - No listener de `scroll`: forzaba re-layout constante cuando la toolbar
 *   dinamica de Chrome se expande/contrae.
 * - Escritura del CSS var DEBOUNCED 150ms (no por rAF en el proximo frame):
 *   la toolbar de Chrome/MIUI dispara `resize` repetidamente MIENTRAS se
 *   anima durante un scroll activo. Aplicar la altura de inmediato hacia
 *   que las 17 secciones `.h-screen-snap` cambiaran de tamano a mitad del
 *   gesto del usuario, corriendo el contenido bajo el dedo ("saltos
 *   extranos" / snap points movidos en vivo). Esperar a que la toolbar se
 *   asiente (sin nuevos resize por 150ms) evita resizear las secciones
 *   mientras el usuario todavia esta scrolleando.
 */
export function useAppHeight() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    /**
     * FIX 2026-09-19: el debounce de 150ms reducia la FRECUENCIA del resize
     * pero no evitaba el caso que rompia: la toolbar de Chrome termina de
     * colapsar a mitad de un fling, pasan 150ms sin nuevos `resize`, y
     * aplicabamos la altura nueva MIENTRAS el momentum seguia corriendo.
     * Las 15 secciones cambiaban de alto a la vez, todos los `offsetTop` se
     * corrian y el contenido saltaba bajo el dedo. Peor: el motor de snap
     * quedaba comparando contra geometria vieja.
     *
     * Ahora, ademas del debounce, exigimos que el feed este QUIETO. Si sigue
     * scrolleando, reintentamos mas tarde en vez de resizear en caliente.
     */
    const RETRY_MS = 120;
    let lastScrollTop = -1;
    let stableChecks = 0;
    // La PRIMERA aplicacion debe ser inmediata: en el mount no hay ningun
    // gesto en curso que proteger, y diferirla dejaria a las secciones con
    // el fallback `100svh` durante los primeros frames (justo el valor que
    // no es confiable en Chrome Android, que es el motivo de este hook).
    let isFirstRun = true;

    const getFeed = () =>
      document.querySelector<HTMLElement>('main.h-screen-snap');

    const isFeedIdle = () => {
      const feed = getFeed();
      // Sin feed (ej. vista desktop) no hay nada que proteger.
      if (!feed) return true;
      const current = feed.scrollTop;
      if (current !== lastScrollTop) {
        lastScrollTop = current;
        stableChecks = 0;
        return false;
      }
      // Dos lecturas consecutivas iguales => el scroll se asento de verdad.
      stableChecks += 1;
      return stableChecks >= 2;
    };

    const applyHeight = () => {
      timerRef.current = null;

      if (!isFirstRun && !isFeedIdle()) {
        timerRef.current = setTimeout(applyHeight, RETRY_MS);
        return;
      }
      isFirstRun = false;

      const height = window.visualViewport?.height ?? window.innerHeight;
      const rounded = Math.round(height);
      const previous = document.documentElement.style.getPropertyValue('--app-height');

      // Evita invalidar el layout de las 15 secciones si el valor no cambio
      // (la toolbar dispara `resize` varias veces con la misma altura final).
      // Ademas redondeamos: `visualViewport.height` es fraccionaria y esos
      // subpixeles se acumulaban en los `offsetTop` que usa el motor de snap.
      if (previous === `${rounded}px`) return;

      document.documentElement.style.setProperty('--app-height', `${rounded}px`);
    };

    const schedule = () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
      stableChecks = 0;
      timerRef.current = setTimeout(applyHeight, 150);
    };

    applyHeight();

    window.visualViewport?.addEventListener('resize', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);

    return () => {
      window.visualViewport?.removeEventListener('resize', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
}
