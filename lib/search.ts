import Fuse, { type IFuseOptions } from 'fuse.js';
import type { Product } from './types';
import { products } from './products';

/**
 * Busqueda fuzzy sobre el catalogo de productos.
 *
 * PERFORMANCE: este modulo se importa de forma dinamica SOLO desde
 * `SearchSheet.tsx`. Asi, `fuse.js` (~10 KB) queda dentro del chunk lazy
 * de SearchSheet y NO se descarga con el bundle inicial. Antes vivia en
 * el chunk compartido y se pagaba siempre, aunque el usuario nunca
 * abriera la busqueda.
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

  // FIX: Fuse's weighted multi-key scoring can include unrelated products
  // with a misleading combined score (verified: query "bu" returned
  // "Invicta Pro Diver" even though it doesn't contain "bu" anywhere
  // relevant). This caused search to redirect to the wrong watch.
  // Exact/substring match is deterministic and always correct, so we try
  // it first and only fall back to fuzzy matching if nothing matches.
  const qLower = q.toLowerCase();
  const exact = products.filter(
    (p) =>
      p.brand.toLowerCase().includes(qLower) ||
      p.model.toLowerCase().includes(qLower) ||
      p.shortDescription.toLowerCase().includes(qLower) ||
      p.style.toLowerCase().includes(qLower)
  );
  if (exact.length > 0) return exact.slice(0, limit);

  return fuse.search(q, { limit }).map((result) => result.item);
}
