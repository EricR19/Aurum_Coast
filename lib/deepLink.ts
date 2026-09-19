import type { Product } from './types';

/**
 * Manejo del deep link tipo `tutienda.com/#seiko-presage`.
 * Devuelve el `id` del producto a enfocar (si existe).
 */
export function parseHashProductId(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.location.hash.replace(/^#/, '').trim();
  return raw.length > 0 ? raw : null;
}

/**
 * Posiciona el scroll del feed móvil en el slide correspondiente al producto.
 * Funciona tanto para deep links (con splash) como para navegacion interna
 * (ej. tap en un resultado de busqueda) — en ese caso splashMs = 0.
 *
 * IMPORTANTE: usa `container.scrollTop = ...` (scroll programatico del
 * contenedor), NO `scrollIntoView`. Esto es porque:
 * 1. `scrollIntoView` opera sobre el viewport del navegador, no sobre el
 *    contenedor con `overflow-y-scroll`. Cuando el contenedor tiene
 *    `scroll-snap-type: y mandatory`, el navegador no sabe alinear bien
 *    y termina saltando al final del scroll (el TrustCard).
 * 2. `scrollTop` directo respeta el snap del contenedor porque opera
 *    sobre el mismo scroll nativo.
 *
 * Devuelve una Promesa que se resuelve cuando el scroll ya fue aplicado.
 */
export function scrollToProduct(
  container: HTMLElement | null,
  productId: string | null,
  products: Product[],
  splashMs = 0
): Promise<void> {
  return new Promise((resolve) => {
    if (!container || !productId) return resolve();
    const idx = products.findIndex((p) => p.slug === productId || p.id === productId);
    if (idx === -1) return resolve();

    // +2 = Hero(0) + BrandChips(1) + productOffset
    const targetSlideIndex = idx + 2;
    const slide = container.children.item(targetSlideIndex) as HTMLElement | null;
    if (!slide) return resolve();

    setTimeout(() => {
      // Calcular la posicion del slide dentro del contenedor y scrollear
      // directamente. Esto respeta el scroll-snap porque opera sobre el
      // mismo elemento con `snap-y snap-mandatory`.
      const top = slide.offsetTop;
      container.scrollTo({ top, behavior: 'smooth' });
      // Limpia el hash para no interferir con futuras navegaciones internas.
      history.replaceState(null, '', window.location.pathname + window.location.search);
      setTimeout(resolve, splashMs);
    }, 60);
  });
}

/**
 * Wrapper con splash para deep links. Mantiene compatibilidad hacia atras.
 */
export function scrollToProductAfterSplash(
  container: HTMLElement | null,
  productId: string | null,
  products: Product[],
  splashMs = 500
): Promise<void> {
  return scrollToProduct(container, productId, products, splashMs);
}
