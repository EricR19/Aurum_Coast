'use client';

import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { BottomSheet, useSheetState } from './BottomSheet';
import { useApp } from '@/components/providers/SheetProvider';
import { products, getAllBrands } from '@/lib/products';
import type { Movement, SortKey, Style } from '@/lib/types';
import clsx from 'clsx';

const MOVEMENTS: Movement[] = ['Automático', 'Cuarzo', 'Mecánico', 'Solar'];
const STYLES: Style[] = ['Deportivo', 'Elegante', 'Casual', 'Diving', 'Cronógrafo'];
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'popularity', label: 'Más populares' },
  { key: 'price_asc', label: 'Precio: menor a mayor' },
  { key: 'price_desc', label: 'Precio: mayor a menor' },
];

export function FiltersSheet() {
  const {
    filters,
    setBrand,
    setMovement,
    setStyle,
    setPriceRange,
    setSort,
    clearFilters,
  } = useApp();
  const sheet = useSheetState('filters');

  // Estado local para inputs de precio (debounce).
  const [minStr, setMinStr] = useState(filters.minPrice?.toString() ?? '');
  const [maxStr, setMaxStr] = useState(filters.maxPrice?.toString() ?? '');

  // Sincronizar inputs locales con el state global al abrir.
  useEffect(() => {
    if (sheet.open) {
      setMinStr(filters.minPrice?.toString() ?? '');
      setMaxStr(filters.maxPrice?.toString() ?? '');
    }
  }, [sheet.open, filters.minPrice, filters.maxPrice]);

  // Debounce para aplicar el rango de precio cuando el usuario termina de tipear.
  useEffect(() => {
    const t = setTimeout(() => {
      const min = minStr === '' ? undefined : Number(minStr);
      const max = maxStr === '' ? undefined : Number(maxStr);
      setPriceRange(min, max);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minStr, maxStr]);

  const brands = getAllBrands();
  const minCatalog = Math.min(...products.map((p) => p.priceUSD));
  const maxCatalog = Math.max(...products.map((p) => p.priceUSD));

  // Detecta si hay algun filtro distinto del default (para mostrar u ocultar "Limpiar").
  const hasActiveFilters =
    filters.brand !== 'Todos' ||
    filters.movement !== null ||
    filters.style !== null ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.sort !== 'popularity';

  // Toggle: si el usuario toca el chip ya seleccionado, lo deselecciona.
  const toggleBrand = (b: string) => setBrand(filters.brand === b ? 'Todos' : b);
  const toggleMovement = (m: Movement) =>
    setMovement(filters.movement === m ? null : m);
  const toggleStyle = (s: Style) => setStyle(filters.style === s ? null : s);

  return (
    <BottomSheet open={sheet.open} onClose={sheet.onClose} title="Filtros y orden" size="tall">
      <div className="space-y-6">
        {/* Boton limpiar sutil, arriba a la derecha. Solo visible si hay filtros activos. */}
        {hasActiveFilters && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                clearFilters();
                setMinStr('');
                setMaxStr('');
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-accent/30 bg-brand-accent/10 px-3 py-1 text-xs font-bold text-brand-accent hover:bg-brand-accent/20"
            >
              <RotateCcw size={12} className="shrink-0" />
              Limpiar filtros
            </button>
          </div>
        )}

        <Section title="Marca">
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <button
                key={b}
                onClick={() => toggleBrand(b)}
                className={clsx(
                  'rounded-full border px-3 py-1.5 text-xs font-bold transition',
                  filters.brand === b
                    ? 'border-brand-accent bg-brand-accent text-black'
                    : 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Movimiento">
          <Pills
            options={MOVEMENTS.map((m) => ({ label: m, value: m }))}
            value={filters.movement}
            onSelect={(v) => toggleMovement(v as Movement)}
          />
        </Section>

        <Section title="Estilo">
          <Pills
            options={STYLES.map((s) => ({ label: s, value: s }))}
            value={filters.style}
            onSelect={(v) => toggleStyle(v as Style)}
          />
        </Section>

        <Section title="Rango de precio (USD)">
          <div className="flex items-center gap-2">
            <NumberInput
              placeholder="Mín"
              value={minStr}
              onChange={setMinStr}
            />
            <span className="text-white/40">—</span>
            <NumberInput
              placeholder="Máx"
              value={maxStr}
              onChange={setMaxStr}
            />
          </div>
          <p className="mt-2 text-[11px] text-white/40">
            Rango actual del catálogo: ${minCatalog} — ${maxCatalog}.
          </p>
        </Section>

        <Section title="Ordenar por">
          <div className="space-y-2">
            {SORTS.map(({ key, label }) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm"
              >
                <input
                  type="radio"
                  name="sort"
                  checked={filters.sort === key}
                  onChange={() => setSort(key)}
                  className="accent-brand-accent"
                />
                {label}
              </label>
            ))}
          </div>
        </Section>

        <p className="pt-2 text-[11px] text-white/40">
          Los filtros se aplican automáticamente.
        </p>
      </div>
    </BottomSheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 font-title text-[11px] font-semibold uppercase tracking-widest text-white/50">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Pills({
  options,
  value,
  onSelect,
}: {
  options: { label: string; value: string }[];
  value: string | null | undefined;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onSelect(o.value)}
          className={clsx(
            'rounded-full border px-3 py-1.5 text-xs font-bold transition',
            value === o.value
              ? 'border-brand-accent bg-brand-accent text-black'
              : 'border-white/15 bg-white/5 text-white hover:bg-white/10'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function NumberInput(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-accent focus:outline-none"
    />
  );
}
