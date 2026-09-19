'use client';

import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { SearchX } from 'lucide-react';
import { HeroScreen } from './HeroScreen';
import { BrandChips } from './BrandChips';
import { ProductReelCard } from './ProductReelCard';
import { TrustCard } from './TrustCard';
import { SplashScreen } from './SplashScreen';
import { FloatingHeader } from '@/components/ui/FloatingHeader';
import { SheetProvider, useAppState, useAppActions } from '@/components/providers/SheetProvider';
import { products, getAllBrands } from '@/lib/products';
import { applyFilters } from '@/lib/filters';
import { parseHashProductId, scrollToProductAfterSplash } from '@/lib/deepLink';
import { useAppHeight } from '@/lib/useAppHeight';

// Lazy load de TODOS los Bottom Sheets: solo se descargan cuando el usuario
// abre el sheet por primera vez. Esto reduce el bundle inicial y, mas
// importante, evita que los 5 sheets vivan en el árbol React del feed
// (no consumen memoria ni participan en re-renders del contexto cuando
// el usuario no esta interactuando con ellos).
const SpecsSheet = lazy(() =>
  import('@/components/sheets/SpecsSheet').then((m) => ({ default: m.SpecsSheet }))
);
const CompareSheet = lazy(() =>
  import('@/components/sheets/CompareSheet').then((m) => ({ default: m.CompareSheet }))
);
const SearchSheet = lazy(() =>
  import('@/components/sheets/SearchSheet').then((m) => ({ default: m.SearchSheet }))
);
const FiltersSheet = lazy(() =>
  import('@/components/sheets/FiltersSheet').then((m) => ({ default: m.FiltersSheet }))
);
const CartSheet = lazy(() =>
  import('@/components/sheets/CartSheet').then((m) => ({ default: m.CartSheet }))
);

// Funciones de pre-fetch. Guardan la promesa internamente para no
// dispararla dos veces si el usuario hace pointerdown varias veces
// sobre el mismo boton. NO se exportan como default para que solo
// FloatingHeader las use.
export const prefetchSpecsSheet = () =>
  import('@/components/sheets/SpecsSheet');
export const prefetchCompareSheet = () =>
  import('@/components/sheets/CompareSheet');
export const prefetchSearchSheet = () =>
  import('@/components/sheets/SearchSheet');
export const prefetchFiltersSheet = () =>
  import('@/components/sheets/FiltersSheet');
export const prefetchCartSheet = () =>
  import('@/components/sheets/CartSheet');

interface MobileFeedProps {
  storeName: string;
}

/**
 * Feed principal mobile.
 * Renderiza las pantallas en este orden vertical:
 *   1. Hero
 *   2. BrandChips
 *   3..N. ProductReelCard (uno por producto, filtrados por marca)
 *   N+1. TrustCard
 *
 * MOTOR DE NAVEGACION (2026-09-18, "Option B"): el scroll vertical usa el
 * scroll nativo del navegador (momentum/inercia real, sin reinventar el
 * gesto tactil), pero el ALINEADO final a una seccion completa YA NO
 * depende de `scroll-snap-type` de CSS. Ese mecanismo se saco por completo:
 * combinado con capas de composicion (`will-change`) e imagenes pesadas,
 * generaba glitches especificos de GPU/navegador en celulares reales
 * (scroll trabado a mitad de seccion, imagen anterior pegada, saltos raros)
 * que no se podian reproducir ni depurar en desktop. En su lugar, un
 * `useEffect` en `FeedInner` es el UNICO responsable de decidir donde
 * aterriza el scroll: espera a que el scroll se quede quieto y hace
 * `scrollTo({ top, behavior: 'smooth' })` a la seccion mas cercana. Ver
 * ese efecto mas abajo para el detalle.
 *
 * Cualquier Bottom Sheet se monta fuera de este contenedor, en `app.page.tsx`.
 */
