/**
 * Tipos compartidos para el dominio de productos.
 * Mantener este archivo en sync con data/products.json.
 */

export type Movement = 'Automático' | 'Cuarzo' | 'Mecánico' | 'Solar';
export type Crystal = 'Zafiro' | 'Mineral' | 'Hardlex';
export type Style = 'Deportivo' | 'Elegante' | 'Casual' | 'Diving' | 'Cronógrafo';
export type SortKey = 'price_asc' | 'price_desc' | 'popularity';

export interface ProductSpecs {
  movement: Movement;
  crystal: Crystal;
  caseDiameterMm: number;
  waterResistanceBar: number; // ej. 10 = 100m
  strapMaterial: 'Acero' | 'Cuero' | 'Caucho' | 'Nylon' | 'Cerámica';
  caseMaterial?: string;
  weightG?: number;
  warrantyMonths?: number;
}

export interface ProductImage {
  src: string;
  alt: string;
}

export interface Product {
  id: string;
  slug: string;             // se usa para deep linking: /#seiko-presage
  brand: string;
  model: string;
  shortDescription: string;
  priceUSD: number;
  currency: 'USD';
  stock: number;
  images: ProductImage[];
  specs: ProductSpecs;
  style: Style;
  popularity: number;       // 1-100 para ordenamiento
  badge?: 'Nuevo' | 'Últimas unidades' | 'Best Seller' | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface FilterState {
  brand: string | null;     // null = Todos
  movement: Movement | null;
  style: Style | null;
  minPrice?: number;
  maxPrice?: number;
  sort: SortKey;
}

export type SheetKey = 'specs' | 'filters' | 'compare' | 'cart' | 'search' | null;
