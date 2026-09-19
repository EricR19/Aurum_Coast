import Fuse, { type IFuseOptions } from 'fuse.js';
import type { Product } from './types';
import { products } from './products';

/**
 * Busqueda fuzzy sobre el catalogo de productos.
 *
 * Decisiones:
 * - Instancia singleton de Fuse (no se recrea por busqueda).
 * - Pesos: brand > model > shortDescription > style. El usuario que busca
 *   "seiko" o "tissot" casi siempre busca por marca.
 * - `includeScore` y `threshold: 0.3` permiten typos chicos
 *   ("seik" -> "Seiko", "casioo" -> "Casio") sin traer basura.
 * - El catalogo es estatico en Fase 1, asi que se inicializa una sola vez.
 */

const FUSE_OPTIONS: IFuseOptions<Product> = {
  keys: [
    { name: 'brand', weight: 0.4 },
    { name: 'model', weight: 0.3 },
    { name: 'shortDescription', weight: 0.2 },
    { name: 'style', weight: 0.1 },
  ],
  threshold: 0.3,
  ignoreLocation: true, // busca en todo el string, no solo al inicio
  minMatchCharLength: 2,
  includeScore: false,
};

const fuse = new Fuse(products, FUSE_OPTIONS);

/**
 * Busca productos que coincidan con `query`.
 * - Devuelve hasta `limit` resultados (default 20).
 * - Si `query` tiene menos de 2 chars o esta vacio, devuelve [].
 *   Asi evitamos ruido (1 char matchearia casi todo).
 */
export function searchProducts(query: string, limit = 20): Product[] {
  const q = query.trim();
  if (q.length < 2) return [];
  return fuse
    .search(q, { limit })
    .map((result) => result.item);
}
