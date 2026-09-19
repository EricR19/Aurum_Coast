'use client';

import Image from 'next/image';
import { Minus, Plus, Trash2, MessageCircle, ShoppingBag } from 'lucide-react';
import { BottomSheet, useSheetState } from './BottomSheet';
import { useApp } from '@/components/providers/SheetProvider';
import { formatCRC, getPriceCRC } from '@/lib/products';
import { buildWhatsAppCheckoutUrl } from '@/lib/whatsapp';
import { track } from '@/lib/metaPixel';

export function CartSheet() {
  const { cart, updateQty, removeFromCart, clearCart } = useApp();
  const sheet = useSheetState('cart');

  const totalCRC = cart.reduce(
    (acc, item) => acc + getPriceCRC(item.product.priceUSD) * item.quantity,
    0
  );
  const checkoutUrl = buildWhatsAppCheckoutUrl(cart);

  return (
    <BottomSheet
      open={sheet.open}
      onClose={sheet.onClose}
      title="Carrito"
      size="tall"
    >
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-white/50">
          <ShoppingBag size={32} />
          <p className="text-sm">Tu carrito está vacío.</p>
          <p className="text-xs text-white/30">Vuelve al feed para agregar productos.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-2">
            {cart.map((item) => (
              <li
                key={item.product.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
              >
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                  {item.product.images[0] && (
                    <Image
                      src={item.product.images[0].src}
                      alt={item.product.images[0].alt}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </div>

                <div className="flex-1">
                  <p className="font-title text-[10px] font-semibold uppercase tracking-widest text-brand-accent">
                    {item.product.brand}
                  </p>
                  <p className="text-sm font-bold text-white">{item.product.model}</p>
                  <p className="text-xs tabular-nums text-white/60">
                    {formatCRC(getPriceCRC(item.product.priceUSD))}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2 rounded-full bg-white/10 px-1 py-0.5">
                    <button
                      aria-label="Disminuir"
                      onClick={() =>
                        updateQty(item.product.id, Math.max(1, item.quantity - 1))
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="min-w-[16px] text-center text-sm font-bold">
                      {item.quantity}
                    </span>
                    <button
                      aria-label="Aumentar"
                      onClick={() => updateQty(item.product.id, item.quantity + 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    aria-label="Quitar del carrito"
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-title text-xs font-semibold uppercase tracking-widest text-white/60">Total</span>
              <span className="font-title text-2xl font-bold tabular-nums text-white">
                {formatCRC(totalCRC)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={clearCart}
              className="flex-1 rounded-full border border-white/15 bg-white/5 py-3 text-sm font-bold text-white hover:bg-white/10"
            >
              Vaciar
            </button>
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                // Meta Pixel requiere USD (la fuente de verdad del catalogo).
                const totalUSDForPixel = cart.reduce(
                  (acc, item) => acc + item.product.priceUSD * item.quantity,
                  0
                );
                track('InitiateCheckout', {
                  value: totalUSDForPixel,
                  currency: 'USD',
                  num_items: cart.length,
                  content_ids: cart.map((c) => c.product.id),
                });
                track('Lead', { value: totalUSDForPixel, currency: 'USD' });
              }}
              className="flex flex-[2] items-center justify-center gap-2 rounded-full bg-green-500 py-3 text-sm font-bold text-white shadow-lg shadow-green-500/30 hover:bg-green-600"
            >
              <MessageCircle size={18} />
              Pedir por WhatsApp
            </a>
          </div>

          <p className="text-[11px] text-white/40">
            Te enviaremos un mensaje pre-formateado a WhatsApp con el detalle. Sin
            pagos en línea en esta versión.
          </p>
        </div>
      )}
    </BottomSheet>
  );
}
