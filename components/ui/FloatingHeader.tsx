'use client';

import { SlidersHorizontal, Search, ShoppingBag, Scale } from 'lucide-react';
import { IconButton } from './IconButton';
import { useApp } from '@/components/providers/SheetProvider';
import { useMemo } from 'react';
import Image from 'next/image';

/**
 * Header transparente fixed en la parte superior del feed móvil.
 * - Izquierda: logo de la tienda.
 * - Derecha: comparador / filtros / buscar / carrito (con badge de count).
 *
 * El orden de los botones coincide con el spec del proyecto:
 * "Filtros", "Buscar", "Carrito". Añadimos un botón de Comparador
 * con badge que muestra cuántos relojes hay en el comparador.
 */
export function FloatingHeader() {
  const { requestSheet, cart, compareIds } = useApp();
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
          onClick={() => requestSheet('filters')}
        >
          <SlidersHorizontal size={18} />
        </IconButton>
        <IconButton
          label="Buscar"
          onClick={() => requestSheet('search')}
        >
          <Search size={18} />
        </IconButton>
        <IconButton
          label={`Comparador (${compareIds.length} seleccionados)`}
          onClick={() => requestSheet('compare')}
          badge={compareIds.length > 0 ? compareIds.length : undefined}
        >
          <Scale size={18} />
        </IconButton>
        <IconButton
          label={`Carrito (${cartCount} productos)`}
          onClick={() => requestSheet('cart')}
          badge={cartCount > 0 ? cartCount : undefined}
        >
          <ShoppingBag size={18} />
        </IconButton>
      </nav>
    </header>
  );
}
