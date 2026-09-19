/**
 * Helpers seguros para disparar eventos de Meta Pixel.
 * Si el navegador no tiene `fbq` (pixel no cargado / SSR), simplemente no hace nada.
 *
 * Eventos según el spec del proyecto:
 * - ViewContent: al cambiar el reloj activo en el reel.
 * - AddToCart: al pulsar "+ Agregar al carrito".
 * - InitiateCheckout + Lead: al pulsar "Pedir por WhatsApp".
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

type EventName =
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Lead'
  | 'Contact'
  | 'Search';

interface PixelData {
  [key: string]: string | number | boolean | string[] | undefined;
}

export function track(event: EventName, data?: PixelData) {
  if (typeof window === 'undefined') return;
  if (typeof window.fbq !== 'function') return;
  window.fbq('track', event, data);
}
