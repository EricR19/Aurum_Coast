'use client';

import { BottomSheet, useSheetState } from './BottomSheet';
import { useApp } from '@/components/providers/SheetProvider';
import { formatCRC, getPriceCRC } from '@/lib/products';

interface SpecRow {
  label: string;
  value: string | number;
}

function buildRows(p: ReturnType<typeof useApp>['selectedProduct']): SpecRow[] {
  if (!p) return [];
  const s = p.specs;
  return [
    { label: 'Movimiento', value: s.movement },
    { label: 'Cristal', value: s.crystal },
    { label: 'Diámetro de caja', value: `${s.caseDiameterMm} mm` },
    { label: 'Resistencia al agua', value: `${s.waterResistanceBar} bar (${s.waterResistanceBar * 10} m)` },
    { label: 'Material de correa', value: s.strapMaterial },
    { label: 'Material de caja', value: s.caseMaterial ?? 'N/D' },
    { label: 'Peso', value: s.weightG ? `${s.weightG} g` : 'N/D' },
    { label: 'Garantía', value: s.warrantyMonths ? `${s.warrantyMonths} meses` : '12 meses' },
  ];
}

export function SpecsSheet() {
  const { open, onClose, selectedProduct } = useSheetState('specs');
  const rows = buildRows(selectedProduct);

  return (
    <BottomSheet open={open} onClose={onClose} title="Especificaciones">
      {selectedProduct ? (
        <div className="space-y-4">
          <header>
            <p className="font-title text-xs font-semibold uppercase tracking-widest text-brand-accent">
              {selectedProduct.brand}
            </p>
            <h3 className="text-xl font-black">{selectedProduct.model}</h3>
            <p className="text-2xl font-bold">
              {formatCRC(getPriceCRC(selectedProduct.priceUSD))}
            </p>
          </header>

          <dl className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
            {rows.map(({ label, value }, i) => (
              <div
                key={label}
                className={`flex items-center justify-between px-4 py-3 ${
                  i !== rows.length - 1 ? 'border-b border-white/5' : ''
                }`}
              >
                <dt className="text-sm text-white/60">{label}</dt>
                <dd className="text-sm font-semibold text-white">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="text-xs text-white/40">
            * Las especificaciones son proporcionadas por el fabricante y pueden variar
            ligeramente entre lotes.
          </p>
        </div>
      ) : (
        <p className="text-white/60">No hay un producto seleccionado.</p>
      )}
    </BottomSheet>
  );
}
