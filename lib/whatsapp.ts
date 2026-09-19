import type { CartItem } from './types';
import { getPriceCRC, formatCRC } from './products';

/**
 * Construye el mensaje pre-formateado para WhatsApp y devuelve la URL `wa.me`.
 * El cliente solo abre esa URL — no se procesa ningún pago en Fase 1.
 *
 * Precios en colones (CRC) solamente — el publico costarricense ve colones.
 */
export function buildWhatsAppCheckoutUrl(items: CartItem[]): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '';
  const store = process.env.NEXT_PUBLIC_STORE_NAME ?? 'la tienda';

  if (items.length === 0) return `https://wa.me/${number}`;

  const lines: string[] = [];
  lines.push(`Hola ${store} 👋, me interesa el siguiente pedido:`);
  lines.push('');

  let totalCRC = 0;

  items.forEach((item, i) => {
    const unitCRC = getPriceCRC(item.product.priceUSD);
    const subtotalCRC = unitCRC * item.quantity;
    totalCRC += subtotalCRC;

    lines.push(
      `${i + 1}. ${item.product.brand} ${item.product.model}` +
      ` (Ref: *${item.product.id}*)` +
      ` — Cant: ${item.quantity}` +
      ` — ${formatCRC(unitCRC)} c/u` +
      ` — Subtotal: ${formatCRC(subtotalCRC)}`
    );
  });

  lines.push('');
  lines.push(`💰 *Total:* ${formatCRC(totalCRC)}`);
  lines.push('');
  lines.push('¿Me podrían confirmar disponibilidad y formas de pago (SINPE Móvil / contra entrega)? 🙏');

  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${number}?text=${text}`;
}
