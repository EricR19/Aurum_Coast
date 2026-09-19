'use client';

import { Scale, Info, Plus, Check } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { GalleryEmbla } from './GalleryEmbla';
import { StockBadge } from '@/components/ui/StockBadge';
import { IconButton } from '@/components/ui/IconButton';
import { useApp } from '@/components/providers/SheetProvider';
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
 */
export function ProductReelCard({ product, scrollRootRef, isFirstSlide = false }: ProductReelCardProps) {
  const {
    requestSheet,
    addToCart,
    toggleCompare,
    compareIds,
  } = useApp();

  const [added, setAdded] = useState(false);
  const isCompared = compareIds.includes(product.id);

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
      className="relative h-screen-snap w-full snap-start overflow-hidden bg-black"
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
