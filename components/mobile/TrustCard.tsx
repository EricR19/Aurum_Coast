'use client';

import { ShieldCheck, Truck, Smartphone, MessageCircle } from 'lucide-react';

interface TrustItem {
  icon: typeof ShieldCheck;
  title: string;
  desc: string;
}

const ITEMS: TrustItem[] = [
  {
    icon: ShieldCheck,
    title: 'Garantía oficial',
    desc: '12 a 24 meses en todos los relojes, según marca.',
  },
  {
    icon: Truck,
    title: 'Envíos a todo el país',
    desc: 'GAM y resto del país vía Correos de Costa Rica.',
  },
  {
    icon: Smartphone,
    title: 'Pagos locales',
    desc: 'SINPE Móvil, transferencia o contra entrega.',
  },
];

/**
 * Pantalla final — Tarjeta de confianza / cierre del feed.
 * Cierra con CTA directo a WhatsApp (mensaje vacío, abre chat).
 */
export function TrustCard() {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '';
  const url = `https://wa.me/${number}?text=${encodeURIComponent(
    'Hola, vengo del catálogo y necesito asesoría sobre un reloj 👋'
  )}`;

  return (
    <section className="relative flex h-screen-snap w-full snap-start flex-col items-center justify-center bg-gradient-to-b from-black to-zinc-900 px-6 text-center">
      <h2 className="text-3xl font-black text-white">
        Compra <span className="text-brand-accent">con confianza</span>
      </h2>
      <p className="mt-2 max-w-sm text-sm text-white/60">
        Estas son las razones por las que cientos de clientes en Costa Rica eligen
        comprar con nosotros.
      </p>

      <ul className="mt-10 flex w-full max-w-sm flex-col gap-4">
        {ITEMS.map(({ icon: Icon, title, desc }) => (
          <li
            key={title}
            className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-accent/15 text-brand-accent">
              <Icon size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="mt-1 text-xs text-white/65">{desc}</p>
            </div>
          </li>
        ))}
      </ul>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-10 flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-green-500 py-3.5 font-bold text-white shadow-lg shadow-green-500/30 transition hover:bg-green-600 active:scale-[0.98]"
      >
        <MessageCircle size={20} />
        Hablar ahora por WhatsApp
      </a>
    </section>
  );
}
