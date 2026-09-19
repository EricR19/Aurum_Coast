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
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, active, badge, className, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        className={clsx(
          'relative flex items-center justify-center rounded-full',
          'h-11 w-11 bg-black/80 text-white',
          'transition active:scale-95 hover:bg-black/60',
          'ring-1 ring-white/10 backdrop-blur-md',
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
