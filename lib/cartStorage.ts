import type { CartItem, Product } from './types';

/**
 * Persistencia del carrito en localStorage.
 *
 * Decisiones:
 * - Solo guardamos `id` y `quantity` (no el Product entero) para no quedar
 *   con datos obsoletos si el producto cambia de precio/nombre/imagenes.
 *   Al hidratar, cruzamos con `data/products.json` para obtener el Product actual.
 * - Try/catch en TODAS las operaciones: Safari incognito, quota lleno,
 *   localStorage deshabilitado por el usuario son casos reales que rompen la app.
 * - Versionado: si cambia el formato, incrementamos STORAGE_VERSION y los
 *   carritos viejos se descartan sin tirar error.
 */

const STORAGE_KEY = 'aurum_coast.cart.v1';
const STORAGE_VERSION = 1;

interface StoredCart {
  version: number;
  items: Array<{ id: string; quantity: number }>;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Carga los items guardados. Devuelve solo `id` + `quantity`.
 * Devuelve [] si no hay nada, si el JSON es invalido, o si la version no matchea.
 */
export function loadStoredCart(): Array<{ id: string; quantity: number }> {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredCart;
    if (!parsed || parsed.version !== STORAGE_VERSION) return [];
    if (!Array.isArray(parsed.items)) return [];
    // Filtramos entradas mal formadas por las dudas.
    return parsed.items.filter(
      (it) =>
        it &&
        typeof it.id === 'string' &&
        typeof it.quantity === 'number' &&
        it.quantity > 0 &&
        it.quantity <= 99
    );
  } catch {
    return [];
  }
}

/**
 * Persiste los items del carrito. Silencia errores para no romper la app.
 */
export function saveCart(items: CartItem[]): void {
  if (!isBrowser()) return;
  try {
    const payload: StoredCart = {
      version: STORAGE_VERSION,
      items: items.map((c) => ({ id: c.product.id, quantity: c.quantity })),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Cuota llena, modo incognito restrictivo, etc. No hacemos nada.
  }
}

/**
 * Resuelve los items guardados contra el catalogo actual.
 * Si un producto guardado ya no existe en el catalogo, se descarta.
 * Si el quantity guardado es mayor al stock actual, se ajusta al stock.
 */
export function hydrateCart(
  stored: Array<{ id: string; quantity: number }>,
  catalog: Product[]
): CartItem[] {
  if (stored.length === 0) return [];
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const result: CartItem[] = [];
  for (const { id, quantity } of stored) {
    const product = byId.get(id);
    if (!product) continue; // producto eliminado del catalogo
    const safeQty = Math.min(Math.max(1, quantity), Math.max(1, product.stock));
    result.push({ product, quantity: safeQty });
  }
  return result;
}
