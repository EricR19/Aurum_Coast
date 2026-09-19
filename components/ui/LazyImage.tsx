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
 * - `rootMargin: '25% 0px'` arranca la descarga apenas el slide esta cerca,
 *   sin esperar a que este completamente visible. La descarga NO se
 *   bloquea por un grace period: durante scroll continuo real, esperar a
 *   que el usuario se detenga significaba que las imagenes nunca llegaban
 *   a descargarse. El posible frame a medio cargar se evita con un
 *   fade-in (`opacity` en `onLoad`), no retrasando el fetch.
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

export function LazyImage({ src, aspectRatio, rootRef, alt, className, eager, onLoad, ...props }: LazyImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  // Controla el fade-in visual, DESACOPLADO de cuando arranca la descarga.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Si eager=true, no necesitamos observer: el padre ya decidio
    // que esta imagen debe estar lista.
    if (eager) return;
    const el = containerRef.current;
    if (!el) return;

    // FIX 2026-09-18 "se queda pegado / imagenes no cargan durante scroll":
    // Antes, un grace period de 300ms retrasaba el MONTAJE del <Image> (y
    // por tanto el inicio de la descarga) hasta confirmar que el slide se
    // quedo quieto. En un scroll continuo real (no el simulador de
    // DevTools), el usuario rara vez se detiene 300ms en cada slide, asi
    // que la descarga nunca arrancaba y el placeholder negro quedaba
    // visible indefinidamente.
    //
    // Ahora: la descarga arranca apenas el slide es visible (sin grace
    // period). El problema original que el grace period resolvia (ver
    // cual media carga con artefactos al pasar rapido) se soluciona
    // distinto: el <Image> se monta enseguida pero queda en `opacity: 0`
    // hasta que el evento `onLoad` confirma que ya esta decodificada
    // (ver fade-in mas abajo). Asi nunca se ve un frame a medio cargar,
    // pero la red no se bloquea durante el scroll.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        root: rootRef?.current ?? null,
        rootMargin: '25% 0px',
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
  // La imagen priority (LCP del primer slide) no espera el fade: retrasar
  // su pintado le pega directo a la metrica de LCP.
  const visible = loaded || props.priority;

  return (
    <div ref={containerRef} className="absolute inset-0">
      {shouldRender ? (
        <Image
          src={src}
          alt={alt}
          className={`${className ?? ''} transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
          onLoad={(e) => {
            setLoaded(true);
            onLoad?.(e);
          }}
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
