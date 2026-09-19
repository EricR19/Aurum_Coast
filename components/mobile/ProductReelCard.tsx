'use client';

import { Scale, Info, Plus, Check } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import clsx from 'clsx';
import { GalleryEmbla } from './GalleryEmbla';
import { StockBadge } from '@/components/ui/StockBadge';
import { IconButton } from '@/components/ui/IconButton';
import { useAppState, useAppActions } from '@/components/providers/SheetProvider';
import { formatCRCOnly } from '@/lib/products';
import { track } from '@/lib/metaPixel';
import type { Product } from '@/lib/types';

interface ProductReelCardProps {
  product: Product;
  /**
   * Referencia al contenedor scroll del feed. Se pasa a la galeria para
   * que su IntersectionObserver considere solo el area visible del feed,
   * no el viewport completo. Asi no descarga imagenes de slides lejanos.
   */
  scrollRootRef?: React.RefObject<HTMLElement>;
  /**
   * Si es el primer producto del feed (no el primer slide, eso es el Hero).
   * Solo la primera imagen del primer producto lleva `priority=true` para
   * mejorar el LCP. El resto se descarga lazy cuando entran al viewport.
   */
  isFirstSlide?: boolean;
}

/**
 * Pantalla 3+ del feed: un producto ocupa `100dvh`.
 * Compone:
 *  - Galería horizontal (Embla).
 *  - Header flotante superior con logo + filtros/búsqueda/carrito.
 *  - Barra lateral derecha estilo TikTok: Comparar y Specs.
 *  - Overlay inferior con glass-morphism: nombre, precio, badge, botón.
 *
 * PERFORMANCE: este componente está envuelto en `React.memo` con un
 * comparador custom. Solo se re-renderiza cuando:
 *   - cambia la referencia del `product` (catalogo + filtros estables),
 *   - cambia `isFirstSlide` (pasa solo cuando se inserta/elimina al inicio),
 *   - cambia `scrollRootRef` (nunca en la práctica; es estable).
 *
 * El estado del comparador (`compareIds`) se traduce a un booleano local
 * memoizado. Asi, un toggle en OTRO producto no invalida este card.
 */
function ProductReelCardImpl({ product, scrollRootRef, isFirstSlide = false }: ProductReelCardProps) {
  const { compareIds } = useAppState();
  const { requestSheet, addToCart, toggleCompare } = useAppActions();

  const [added, setAdded] = useState(false);
  // `isCompared` se recalcula solo cuando `compareIds` cambia (y `product.id`
  // es estable). Asi, agregar otro producto al comparador no causa
  // re-render de este card, solo del card correspondiente.
  const isCompared = useMemo(() => compareIds.includes(product.id), [compareIds, product.id]);

  const handleAddToCart = () => {
    addToCart(product);
    track('AddToCart', {
      content_ids: [product.id],
      content_name: `${product.brand} ${product.model}`,
      value: product.priceUSD,
      currency: 'USD',
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <section
      className="relative h-screen-snap w-full overflow-hidden bg-black"
      data-product-id={product.id}
    >
      <GalleryEmbla
        images={product.images}
        scrollRootRef={scrollRootRef}
        priorityFirst={isFirstSlide}
        onSlideChange={() =>
          track('ViewContent', {
            content_ids: [product.id],
            content_name: `${product.brand} ${product.model}`,
            content_type: 'product',
          })
        }
      />

      {/* NOTA: El FloatingHeader se renderiza UNA vez en MobileFeed, fuera
          del loop de productos. Antes vivia aca (10 instancias) y provocaba
          re-renders innecesarios cuando cambiaba el carrito o el comparador. */}

      {/* Barra lateral derecha estilo TikTok */}
      <aside className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-4">
        <IconButton
          label={isCompared ? 'Quitar del comparador' : 'Comparar'}
          active={isCompared}
          onClick={() => toggleCompare(product.id)}
        >
          {isCompared ? <Check size={20} /> : <Scale size={20} />}
        </IconButton>
        <IconButton
          label="Ver especificaciones"
          onClick={() => requestSheet('specs', product)}
        >
          <Info size={20} />
        </IconButton>
      </aside>

      {/* Overlay inferior: nombre, precio, badge y CTA.
          Padding inferior respeta el area de gestos del celular con fallback
          fijo de 16px (Chrome Android reporta env() = 0). */}
      <div className="absolute inset-x-0 bottom-0 z-20 glass px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-6">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="rounded bg-white/10 px-2 py-0.5 font-title text-[10px] font-semibold uppercase tracking-widest text-brand-accent">
            {product.brand}
          </span>
          <StockBadge text={product.badge} stock={product.stock} />
        </div>

        <h2 className="text-xl font-black leading-tight text-white drop-shadow-md">
          {product.model}
        </h2>
        <p className="mt-0.5 max-w-[80%] text-xs text-white/75">{product.shortDescription}</p>

        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="font-title text-2xl font-bold tabular-nums text-white">{formatCRCOnly(product)}</span>
        </div>

        <button
          onClick={handleAddToCart}
          className={clsx(
            'mt-2 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold transition',
            added
              ? 'bg-green-500 text-white'
              : 'bg-brand-accent text-black hover:bg-yellow-400 active:scale-[0.98]'
          )}
        >
          {added ? (
            <>
              <Check size={18} /> Agregado
            </>
          ) : (
            <>
              <Plus size={18} /> Agregar al carrito
            </>
          )}
        </button>
      </div>
    </section>
  );
}

/**
 * `React.memo` con comparador custom:
 * - `product`: comparacion por REFERENCIA. Funciona porque `applyFilters`
 *   ahora memoiza por (catalogo + filterState), asi que la misma combinacion
 *   devuelve el mismo array con los mismos Product refs adentro.
 * - `scrollRootRef`: estable, vive en MobileFeed. Nunca cambia en la practica.
 * - `isFirstSlide`: solo cambia cuando se inserta/elimina al inicio del feed.
 *
 * Resultado: cualquier dispatch del provider (carrito, comparador, filtros)
 * re-renderiza SOLO los cards afectados, no los 12 a la vez.
 */
export const ProductReelCard = memo(
  ProductReelCardImpl,
  (prev, next) =>
    prev.product === next.product &&
    prev.scrollRootRef === next.scrollRootRef &&
    prev.isFirstSlide === next.isFirstSlide,
);
ProductReelCard.displayName = 'ProductReelCard';
