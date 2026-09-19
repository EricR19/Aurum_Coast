'use client';

import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';
import { products, getAllBrands } from '@/lib/products';
import { formatCRC, getPriceCRC } from '@/lib/products';
import { applyFilters } from '@/lib/filters';
import { SheetProvider, useAppState, useAppActions } from '@/components/providers/SheetProvider';
import { StockBadge } from '@/components/ui/StockBadge';

/**
 * Vista de catálogo tradicional (>= 768px).
 * Sidebar de filtros funcional: comparte estado con SheetProvider
 * (mismo useApp() que el feed móvil), de modo que el filtro aplicado en
 * desktop se respeta si el usuario redimensiona a móvil.
 *
 * Cada link profundo `#slug` funciona también en escritorio.
 */
function DesktopGridInner() {
  const { filters } = useAppState();
  const { setBrand } = useAppActions();
  const brands = getAllBrands();
  const filtered = applyFilters(products, filters);

  return (
    <div className="flex min-h-screen w-full bg-zinc-50 text-zinc-900">
      {/* Sidebar de filtros (funcional, sincronizado con el feed móvil) */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-zinc-200 bg-white p-6 lg:block">
        <h2 className="mb-4 font-title text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Catálogo
        </h2>
        <nav className="flex flex-col gap-2 text-sm">
          {brands.map((b) => {
            const active = filters.brand === b;
            return (
              <button
                key={b}
                type="button"
                onClick={() => setBrand(b)}
                aria-pressed={active}
                className={clsx(
                  'rounded-lg px-3 py-2 text-left font-medium transition',
                  active
                    ? 'bg-brand-accent text-black'
                    : 'text-zinc-700 hover:bg-zinc-100'
                )}
              >
                {b}
              </button>
            );
          })}
        </nav>

        <p className="mt-8 text-xs text-zinc-400">
          En móvil la experiencia se transforma automáticamente a un feed
          inmersivo tipo Reel/TikTok. El filtro de marca se mantiene al cambiar
          de breakpoint.
        </p>
      </aside>

      {/* Cuadrícula */}
      <main className="flex-1 px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-zinc-900">Relojes de alta gama</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Catálogo completo · Compra directo por WhatsApp
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {filtered.length} producto{filtered.length === 1 ? '' : 's'} mostrado
            {filtered.length === 1 ? '' : 's'}.
          </p>
        </header>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-16 text-center">
            <p className="text-sm font-medium text-zinc-700">
              No hay relojes con los filtros activos.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Probá cambiar la marca seleccionada en el sidebar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Link
                key={p.id}
                href={`/#${p.slug}`}
                className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-lg"
              >
                <div className="relative aspect-square overflow-hidden bg-zinc-100">
                  {p.images[0] && (
                    <Image
                      src={p.images[0].src}
                      alt={p.images[0].alt}
                      fill
                      sizes="(min-width: 1024px) 33vw, 50vw"
                      className="object-cover transition group-hover:scale-105"
                    />
                  )}
                  {p.badge && (
                    <div className="absolute left-3 top-3">
                      <StockBadge text={p.badge} stock={p.stock} />
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <p className="font-title text-[11px] font-semibold uppercase tracking-widest text-brand-accent">
                    {p.brand}
                  </p>
                  <h3 className="mt-1 text-base font-bold text-zinc-900">{p.model}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                    {p.shortDescription}
                  </p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-title text-xl font-bold tabular-nums text-zinc-900">
                      {formatCRC(getPriceCRC(p.priceUSD))}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <footer className="mt-12 text-center text-xs text-zinc-400">
          Vista de escritorio generada por AURUM COAST. v0.1
        </footer>
      </main>
    </div>
  );
}

/**
 * Componente público: envuelve el contenido en SheetProvider para que el
 * sidebar pueda usar useApp(). Como SheetProvider ya se monta en MobileFeed,
 * y ambos viven en ramas distintas del árbol (mobile vs desktop) gracias al
 * breakpoint de Tailwind, no hay colisión.
 */
export function DesktopGrid() {
  return (
    <SheetProvider>
      <DesktopGridInner />
    </SheetProvider>
  );
}
