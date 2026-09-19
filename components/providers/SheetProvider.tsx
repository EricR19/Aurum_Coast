'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type { Product, SheetKey, CartItem, Movement, Style, SortKey } from '@/lib/types';
import { products } from '@/lib/products';
import { loadStoredCart, saveCart, hydrateCart } from '@/lib/cartStorage';
import { defaultFilterState } from '@/lib/filters';

/**
 * Estado global de la app:
 *  - currentSheet: qué Bottom Sheet está actualmente abierto.
 *  - selectedProduct: el producto sobre el cual se pidieron Specs.
 *  - compareIds: ids de productos añadidos al comparador.
 *  - cart: carrito.
 *  - activeBrand: filtro activo (chips del header).
 */
interface AppState {
  currentSheet: SheetKey;
  selectedProduct: Product | null;
  compareIds: string[];
  cart: CartItem[];
  activeBrand: string;
  filters: {
    brand: string;
    movement: Movement | null;
    style: Style | null;
    minPrice: number | undefined;
    maxPrice: number | undefined;
    sort: SortKey;
  };
}

type Action =
  | { type: 'OPEN_SHEET'; key: Exclude<SheetKey, null>; product?: Product }
  | { type: 'CLOSE_SHEET' }
  | { type: 'SET_BRAND'; brand: string }
  | { type: 'SET_MOVEMENT'; movement: Movement | null }
  | { type: 'SET_STYLE'; style: Style | null }
  | { type: 'SET_PRICE_RANGE'; minPrice: number | undefined; maxPrice: number | undefined }
  | { type: 'SET_SORT'; sort: SortKey }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'TOGGLE_COMPARE'; productId: string }
  | { type: 'CLEAR_COMPARE' }
  | { type: 'ADD_TO_CART'; product: Product }
  | { type: 'REMOVE_FROM_CART'; productId: string }
  | { type: 'UPDATE_QTY'; productId: string; quantity: number }
  | { type: 'CLEAR_CART' }
  | { type: 'HYDRATE_CART'; items: CartItem[] };

const initialState: AppState = {
  currentSheet: null,
  selectedProduct: null,
  compareIds: [],
  cart: [],
  activeBrand: 'Todos',
  filters: {
    brand: 'Todos',
    movement: null,
    style: null,
    minPrice: undefined,
    maxPrice: undefined,
    sort: 'popularity',
  },
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'OPEN_SHEET':
      return {
        ...state,
        currentSheet: action.key,
        selectedProduct: action.product ?? state.selectedProduct,
      };
    case 'CLOSE_SHEET':
      return { ...state, currentSheet: null };
    case 'SET_BRAND':
      // Solo se cambia la marca activa. NO se debe borrar el comparador
      // (eso era un bug: cambiabas de filtro y se perdía lo que tenías
      //  agregado al comparador).
      return {
        ...state,
        activeBrand: action.brand,
        filters: { ...state.filters, brand: action.brand },
      };
    case 'SET_MOVEMENT':
      return { ...state, filters: { ...state.filters, movement: action.movement } };
    case 'SET_STYLE':
      return { ...state, filters: { ...state.filters, style: action.style } };
    case 'SET_PRICE_RANGE':
      return {
        ...state,
        filters: {
          ...state.filters,
          minPrice: action.minPrice,
          maxPrice: action.maxPrice,
        },
      };
    case 'SET_SORT':
      return { ...state, filters: { ...state.filters, sort: action.sort } };
    case 'CLEAR_FILTERS':
      return {
        ...state,
        activeBrand: 'Todos',
        filters: {
          brand: 'Todos',
          movement: null,
          style: null,
          minPrice: undefined,
          maxPrice: undefined,
          sort: 'popularity',
        },
      };
    case 'TOGGLE_COMPARE': {
      const exists = state.compareIds.includes(action.productId);
      let next = exists
        ? state.compareIds.filter((id) => id !== action.productId)
        : [...state.compareIds, action.productId];
      // Limita a 4 productos en el comparador
      if (next.length > 4) next = next.slice(-4);
      return { ...state, compareIds: next };
    }
    case 'CLEAR_COMPARE':
      return { ...state, compareIds: [] };
    case 'ADD_TO_CART': {
      const existing = state.cart.find((c) => c.product.id === action.product.id);
      if (existing) {
        return {
          ...state,
          cart: state.cart.map((c) =>
            c.product.id === action.product.id ? { ...c, quantity: c.quantity + 1 } : c
          ),
        };
      }
      return { ...state, cart: [...state.cart, { product: action.product, quantity: 1 }] };
    }
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter((c) => c.product.id !== action.productId) };
    case 'UPDATE_QTY':
      return {
        ...state,
        cart: state.cart.map((c) =>
          c.product.id === action.productId
            ? { ...c, quantity: Math.max(1, action.quantity) }
            : c
        ),
      };
    case 'CLEAR_CART':
      return { ...state, cart: [] };
    case 'HYDRATE_CART':
      return { ...state, cart: action.items };
    default:
      return state;
  }
}

