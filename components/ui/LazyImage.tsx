'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useRef, useState } from 'react';

/**
 * Wrapper sobre `next/image` que solo monta la imagen real cuando el
 * contenedor entra al viewport (con margen de anticipacion).
 *
 * Por que existe:
 * - El feed Reel renderiza 10 ProductReelCards simultaneamente.
 * - Cada uno tiene 2-3 imagenes en GalleryEmbla.
 * - Sin esto, el navegador intenta descargar ~25 imagenes al cargar
 *   la home, saturando la red WiFi del celular y degradando el LCP.
 * - Con esto, solo se descargan las imagenes del slide activo + el
 *   siguiente (margen de precarga).
 *
 * Performance:
 * - IntersectionObserver es nativo del browser, sin librerias.
 * - Solo se suscribe una vez al montar; se des-suscribe al desmontar.
 * - `rootMargin: '50% 0px'` pre-carga solo el slide actual + el siguiente
 *   parcial (suficiente para scroll-snap vertical). Un valor mayor
 *   descarga todos los slides al cargar.
 * - Antes del primer paint, devuelve un placeholder con la misma
 *   aspect ratio para evitar layout shift (CLS).
 */

interface LazyImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  /** Aspect ratio (ancho/alto). Si se pasa, reserva espacio antes del load. */
  aspectRatio?: number;
  /** Contenedor padre que actua como root del observer. Default: viewport. */
  rootRef?: React.RefObject<Element>;
  /**
   * Si es true, monta el Image inmediatamente (sin observer).
   * Usado por el GalleryEmbla para pre-cargar la primera imagen del
   * siguiente slide (cuando su slide vertical entra al viewport).
   */
  eager?: boolean;
}

export function LazyImage({ src, aspectRatio, rootRef, alt, className, eager, ...props }: LazyImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    // Si eager=true, no necesitamos observer: el padre ya decidio
    // que esta imagen debe estar lista.
    if (eager) return;
    const el = containerRef.current;
    if (!el) return;

    // rootMargin '50% 0px' significa: "considera visible si esta dentro
    // de medio viewport arriba/abajo". Asi, el slide actual + el siguiente
    // (parcialmente) estan siempre visibles para el observer. Esto evita
    // descargar todos los slides al cargar (que era el problema con 200%).
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          // Una vez visible, desuscribirse. No nos interesa dejar de ver.
          observer.disconnect();
        }
      },
      {
        root: rootRef?.current ?? null,
        rootMargin: '50% 0px',
        threshold: 0,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootRef, eager]);

  // IMPORTANTE: el contenedor SIEMPRE tiene absolute inset-0. Asi el
  // Image con `fill` puede ocupar todo el espacio del slide padre.
  // El Image se monta inmediatamente si priority=true O eager=true.
  // Si ninguno, espera al observer.
  const shouldRender = isInView || props.priority || eager;

  return (
    <div ref={containerRef} className="absolute inset-0">
      {shouldRender ? (
        <Image
          src={src}
          alt={alt}
          className={className}
          {...props}
        />
      ) : (
        // Placeholder mientras no es visible. Mismo color que el fondo
        // del feed para que cuando hace snap el slide ya este ahi.
        <div className="absolute inset-0 bg-zinc-900" aria-hidden />
      )}
    </div>
  );
}