function FeedInner({ storeName }: { storeName: string }) {
  useAppHeight();
  const { filters } = useAppState();
  const { clearFilters } = useAppActions();
  const feedRef = useRef<HTMLDivElement | null>(null);
  const [showSplash, setShowSplash] = useState(false);

  const brands = useMemo(() => getAllBrands(), []);
  const filtered = useMemo(() => applyFilters(products, filters), [filters]);

  // Deep linking: si la URL trae `#slug`, muestra splash 500ms y hace scroll.
  useEffect(() => {
    const targetId = parseHashProductId();
    if (!targetId) return;
    setShowSplash(true);
    scrollToProductAfterSplash(feedRef.current, targetId, products, 500).finally(
      () => setShowSplash(false)
    );
  }, []);

  // FIX 2026-09-18: antes `will-change` se prendia/apagaba dinamicamente
  // (solo durante scroll activo) para ahorrar memoria de GPU. El problema:
  // cada vez que arrancaba un scroll, el navegador tenia que promover
  // `<main>` a su propia capa de composicion DE NUEVO -> un frame de
  // "glitch" visible al INICIO de cada navegacion (justo lo que
  // reportaba el usuario, incluso en scroll lento de a un producto).
  // Dejarlo fijo evita esa promocion/democion repetida. El costo de
  // memoria de una sola capa persistente es aceptable frente al glitch.
  const willChange = 'transform' as const;

  // MOTOR DE PAGINADO (Option B): esta es la UNICA logica que decide donde
  // "snapea" el feed. No hay `scroll-snap-type` en el CSS -- se saco por
  // completo (ver comentario de `FeedInner` mas arriba). El scroll en si
  // sigue siendo el nativo del navegador (momentum/inercia reales); esto
  // solo corrige el punto de aterrizaje final.
  //
  // FIX 2026-09-18 "swipe rapido por 3 fotos y se devuelve a una anterior":
  // la version anterior esperaba a que dejaran de llegar eventos `scroll`
  // por 200ms para asumir que el scroll estaba quieto. Con 3 imagenes
  // decodificando a la vez (main thread ocupado), el navegador puede dejar
  // de despachar eventos `scroll` por mas de 200ms A MITAD del momentum
  // nativo (el scroll compositor-thread sigue moviendose, solo que el
  // evento no llega al JS a tiempo). Eso hacia que "snapToNearest" se
  // disparara con un `scrollTop` todavia intermedio, calculara la seccion
  // mas cercana EN ESE INSTANTE (una anterior a donde el fling realmente
  // iba) y la forzara con `scrollTo` -> se ve como si "se devolviera".
  //
  // Ahora medimos `el.scrollTop` directamente en cada frame (`rAF`), sin
  // depender de si el evento `scroll` llega o no. Solo se considera
  // "quieto" cuando el valor NO cambio en 6 frames seguidos (~100ms de
  // posicion real sin moverse, no solo sin eventos). Esto es inmune a que
  // el hilo principal este ocupado decodificando imagenes: si el scroll
  // compositor-thread todavia se esta moviendo, lo vamos a detectar en el
  // proximo frame que el hilo principal pueda ejecutar.
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const STABLE_FRAMES_NEEDED = 6;
    let rafId: number;
    let lastTop = el.scrollTop;
    let stableFrames = 0;
    let pendingCorrection = false;
    let touching = false;

    const snapToNearest = () => {
      const sections = Array.from(el.children) as HTMLElement[];
      if (sections.length === 0) return;
      const scrollTop = el.scrollTop;
      let nearest = sections[0];
      let nearestDist = Math.abs(nearest.offsetTop - scrollTop);
      for (const section of sections) {
        const dist = Math.abs(section.offsetTop - scrollTop);
        if (dist < nearestDist) {
          nearest = section;
          nearestDist = dist;
        }
      }
      // Solo corregir si quedo a mas de 2px del punto de snap: evita
      // pelear con el scroll nativo cuando ya alineo bien.
      if (nearestDist > 2) {
        el.scrollTo({ top: nearest.offsetTop, behavior: 'smooth' });
      }
    };

    const tick = () => {
      const top = el.scrollTop;
      if (Math.abs(top - lastTop) > 0.5) {
        stableFrames = 0;
        pendingCorrection = true;
      } else {
        stableFrames++;
      }
      lastTop = top;

      if (!touching && pendingCorrection && stableFrames >= STABLE_FRAMES_NEEDED) {
        pendingCorrection = false;
        snapToNearest();
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    // Un toque nuevo cancela cualquier intento de corregir: nunca debe
    // pelear un `scrollTo` programatico contra un gesto activo del usuario.
    const onTouchStart = () => {
      touching = true;
      pendingCorrection = false;
    };
    const onTouchEnd = () => {
      touching = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  return (
    <>
      <SplashScreen visible={showSplash} storeName={storeName} />
      {/* PERFORMANCE: el contenedor del feed vive en `position: fixed`
          para aislar su repaint del `<body>`. Antes era `position: relative`,
          y cualquier cambio de estilo en el body (toolbar de Chrome moviendose,
          header ocultandose) forzaba re-layout del feed completo. Con fixed,
          el feed tiene su propio layer del compositor y se re-pinta solo.

          CAMBIOS para fix de stutter en Xiaomi (MIUI Chromium):
          - `overflow-y-scroll` -> `overflow-y-auto`. Evita el bug conocido
            de MIUI donde `overflow-y: scroll` con `position: fixed` genera
            frames duplicados durante scroll rapido.
          - Agregamos `overscroll-behavior-y: contain` para que el rubber
            band del browser no se propague al body.

          SIN `scroll-snap-type` (2026-09-18, "Option B"): se probo
          `snap-mandatory` y despues `snap-proximity`, y ambos generaban
          glitches en celulares reales (scroll trabado a mitad de seccion,
          imagen anterior pegada al hacer scroll rapido) al combinarse con
          las capas de composicion de las imagenes. En vez de seguir
          parchando el snap nativo, se saco por completo: el scroll es
          100% nativo (momentum real) y el aterrizaje final a una seccion
          completa lo decide JS (ver el `useEffect` de "MOTOR DE PAGINADO"
          mas arriba en este archivo). */}
      <main
        ref={feedRef}
        style={{ willChange }}
        className="fixed inset-0 h-screen-snap w-full overflow-y-auto scrollbar-none"
      >
        <HeroScreen storeName={storeName} />
        <BrandChips brands={brands} />
        {filtered.length === 0 ? (
          <EmptyFilters onClear={clearFilters} />
        ) : (
          filtered.map((product, idx) => (
            <ProductReelCard
              key={product.id}
              product={product}
              scrollRootRef={feedRef}
              isFirstSlide={idx === 0}
            />
          ))
        )}
        <TrustCard />
      </main>
      {/* FloatingHeader una sola vez, fuera del loop. Antes vivia dentro de
          cada ProductReelCard (10 instancias), lo que provocaba 10 re-renders
          cuando cambiaba el carrito o el comparador. z-50 lo pone sobre
          todo (encima del feed y de los overlays de los ReelCards). */}
      <FloatingHeader />
    </>
  );
}

/**
 * Pantalla que se muestra cuando la combinacion de filtros activos no devuelve
 * ningun producto. Da contexto al usuario y una salida clara (limpiar filtros)
 * sin necesidad de abrir el sheet.
 */
function EmptyFilters({ onClear }: { onClear: () => void }) {
  return (
    <section
      className="relative flex h-screen-snap w-full flex-col items-center justify-center bg-black px-6 text-center"
      data-empty-filters
    >
      <div className="flex max-w-sm flex-col items-center gap-4">
        <div className="rounded-full bg-white/5 p-5">
          <SearchX size={36} className="text-white/40" />
        </div>
        <h2 className="text-xl font-bold text-white">
          No hay relojes con esos filtros
        </h2>
        <p className="text-sm text-white/60">
          Proba quitar alguno o limpia todos para ver el catalogo completo.
        </p>
        <button
          type="button"
          onClick={onClear}
          className="mt-2 rounded-full bg-brand-accent px-6 py-2.5 text-sm font-bold text-black hover:bg-yellow-400 active:scale-[0.98]"
        >
          Limpiar filtros
        </button>
      </div>
    </section>
  );
}

export function MobileFeed({ storeName }: MobileFeedProps) {
  return (
    <SheetProvider>
      <FeedInner storeName={storeName} />
      {/* Los Bottom Sheets se montan al nivel superior del provider,
          fuera del contenedor con scroll-snap para que la animacion de
          Framer Motion no se rompa al estar dentro de un scroll anidado.
          TODOS los sheets son lazy: no se descargan hasta que se abren
          por primera vez. Esto evita que vivan en el árbol React y
          participen en re-renders del contexto cuando no se usan. */}
      <Suspense fallback={null}>
        <SpecsSheet />
        <CompareSheet />
        <SearchSheet />
        <FiltersSheet />
        <CartSheet />
      </Suspense>
    </SheetProvider>
  );
}
