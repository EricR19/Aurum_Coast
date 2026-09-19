'use client';

import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { SearchX } from 'lucide-react';
import { HeroScreen } from './HeroScreen';
import { BrandChips } from './BrandChips';
import { ProductReelCard } from './ProductReelCard';
import { TrustCard } from './TrustCard';
import { SplashScreen } from './SplashScreen';
import { FloatingHeader } from '@/components/ui/FloatingHeader';
import { SheetProvider, useApp } from '@/components/providers/SheetProvider';
import { FiltersSheet } from '@/components/sheets/FiltersSheet';
import { CartSheet } from '@/components/sheets/CartSheet';
import { products, getAllBrands } from '@/lib/products';
import { applyFilters } from '@/lib/filters';
import { parseHashProductId, scrollToProductAfterSplash } from '@/lib/deepLink';
import { useAppHeight } from '@/lib/useAppHeight';

// Lazy load de sheets pesados: solo se descargan cuando el usuario abre el sheet por primera vez.
// Reduce el bundle inicial (~78 kB) y mejora TTI en mobile.
const SpecsSheet = lazy(() =>
  import('@/components/sheets/SpecsSheet').then((m) => ({ default: m.SpecsSheet }))
);
const CompareSheet = lazy(() =>
  import('@/components/sheets/CompareSheet').then((m) => ({ default: m.CompareSheet }))
);
const SearchSheet = lazy(() =>
  import('@/components/sheets/SearchSheet').then((m) => ({ default: m.SearchSheet }))
);

interface MobileFeedProps {
  storeName: string;
}

/**
 * Feed principal mobile.
 * Renderiza las pantallas en este orden vertical, todas con `snap-y snap-mandatory`:
 *   1. Hero
 *   2. BrandChips
 *   3..N. ProductReelCard (uno por producto, filtrados por marca)
 *   N+1. TrustCard
 *
 * Cualquier Bottom Sheet se monta fuera de este contenedor, en `app.page.tsx`.
 */
function FeedInner({ storeName }: { storeName: string }) {
  useAppHeight();
  const { filters, clearFilters } = useApp();
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

  return (
    <>
      <SplashScreen visible={showSplash} storeName={storeName} />
      <main
        ref={feedRef}
        className="relative h-screen-snap w-full overflow-y-scroll snap-y snap-mandatory scrollbar-none"
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
      className="relative flex h-screen-snap w-full snap-start flex-col items-center justify-center bg-black px-6 text-center"
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
          Los 3 sheets pesados (Specs, Compare, Search) son lazy: no se
          descargan hasta que se abren por primera vez. */}
      <Suspense fallback={null}>
        <SpecsSheet />
        <CompareSheet />
        <SearchSheet />
      </Suspense>
      <FiltersSheet />
      <CartSheet />
    </SheetProvider>
  );
}
