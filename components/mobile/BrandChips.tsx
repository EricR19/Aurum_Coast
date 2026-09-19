'use client';

import clsx from 'clsx';
import { useAppState, useAppActions } from '@/components/providers/SheetProvider';

interface BrandChipsProps {
  brands: string[];
}

/**
 * Pantalla 2 — Chips horizontales de marca.
 * Al pulsar uno, setea `activeBrand` en el SheetProvider y filtra el feed.
 * El slide en sí NO cambia, pero el `MobileFeed` lo lee y re-aplica los filtros.
 */
export function BrandChips({ brands }: BrandChipsProps) {
  const { activeBrand } = useAppState();
  const { setBrand } = useAppActions();

  return (
    <section
      id="brand-chips"
      className="relative flex h-screen-snap w-full flex-col items-center justify-center bg-zinc-950 px-4"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_60%)]" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <h2 className="mb-1 font-title text-sm font-semibold uppercase tracking-[0.3em] text-brand-accent">
          Elige tu marca
        </h2>
        <p className="mb-6 text-2xl font-black text-white">Filtra por tu estilo</p>

        <div className="flex w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-none">
          {brands.map((b) => {
            const active = activeBrand === b;
            return (
              <button
                key={b}
                onClick={() => setBrand(b)}
                className={clsx(
                  'flex-shrink-0 snap-center rounded-full border px-5 py-2.5 text-sm font-bold transition',
                  active
                    ? 'border-brand-accent bg-brand-accent text-black'
                    : 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                )}
              >
                {b}
              </button>
            );
          })}
        </div>

        <p className="mt-10 text-xs text-white/40">
          O simplemente desliza hacia abajo para ver todo el catálogo ↓
        </p>
      </div>
    </section>
  );
}
