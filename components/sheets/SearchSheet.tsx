'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Search, X } from 'lucide-react';
import { BottomSheet, useSheetState } from './BottomSheet';
import { searchProducts } from '@/lib/search';
import { formatCRCOnly, products as catalog } from '@/lib/products';
import { scrollToProduct } from '@/lib/deepLink';
import { track } from '@/lib/metaPixel';
import type { Product } from '@/lib/types';

/**
 * Bottom Sheet de busqueda fuzzy.
 * - Autofocus al abrir.
 * - Busqueda en vivo por keystroke.
 * - Tap en resultado: cierra sheet + scroll al slide del producto.
 * - Track de busquedas a Meta Pixel.
 */
export function SearchSheet() {
  const sheet = useSheetState('search');
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sheet.open) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
    setQuery('');
    return undefined;
  }, [sheet.open]);

  const results = useMemo(() => searchProducts(query), [query]);

  useEffect(() => {
    if (query.trim().length >= 2) {
      track('Search', {
        search_string: query.trim(),
        result_count: results.length,
      });
    }
  }, [query, results.length]);

  const handleSelect = (product: Product) => {
    sheet.onClose();
    // El feed esta en un contenedor con `overflow-y-scroll snap-y`.
    // Lo identificamos por la clase `h-screen-snap` (unica en la pagina).
    const container = document.querySelector<HTMLElement>('main.h-screen-snap');
    if (!container) return;
    // Usamos scrollToProduct que scrollea programaticamente el contenedor,
    // respetando el scroll-snap. Antes se usaba slide.scrollIntoView() que
    // opera sobre el viewport del navegador y termina saltando al final
    // del scroll (TrustCard) cuando falla el snap. Ver lib/deepLink.ts.
    setTimeout(() => {
      scrollToProduct(container, product.id, catalog, 0);
    }, 200);
  };

  return (
    <BottomSheet open={sheet.open} onClose={sheet.onClose} title="Buscar" size="tall">
      <div className="space-y-4">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por marca, modelo o estilo..."
            className="w-full rounded-full border border-white/10 bg-black/30 py-3 pl-10 pr-10 text-sm text-white placeholder-white/30 focus:border-brand-accent focus:outline-none"
          />
          {query.length > 0 && (
            <button
              type="button"
              aria-label="Limpiar busqueda"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {query.trim().length < 2 ? (
          <EmptyState />
        ) : results.length === 0 ? (
          <NoResults query={query} />
        ) : (
          <ul className="space-y-2">
            {results.map((p) => (
              <ResultRow key={p.id} product={p} onSelect={handleSelect} />
            ))}
          </ul>
        )}
      </div>
    </BottomSheet>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-white/40">
      <Search size={32} />
      <p className="text-sm">Empezá a escribir para buscar.</p>
      <p className="text-xs text-white/30">Probá con &quot;Seiko&quot;, &quot;Tissot&quot; o &quot;diving&quot;.</p>
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-white/50">
      <Search size={28} className="text-white/30" />
      <p className="text-sm">
        No encontramos nada para &quot;<span className="text-white">{query.trim()}</span>&quot;.
      </p>
      <p className="text-xs text-white/30">Probá con menos letras o sin acentos.</p>
    </div>
  );
}

function ResultRow({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (p: Product) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(product)}
        className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-brand-accent/40 hover:bg-black/30 active:scale-[0.98]"
      >
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-800">
          {product.images[0] && (
            <Image
              src={product.images[0].src}
              alt={product.images[0].alt}
              fill
              sizes="64px"
              className="object-cover"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-title text-[10px] font-semibold uppercase tracking-widest text-brand-accent">
            {product.brand}
          </p>
          <p className="truncate text-sm font-bold text-white">{product.model}</p>
          <p className="truncate text-xs text-white/50">{product.shortDescription}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="font-title text-sm font-bold tabular-nums text-white">
            {formatCRCOnly(product)}
          </p>
        </div>
      </button>
    </li>
  );
}
