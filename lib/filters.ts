import type { FilterState, Product } from './types';

/**
 * Aplica los filtros + ordenamiento sobre la lista de productos.
 * - `brand === 'Todos'` se trata como filtro vacío.
 */
export function applyFilters(products: Product[], state: FilterState): Product[] {
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
