'use client';

import { useEffect } from 'react';

/**
 * Chrome Android's toolbar/gesture bar can occupy screen space that CSS
 * `dvh`/`svh` don't reflect reliably on nested elements. `visualViewport`
 * reports the real visible height live, so we mirror it into a CSS var
 * (`--app-height`) that `.h-screen-snap` consumes.
 *
 * Performance: previously we also listened to `scroll`, but that fired on
 * every pixel of scroll (Chrome's dynamic toolbar triggers it). Removing
 * that listener eliminates forced re-layouts during scroll.
 */
export function useAppHeight() {
  useEffect(() => {
    const setHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${height}px`);
    };

    setHeight();

    window.visualViewport?.addEventListener('resize', setHeight);
    window.addEventListener('resize', setHeight);
    window.addEventListener('orientationchange', setHeight);

    return () => {
      window.visualViewport?.removeEventListener('resize', setHeight);
      window.removeEventListener('resize', setHeight);
      window.removeEventListener('orientationchange', setHeight);
    };
  }, []);
}
