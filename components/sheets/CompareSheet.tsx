'use client';

import { BottomSheet, useSheetState } from './BottomSheet';
import { useAppState, useAppActions } from '@/components/providers/SheetProvider';
import { products } from '@/lib/products';
import { Scale } from 'lucide-react';

const COMPARE_FIELDS: {
  key:
    | 'specs.movement'
    | 'specs.crystal'
    | 'specs.caseDiameterMm'
    | 'specs.waterResistanceBar'
    | 'specs.strapMaterial'
    | 'priceUSD'
    | 'style';
  label: string;
  format?: (v: any) => string;
}[] = [
  { key: 'priceUSD', label: 'Precio (USD)', format: (v) => `$${v}` },
  { key: 'specs.movement', label: 'Movimiento' },
  { key: 'specs.crystal', label: 'Cristal' },
  {
    key: 'specs.caseDiameterMm',
    label: 'Diámetro',
    format: (v) => `${v} mm`,
  },
  {
    key: 'specs.waterResistanceBar',
    label: 'Resistencia al agua',
    format: (v) => `${v} bar`,
  },
  { key: 'specs.strapMaterial', label: 'Correa' },
  { key: 'style', label: 'Estilo' },
];

function getValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function CompareSheet() {
  const { compareIds } = useAppState();
  const { clearCompare, toggleCompare } = useAppActions();
  const sheet = useSheetState('compare');

  const compareProducts = products.filter((p) => compareIds.includes(p.id));

  return (
    <BottomSheet open={sheet.open} onClose={sheet.onClose} title="Comparar" size="tall">
      {compareProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-white/50">
          <Scale size={32} />
          <p className="text-sm">Aún no agregaste relojes para comparar.</p>
          <p className="text-xs text-white/30">
            Pulsa el botón ⚖️ en cualquier producto.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/60">
              Comparando {compareProducts.length} producto(s).
            </p>
            <button
              onClick={clearCompare}
              className="text-xs font-bold text-brand-accent hover:underline"
            >
              Limpiar
            </button>
          </div>

          {/* Tabla horizontal scrollable. La primera columna (Atributo) queda
              sticky al hacer scroll horizontal, asi siempre sabes que fila estas mirando. */}
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead className="sticky top-0 bg-black/80 backdrop-blur-md">
                <tr>
                  <th className="sticky left-0 z-10 border-b border-r border-white/10 bg-black/80 px-3 py-2 text-left font-title text-[11px] font-semibold uppercase tracking-widest text-white/50">
                    Atributo
                  </th>
                  {compareProducts.map((p) => (
                    <th
                      key={p.id}
                      className="border-b border-white/10 px-3 py-2 text-left text-xs font-bold text-white"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-title text-[10px] font-semibold uppercase tracking-widest text-brand-accent">
                            {p.brand}
                          </p>
                          <p className="text-sm">{p.model}</p>
                        </div>
                        <button
                          aria-label={`Quitar ${p.model}`}
                          onClick={() => toggleCompare(p.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs hover:bg-white/20"
                        >
                          ✕
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_FIELDS.map((field) => (
                  <tr key={field.key}>
                    <td className="sticky left-0 z-10 border-b border-r border-white/5 bg-black/80 px-3 py-2 font-title text-[11px] font-semibold uppercase tracking-widest text-white/50">
                      {field.label}
                    </td>
                    {compareProducts.map((p) => {
                      const v = getValue(p, field.key);
                      return (
                        <td
                          key={p.id}
                          className="border-b border-white/5 px-3 py-2 tabular-nums text-white"
                        >
                          {field.format ? field.format(v) : v ?? '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-white/40">
            Tip: hasta 4 relojes a la vez. Pulsa la ✕ de la cabecera para quitarlos.
          </p>
        </div>
      )}
    </BottomSheet>
  );
}
