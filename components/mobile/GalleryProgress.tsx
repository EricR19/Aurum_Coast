'use client';

import clsx from 'clsx';

interface GalleryProgressProps {
  total: number;
  active: number;
}

/**
 * Barras de progreso delgadas superiores, estilo Instagram.
 * Cada slide tiene una barra horizontal; la activa se rellena suavemente.
 */
export function GalleryProgress({ total, active }: GalleryProgressProps) {
  if (total <= 1) return null;
  return (
    <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pt-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'h-[3px] flex-1 overflow-hidden rounded-full bg-white/30'
          )}
        >
          <div
            className={clsx(
              'h-full bg-white transition-all duration-300',
              i < active && 'w-full',
              i === active && 'w-3/4 animate-pulse',
              i > active && 'w-0'
            )}
            style={{
              // Para una barra "activa" más ancha que la pasiva, se puede
              // animar con width al 100% en onSelect; aquí la marcamos llena.
              width: i === active ? '100%' : undefined,
              transitionProperty: 'width',
              transitionDuration: '400ms',
            }}
          />
        </div>
      ))}
    </div>
  );
}
