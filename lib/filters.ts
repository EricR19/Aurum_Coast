import type { FilterState, Product } from './types';

/**
 * Cache LRU de filtros + ordenamientos.
 *
 * El feed renderiza 12 ProductReelCard simultaneamente. Si cada cambio de
 * filtro devuelve un array NUEVO (incluso con los mismos productos en el
 * mismo orden), React invalida el `React.memo` de ProductReelCard y re-renderiza
 * los 12 cards aunque solo haya cambiado, por ejemplo, el badge "Últimas
 * unidades" del primer slide.
 *
 * Para evitar eso, memoizamos por una clave serializada del FilterState +
 * la identidad del catalogo. Si la clave coincide con un calculo previo,
 * devolvemos EXACTAMENTE la misma referencia de array (y, por lo tanto,
 * las mismas referencias de Product dentro).
 *
 * El catalogo (`products`) es estatico en esta app: viene de un JSON
 * importado y no se modifica en runtime. Asi que el catalogo tambien lo
 * incluimos en la clave: si en el futuro se hace fetch dinamico, basta
 * con pasar una referencia distinta y la cache se invalida sola.
 *
 * Limite: 16 entradas. Con 6 campos de filtro hay 2^6 = 64 combinaciones
 * teoricas; en la practica el usuario no las prueba todas. 16 es mas que
 * suficiente y mantiene la huella de memoria acotada.
 */
const FILTER_CACHE_LIMIT = 16;
const filterCache = new Map<string, Product[]>();

function filterKey(products: Product[], state: FilterState): string {
  return `${state.brand}|${state.movement ?? ''}|${state.style ?? ''}|${state.minPrice ?? ''}|${state.maxPrice ?? ''}|${state.sort}|${products.length}`;
}

/**
 * Aplica los filtros + ordenamiento sobre la lista de productos.
 * - `brand === 'Todos'` se trata como filtro vacío.
 * - Devuelve referencias cacheadas: si el (catalogo, filterState) es igual
 *   a un calculo previo, devuelve el mismo array (mismos Product refs).
 */
export function applyFilters(products: Product[], state: FilterState): Product[] {
  const key = filterKey(products, state);

  const cached = filterCache.get(key);
  if (cached) {
    // Reinsertamos para que sea la mas reciente (LRU simple).
    filterCache.delete(key);
    filterCache.set(key, cached);
    return cached;
  }

  const { brand, movement, style, minPrice, maxPrice, sort } = state;

  let result = products.filter((p) => {
    if (brand && brand !== 'Todos' && p.brand !== brand) return false;
    if (movement && p.specs.movement !== movement) return false;
    if (style && p.style !== style) return false;
    if (minPrice != null && p.priceUSD < minPrice) return false;
    if (maxPrice != null && p.priceUSD > maxPrice) return false;
    return true;
  });

  switch (sort) {
    case 'price_asc':
      result = [...result].sort((a, b) => a.priceUSD - b.priceUSD);
      break;
    case 'price_desc':
      result = [...result].sort((a, b) => b.priceUSD - a.priceUSD);
      break;
    case 'popularity':
    default:
      result = [...result].sort((a, b) => b.popularity - a.popularity);
      break;
  }

  // Insertar en cache (LRU: borrar la mas vieja si nos pasamos del limite).
  filterCache.set(key, result);
  if (filterCache.size > FILTER_CACHE_LIMIT) {
    const oldestKey = filterCache.keys().next().value;
    if (oldestKey !== undefined) filterCache.delete(oldestKey);
  }

  return result;
}

/** Estado de filtro inicial. */
export const defaultFilterState: FilterState = {
  brand: 'Todos',
  movement: null,
  style: null,
  minPrice: undefined,
  maxPrice: undefined,
  sort: 'popularity',
};
