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
    const applyHeight = () => {
      timerRef.current = null;
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${height}px`);
    };

    const schedule = () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
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