interface Ctx {
  /** Estado: qué Bottom Sheet está actualmente abierto. */
  openSheet: SheetKey;
  /** Acción: cierra el sheet (con sincronización de History API). */
  closeSheet: () => void;
  /** Acción: abre un sheet. */
  requestSheet: (key: Exclude<SheetKey, null>, product?: Product) => void;
  selectedProduct: Product | null;
  compareIds: string[];
  cart: CartItem[];
  activeBrand: string;
  filters: AppState['filters'];
  setBrand: (brand: string) => void;
  setMovement: (movement: Movement | null) => void;
  setStyle: (style: Style | null) => void;
  setPriceRange: (minPrice: number | undefined, maxPrice: number | undefined) => void;
  setSort: (sort: SortKey) => void;
  clearFilters: () => void;
  toggleCompare: (productId: string) => void;
  clearCompare: () => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const SheetContext = createContext<Ctx | null>(null);

export function SheetProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ------ Hidratacion del carrito desde localStorage (solo cliente).
  // Se hace UNA vez al montar para evitar hydration mismatch entre SSR y cliente.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const stored = loadStoredCart();
    if (stored.length === 0) return;
    const items = hydrateCart(stored, products);
    if (items.length > 0) {
      dispatch({ type: 'HYDRATE_CART', items });
    }
  }, []);

  // ------ Persistencia del carrito en localStorage.
  // Se ejecuta cada vez que `state.cart` cambia. saveCart() traga errores.
  useEffect(() => {
    if (!hydratedRef.current) return; // no persistir antes de hidratar
    saveCart(state.cart);
  }, [state.cart]);

  // ------ History API: pushState al abrir sheet, popstate al cerrar.
  useEffect(() => {
    if (state.currentSheet) {
      // Inserta una entrada "fantasma" para que el botón Atrás cierre el sheet.
      window.history.pushState({ sheet: state.currentSheet }, '');
    }

    const handlePop = () => {
      // Si se disparó popstate, alguien presionó "Atrás". Cerramos el sheet.
      if (state.currentSheet) {
        dispatch({ type: 'CLOSE_SHEET' });
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [state.currentSheet]);

  const value = useMemo<Ctx>(
    () => ({
      // Estado
      openSheet: state.currentSheet,
      selectedProduct: state.selectedProduct,
      compareIds: state.compareIds,
      cart: state.cart,
      activeBrand: state.activeBrand,
      filters: state.filters,
      // Acciones
      requestSheet: (key, product) => dispatch({ type: 'OPEN_SHEET', key, product }),
      closeSheet: () => {
        // Si hay history en el sheet, retrocede una entrada para mantener coherencia.
        if (state.currentSheet && window.history.state?.sheet) {
          window.history.back();
          return;
        }
        dispatch({ type: 'CLOSE_SHEET' });
      },
      setBrand: (brand) => dispatch({ type: 'SET_BRAND', brand }),
      setMovement: (movement) => dispatch({ type: 'SET_MOVEMENT', movement }),
      setStyle: (style) => dispatch({ type: 'SET_STYLE', style }),
      setPriceRange: (minPrice, maxPrice) =>
        dispatch({ type: 'SET_PRICE_RANGE', minPrice, maxPrice }),
      setSort: (sort) => dispatch({ type: 'SET_SORT', sort }),
      clearFilters: () => dispatch({ type: 'CLEAR_FILTERS' }),
      toggleCompare: (id) => dispatch({ type: 'TOGGLE_COMPARE', productId: id }),
      clearCompare: () => dispatch({ type: 'CLEAR_COMPARE' }),
      addToCart: (product) => dispatch({ type: 'ADD_TO_CART', product }),
      removeFromCart: (id) => dispatch({ type: 'REMOVE_FROM_CART', productId: id }),
      updateQty: (id, quantity) =>
        dispatch({ type: 'UPDATE_QTY', productId: id, quantity }),
      clearCart: () => dispatch({ type: 'CLEAR_CART' }),
    }),
    [state]
  );

  return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <SheetProvider>');
  return ctx;
}

export function useOpenSheet() {
  const { requestSheet } = useApp();
  return useCallback(
    (key: Exclude<SheetKey, null>, product?: Product) => requestSheet(key, product),
    [requestSheet]
  );
}
