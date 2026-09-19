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
  const containerRef = useRef<HTMLDivElement>(null);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const idx = emblaApi.selectedScrollSnap();
    setSelectedIndex(idx);
    onSlideChange?.(idx);
  }, [emblaApi, onSlideChange]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Observer que detecta cuando este slide esta a <=1 viewport del actual.
  // Cuando entra en ese rango, pre-carga la primera imagen.
  // rootMargin '-50% 0px 50% 0px' = "el borde superior esta a 50% del
  // viewport debajo del borde superior del root". Esto basicamente detecta
  // cuando el slide esta justo despues del actual.
  useEffect(() => {
    // El primer producto ya se carga por priority, no necesita observer.
    if (priorityFirst) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // entry.boundingClientRect.top nos dice donde esta el slide
        // relativo al viewport. Si esta entre 0 y 100vh abajo del top
        // del viewport, es el "siguiente slide".
        const top = entry.boundingClientRect.top;
        const viewportH = window.innerHeight;
        if (entry.isIntersecting && top > 0 && top < viewportH) {
          setPreloaded(true);
          observer.disconnect();
        }
      },
      {
        root: scrollRootRef?.current ?? null,
        // Detecta cuando el slide esta entre el borde inferior del viewport
        // actual y 1 viewport hacia abajo.
        rootMargin: '0px 0px 100% 0px',
        threshold: [0, 0.5, 1],
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollRootRef, priorityFirst]);

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
                  3. Caso normal → espera al observer de LazyImage. */}
              <LazyImage
                src={img.src}
                alt={img.alt}
                fill
                priority={priorityFirst && i === 0}
                eager={i === 0 && preloaded}
                sizes="100vw"
                rootRef={scrollRootRef}
                className={`object-cover ${i === 0 && preloaded ? 'ken-burns' : ''}`}
              />
            </div>
          ))}
        </div>
      </div>

      <GalleryProgress total={scrollSnaps.length} active={selectedIndex} />
    </div>
  );
}

