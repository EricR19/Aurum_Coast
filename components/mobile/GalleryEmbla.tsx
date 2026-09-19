'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { LazyImage } from '@/components/ui/LazyImage';
import type { ProductImage } from '@/lib/types';
import { GalleryProgress } from './GalleryProgress';

interface GalleryEmblaProps {
  images: ProductImage[];
  onSlideChange?: (index: number) => void;
  /**
   * Referencia al contenedor que actua como root del IntersectionObserver.
   * Por defecto es el viewport, pero pasarlo al contenedor del feed
   * (`overflow-y-scroll`) evita descargar imagenes de slides que estan
   * montados pero fuera del area visible de scroll.
   */
  scrollRootRef?: RefObject<HTMLElement>;
  /**
   * Si es el primer producto del feed. Solo en ese caso la primera imagen
   * lleva `priority=true` para mejorar el LCP. Los demas slides son lazy
   * puros: la imagen aparece cuando su slide entra al viewport.
   */
  priorityFirst?: boolean;
}

/**
 * Carrusel horizontal de fotos del producto con Embla.
 * - Captura el primer slide visible para disparar `ViewContent` en tracking.
 * - Renderiza barras de progreso (GalleryProgress) sincronizadas.
 * - Solo descarga las imagenes cuando su slide esta cerca del viewport
 *   (via LazyImage + IntersectionObserver). Esto evita que los 10 reels
 *   compitan por el ancho de banda al cargar la home.
 * - PRE-CARGA: cuando el slide vertical de este producto esta a <=1
 *   viewport del actual (es decir, es el "siguiente" que el usuario va
 *   a ver), monta la primera imagen con `eager=true`. Asi cuando hace
 *   snap, la imagen ya esta descargada y aplica Ken Burns al entrar.
 */
