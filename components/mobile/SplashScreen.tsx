'use client';

import Image from 'next/image';

interface SplashScreenProps {
  visible: boolean;
  /** Nombre de la tienda (env) para mostrar en el splash */
  storeName?: string;
}

/**
 * Pantalla de carga mostrada brevemente cuando se entra por deep link `#slug`.
 * Fondo negro, logo AURUM COAST palpitando. Se desvanece (fade out) al ocultarse.
 */
export function SplashScreen({ visible, storeName }: SplashScreenProps) {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label="Cargando"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-300"
    >
      <div className="relative h-56 w-[28rem] max-w-[80vw] animate-pulse-slow">
        <Image
          src="/banners/logo.jpeg"
          alt={storeName ?? 'AURUM COAST'}
          fill
          sizes="(max-width: 768px) 80vw, 28rem"
          priority
          className="object-contain"
        />
      </div>
    </div>
  );
}
