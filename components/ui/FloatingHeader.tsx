'use client';

import { SlidersHorizontal, Search, ShoppingBag, Scale } from 'lucide-react';
import { IconButton } from './IconButton';
import { useAppState, useAppActions } from '@/components/providers/SheetProvider';
import { useMemo } from 'react';
import Image from 'next/image';
import {
  prefetchFiltersSheet,
  prefetchSearchSheet,
  prefetchCompareSheet,
  prefetchCartSheet,
} from '@/components/mobile/MobileFeed';

/**
 * Header transparente fixed en la parte superior del feed móvil.
 * - Izquierda: logo de la tienda.
 * - Derecha: comparador / filtros / buscar / carrito (con badge de count).
 *
 * El orden de los botones coincide con el spec del proyecto:
 * "Filtros", "Buscar", "Carrito". Añadimos un botón de Comparador
 * con badge que muestra cuántos relojes hay en el comparador.
 *
 * PERFORMANCE: cada botón hace `prefetch*` en `pointerdown`. Esto captura
 * la intención real del usuario ANTES del `click` (que es donde se dispara
 * la descarga del chunk lazy). En el momento del click, el chunk ya esta
 * descargado (o en vuelo) y el sheet abre con su animacion normal sin
 * "flash" de Suspense. NO usamos `hover` ni `focus` porque en mobile
 * el primero es ruidoso (touch genera hover transitorios) y el segundo
 * no se dispara con el flujo natural de un toque.
 */
export function FloatingHeader() {
  const { cart, compareIds } = useAppState();
  const { requestSheet } = useAppActions();
  const cartCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart]
  );

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between p-4 pt-6">
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="relative h-11 w-11 overflow-hidden rounded-full bg-black/80 backdrop-blur-md ring-1 ring-white/10">
          <Image
            src="/banners/aurum-coast-icon-clean-256sq.png"
            alt={process.env.NEXT_PUBLIC_STORE_NAME ?? 'AURUM COAST'}
            fill
            sizes="44px"
            priority
            className="object-contain p-1"
          />
        </div>
      </div>

      <nav className="pointer-events-auto flex items-center gap-2">
        <IconButton
          label="Filtros y ordenamiento"
          onPointerDown={prefetchFiltersSheet}
          onClick={() => requestSheet('filters')}
        >
          <SlidersHorizontal size={18} />
        </IconButton>
        <IconButton
          label="Buscar"
          onPointerDown={prefetchSearchSheet}
          onClick={() => requestSheet('search')}
        >
          <Search size={18} />
        </IconButton>
        <IconButton
          label={`Comparador (${compareIds.length} seleccionados)`}
          onPointerDown={prefetchCompareSheet}
          onClick={() => requestSheet('compare')}
          badge={compareIds.length > 0 ? compareIds.length : undefined}
        >
          <Scale size={18} />
        </IconButton>
        <IconButton
          label={`Carrito (${cartCount} productos)`}
          onPointerDown={prefetchCartSheet}
          onClick={() => requestSheet('cart')}
          badge={cartCount > 0 ? cartCount : undefined}
        >
          <ShoppingBag size={18} />
        </IconButton>
      </nav>
    </header>
  );
}