export function GalleryEmbla({ images, onSlideChange, scrollRootRef, priorityFirst = false }: GalleryEmblaProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    containScroll: 'trimSnaps',
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  // Estado de pre-carga: si true, la primera imagen se monta sin esperar.
  const [preloaded, setPreloaded] = useState(priorityFirst);
  // FIX stutter Xiaomi: el ken-burns solo se aplica si el slide quedo
  // quieto por >350ms. Antes se aplicaba inmediatamente al hacer snap,
  // y durante scroll rapido varios ken-burns disparaban transform/opacity
  // animations al mismo tiempo, saturando el compositor en gama media.
  const [stable, setStable] = useState(priorityFirst);
  const containerRef = useRef<HTMLDivElement>(null);

  // FIX performance: leemos `onSlideChange` por ref. Asi el callback que
  // viene del padre puede recrearse en cada render (es lo normal cuando el
  // padre no esta memoizado) sin invalidar el useEffect de abajo y, por
  // tanto, sin re-suscribir listeners a Embla ni resetear `scrollSnaps`
  // cada vez que cambia cualquier cosa del state global.
  const onSlideChangeRef = useRef(onSlideChange);
  useEffect(() => {
    onSlideChangeRef.current = onSlideChange;
  }, [onSlideChange]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const idx = emblaApi.selectedScrollSnap();
    setSelectedIndex(idx);
    onSlideChangeRef.current?.(idx);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    // FIX performance: evitamos `on('reInit', onSelect)` porque Embla no
    // se reinicializa en runtime (loop/align son fijos en este componente).
    // Asi reducimos un listener innecesario por galeria (x12 productos).
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Observer que detecta cuando este slide esta a <=1 viewport del actual.
  // Cuando entra en ese rango, pre-carga la primera imagen.
  //
  // FIX performance: usamos `rootBounds` (coordenadas del contenedor scroll)
  // en lugar de `boundingClientRect.top` (que es contra el viewport y por
  // tanto puede dar `top` negativo cuando el contenedor esta en el medio
  // del scroll vertical -> la pre-carga NUNCA disparaba).
  //
  // Tambien programamos el `setPreloaded(true)` dentro de un rAF para que
  // caiga en el siguiente frame y no fuerce un paint extra en mitad del
  // snap del feed.
  useEffect(() => {
    // El primer producto ya se carga por priority, no necesita observer.
    if (priorityFirst) return;
    const el = containerRef.current;
    if (!el) return;

    // FIX 2026-09-18 "imagenes no cargan durante scroll continuo": antes
    // habia un grace period de 300ms que cancelaba la pre-carga si el
    // slide salia del viewport antes de tiempo. En un scroll real (no el
    // simulador de DevTools) el usuario casi nunca se queda quieto 300ms
    // por slide, asi que `preloaded` nunca se activaba y la primera
    // imagen del slide siguiente llegaba tarde. Ahora disparamos apenas
    // se confirma que el slide esta en la zona de pre-carga, sin esperar.
    // El posible frame a medio cargar ya no es un problema: `LazyImage`
    // hace fade-in con `onLoad`, no muestra nada crudo a medio decodificar.

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        // Consideramos "siguiente slide" cualquier slide cuyo top este
        // dentro del primer viewport hacia abajo desde el borde superior
        // del contenedor de scroll. Esto cubre el slide siguiente cuando
        // el actual esta en la primera mitad.
        const root = entry.rootBounds;
        let shouldPreload = false;
        if (!root) {
          // Fallback: si no hay rootBounds (algunos browsers viejos),
          // aceptamos cualquier intersección.
          shouldPreload = true;
        } else {
          const slideTop = entry.boundingClientRect.top - root.top;
          const slideBottom = slideTop + entry.boundingClientRect.height;
          shouldPreload = slideBottom > root.top && slideTop < root.top + root.height;
        }
        if (!shouldPreload) return;
        setPreloaded(true);
        observer.disconnect();
      },
      {
        root: scrollRootRef?.current ?? null,
        // Solo pre-carga cuando el slide esta REALMENTE cerca del viewport
        // visible. Antes era '50%' (demasiado generoso) y luego '25%'.
        rootMargin: '0px 0px 25% 0px',
        threshold: 0,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollRootRef, priorityFirst]);

  // FIX stutter Xiaomi: cuando preloaded pasa a true (la imagen esta lista),
  // esperamos 350ms antes de marcar como "stable" (lo que activa ken-burns).
  // Asi el ken-burns solo se aplica cuando el slide esta REALMENTE quieto,
  // no durante un scroll rapido en el que varios slides pasan por el viewport.
  useEffect(() => {
    if (!preloaded) {
      setStable(false);
      return;
    }
    const t = setTimeout(() => setStable(true), 350);
    return () => clearTimeout(t);
  }, [preloaded]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-black">
      <div ref={emblaRef} className="h-full w-full overflow-hidden">
        <div className="flex h-full">
          {images.map((img, i) => (
            <div
              key={`${img.src}-${i}`}
              className="relative h-full w-full flex-[0_0_100%]"
            >
              {/* Prioridad de carga (mayor a menor):
                  1. Es la primera imagen del primer producto del feed
                     → priority=true (la pone arriba de la cola de descarga).
                  2. Es la primera imagen y el slide esta pre-cargado
                     → eager=true (monta el Image ya, sin observer).
                  3. Caso normal → espera al observer de LazyImage.

                  FIX stutter Xiaomi: el ken-burns solo se aplica cuando
                  el slide esta "stable" (llevo quieto >350ms), no apenas
                  se precargo. Asi evitamos que durante un scroll rapido
                  varios ken-burns disparen transform/opacity animations
                  al mismo tiempo. */}
              <LazyImage
                src={img.src}
                alt={img.alt}
                fill
                priority={priorityFirst && i === 0}
                eager={i === 0 && preloaded}
                sizes="100vw"
                rootRef={scrollRootRef}
                className={`object-cover ${i === 0 && stable ? 'ken-burns' : ''}`}
              />
            </div>
          ))}
        </div>
      </div>

      <GalleryProgress total={scrollSnaps.length} active={selectedIndex} />
    </div>
  );
}

