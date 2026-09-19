'use client';

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';

interface HeroScreenProps {
  storeName: string;
}

/**
 * Pantalla 1 — Hero / Bienvenida.
 * - Wordmark de la marca (imagen optimizada) en vez de texto renderizado.
 * - Propuesta de valor y CTA "Desliza para explorar".
 *
 * El `storeName` se conserva como prop y se usa como `alt` de la imagen
 * por accesibilidad (lectores de pantalla anuncian el nombre de la tienda).
 */
export function HeroScreen({ storeName }: HeroScreenProps) {
  return (
    <section className="relative flex h-screen-snap w-full snap-start flex-col items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-zinc-800 px-6 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(212,175,55,0.15),_transparent_60%)]" />

      <div className="relative z-10 flex max-w-md flex-col items-center">
        <span className="mb-6 rounded-full border border-brand-accent/40 px-3 py-1 font-title text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-accent">
          Bienvenido
        </span>

        {/* Logo completo de la marca (icono + wordmark) SIN fondo negro.
            La imagen original traía fondo sólido #0B0C10 que se veia mal
            sobre el degradado del Hero; esta versión tiene el fondo
            realmente transparente (alpha=0 en los pixeles de fondo) para
            que el logo dorado respire sobre el fondo del HeroScreen sin
            dejar un cuadrado borroso.
            Este mismo archivo se usa como og:image en los previews de
            WhatsApp/Facebook/Twitter, manteniendo branding consistente. */}
        <Image
          src="/banners/aurum-coast-logo-clean-960.png"
          alt={storeName}
          width={320}
          height={180}
          priority
          sizes="320px"
          className="h-auto w-80 max-w-full drop-shadow-lg"
        />

        <p className="mt-6 text-balance text-base text-white/70">
          Relojes de alta gama con garantía oficial. Compra directo por{' '}
          <span className="font-semibold text-brand-accent">WhatsApp</span> y paga con
          SINPE Móvil o contra entrega en Costa Rica.
        </p>

        <div className="mt-10 flex flex-col items-center gap-2 text-white/60 animate-bounce-slow">
          <span className="font-title text-xs font-semibold uppercase tracking-widest">Desliza para explorar</span>
          <ChevronDown size={28} />
        </div>
      </div>
    </section>
  );
}
