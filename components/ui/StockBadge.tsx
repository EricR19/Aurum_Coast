import clsx from 'clsx';

interface StockBadgeProps {
  text?: string | null;
  stock?: number;
}

/**
 * Insignia pequeña mostrada en el overlay inferior de cada Reel.
 * - Si hay badge explícito (Nuevo / Best Seller / Últimas unidades) → muestra eso.
 * - Si no, evalúa el stock: <=3 = "Últimas unidades", 0 = "Agotado".
 */
export function StockBadge({ text, stock }: StockBadgeProps) {
  if (text) {
    const isLastUnits = text === 'Últimas unidades';
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-title text-[10px] font-semibold uppercase tracking-widest',
          isLastUnits ? 'bg-red-500/90 text-white' : 'bg-brand-accent text-black'
        )}
      >
        {text}
      </span>
    );
  }

  if (typeof stock === 'number') {
    if (stock === 0)
      return <span className="rounded-full bg-zinc-700 px-2.5 py-0.5 font-title text-[10px] font-semibold uppercase tracking-widest text-white">Agotado</span>;
    if (stock <= 3)
      return <span className="rounded-full bg-red-500/90 px-2.5 py-0.5 font-title text-[10px] font-semibold uppercase tracking-widest text-white">Últimas unidades</span>;
  }

  return null;
}
