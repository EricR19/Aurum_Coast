import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string; // a11y
  active?: boolean;
  badge?: number | string;
}

/**
 * Botón circular compacto, usado en la barra lateral del Reel
 * (Comparar, Specs) y en el header flotante (Filtros, Buscar, Carrito).
 *
 * Performance:
 * - Antes: `backdrop-blur-md` (blur de 12px en el fondo). En el feed
 *   teniamos 24 instancias (2 por slide x 12 productos) con blur permanente
 *   compitiendo con el compositor del scroll vertical. En mobile gama
 *   media-baja esto cuesta ~5ms/frame y rompe los 60fps.
 * - Ahora: `bg-zinc-900/85` solido + `ring-1`. Visualmente casi identico,
 *   sin costo de composicion. El look glass-morphism se preserva con el
 *   gradiente del overlay inferior (.glass).
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, active, badge, className, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        className={clsx(
          'relative flex items-center justify-center rounded-full',
          'h-11 w-11 bg-zinc-900/85 text-white',
          'transition active:scale-95 hover:bg-zinc-900',
          'ring-1 ring-white/10',
          active && 'bg-brand-accent text-black ring-0',
          className
        )}
        {...rest}
      >
        {children}
        {badge != null && (
          <span
            className={clsx(
              'absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full',
              'bg-brand-accent px-1 text-[10px] font-bold text-black shadow-md'
            )}
            aria-hidden
          >
            {badge}
          </span>
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
