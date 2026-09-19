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

/** Cuantos frames esperamos a que el slide destino exista en el DOM. */
const SLIDE_LOOKUP_MAX_FRAMES = 12;

/** Escapa un valor para usarlo dentro de un selector de atributo. */
function escapeAttrValue(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, '\\$&');
}

/**
 * Traduce un slug O un id a un id canonico de producto.
 * Es una BUSQUEDA (no un indice): el resultado no depende del orden del array.
 */
function resolveProductId(products: Product[], key: string): string | null {
  const found = products.find((p) => p.slug === key || p.id === key);
  return found ? found.id : null;
}

/** Busca el slide del producto por su atributo `data-product-id`. */
export function findProductSlide(
  container: HTMLElement,
  productId: string
): HTMLElement | null {
  return container.querySelector<HTMLElement>(
    `[data-product-id="${escapeAttrValue(productId)}"]`
  );
}

/**
 * Espera (hasta N frames) a que el slide exista en el DOM. Necesario cuando
 * el producto estaba filtrado y acabamos de limpiar los filtros: React aun
 * no re-renderizo la seccion.
 */
function waitForSlide(
  container: HTMLElement,
  productId: string
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    let frames = 0;
    const tick = () => {
      const slide = findProductSlide(container, productId);
      if (slide) return resolve(slide);
      frames += 1;
      if (frames >= SLIDE_LOOKUP_MAX_FRAMES) return resolve(null);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

export interface ScrollToProductOptions {
  /**
   * Limpia el `#hash` de la URL despues de scrollear.
   * SOLO para deep links (carga inicial). En navegacion interna esto es
   * peligroso: `SearchSheet` cierra el sheet con `history.back()` (async) y
   * un `replaceState` disparado a los pocos ms reescribia la entrada que el
   * `back()` todavia no habia resuelto -> stack de history corrupto.
   */
  clearHash?: boolean;
  /**
   * Se invoca JUSTO antes de emitir el `scrollTo`. Lo usa el feed para
   * marcar el scroll como programatico y que el motor de snap no lo corrija.
   */
  onScrollStart?: () => void;
}

/**
 * Posiciona el scroll del feed movil en el slide del producto.
 *
 * FIX 2026-09-19 (causa raiz de "salta al producto equivocado"):
 * antes el slide destino se calculaba como `products.findIndex(...) + 2`
 * sobre el array CRUDO del JSON, y despues se tomaba `container.children`
 * por esa posicion. Pero el DOM NO se renderiza en el orden del JSON: se
 * renderiza desde `applyFilters()`, que ordena por `popularity` (y ademas
 * puede filtrar). Con el catalogo actual 11 de 12 productos caian en la
 * seccion equivocada (hamilton-khaki erraba por 7 secciones), y con un
 * filtro de marca activo el indice se iba del rango: `children.item()`
 * devolvia `null` y la funcion resolvia en silencio -> el tap "no hacia
 * nada" (el falso "search frozen").
 *
 * Ahora el destino se resuelve por `data-product-id` directamente en el
 * DOM, asi que el orden y los filtros son irrelevantes por construccion.
 *
 * Devuelve `true` si encontro el slide y emitio el scroll.
 */
export async function scrollToProduct(
  container: HTMLElement | null,
  productId: string | null,
  products: Product[],
  splashMs = 0,
  options: ScrollToProductOptions = {}
): Promise<boolean> {
  const { clearHash = false, onScrollStart } = options;
  if (!container || !productId) return false;

  const resolvedId = resolveProductId(products, productId);
  if (!resolvedId) return false;

  const slide = await waitForSlide(container, resolvedId);
  if (!slide) return false;

  onScrollStart?.();
  // Redondeamos: las alturas vienen de `visualViewport.height`, que suele ser
  // fraccionaria (ej. 731.43px). Sin redondear, el destino y el `scrollTop`
  // final difieren por subpixeles y el motor de snap intenta "corregir"
  // eternamente.
  container.scrollTo({ top: Math.round(slide.offsetTop), behavior: 'smooth' });

  if (clearHash && window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  if (splashMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, splashMs));
  }
  return true;
}

/**
 * Wrapper con splash para deep links. Mantiene compatibilidad hacia atras.
 * A diferencia de la navegacion interna, aca SI limpiamos el hash (no hay
 * ningun `history.back()` en vuelo durante la carga inicial).
 */
export function scrollToProductAfterSplash(
  container: HTMLElement | null,
  productId: string | null,
  products: Product[],
  splashMs = 500,
  options: ScrollToProductOptions = {}
): Promise<boolean> {
  return scrollToProduct(container, productId, products, splashMs, {
    clearHash: true,
    ...options,
  });
}
