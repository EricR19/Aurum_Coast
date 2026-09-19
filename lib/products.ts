import productsJson from '@/data/products.json';
import type { Product } from './types';

/**
 * Datos de productos cargados desde el JSON local.
 * En Fase 2 esto se sustituirá por un fetch a una BD / CMS.
 */
export const products: Product[] = productsJson as Product[];

/** Obtiene todas las marcas únicas a partir de la lista de productos. */
export function getAllBrands(): string[] {
  const brands = new Set(products.map((p) => p.brand));
  return ['Todos', ...Array.from(brands).sort()];
}

/** Encuentra un producto por su slug (usado en deep links #slug). */
export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug || p.id === slug);
}

/** Calcula el precio equivalente en colones usando el tipo de cambio configurado. */
export function getPriceCRC(priceUSD: number): number {
  const rate = Number(process.env.NEXT_PUBLIC_USD_TO_CRC ?? 525);
  return Math.round(priceUSD * rate);
}

/**
 * Formatea un monto como moneda con separador de miles consistente.
 * Se hace manual (no con Intl.NumberFormat) para evitar hydration mismatch:
 * el ICU de Node y el de Safari/iOS renderizan separadores distintos
 * ('288 750' vs '288.750') y eso rompe SSR.
 */
function formatCurrency(amount: number, prefix: string): string {
  const rounded = Math.round(amount);
  const withSep = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${prefix}${withSep}`;
}

export function formatCRC(amount: number): string {
  return formatCurrency(amount, '₡');
}

export function formatUSD(amount: number): string {
  return formatCurrency(amount, '$');
}

/**
 * Formatea el precio de un producto SOLO en colones.
 * Helper para la UI final (que muestra un unico precio al usuario).
 * Meta Pixel y el mensaje de WhatsApp siguen usando USD internamente.
 */
export function formatCRCOnly(product: Pick<Product, 'priceUSD'>): string {
  return formatCRC(getPriceCRC(product.priceUSD));
}
