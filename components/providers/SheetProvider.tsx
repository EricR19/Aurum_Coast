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
 * El provider se divide en DOS contextos para evitar re-renders globales:
 *
 *  - SheetStateContext   -> cambia cuando el estado (carrito, sheet abierto,
 *                           filtros, comparador) cambia. Los consumidores que
 *                           solo necesitan acciones NO se re-renderizan.
 *  - SheetActionsContext -> las funciones de acción viven en un useRef y la
 *                           referencia del value es ESTABLE para toda la vida
 *                           del provider. Los consumidores no ven "nuevas"
 *                           referencias en cada dispatch, así que ningún
 *                           useEffect/[...] ni memo downstream se invalida
 *                           cuando cambia el state.
 *
 * Esto corta la cascada que provocaba "freeze" al hacer scroll vertical:
 * cualquier dispatch (ej. abrir un sheet, agregar al carrito) re-renderizaba
 * el FeedInner completo y, con él, los 12 ProductReelCard + sus GalleryEmbla.
 *
 * Para los consumidores se exponen:
 *   - useAppState()    -> solo estado, re-renderiza cuando el estado cambia.
 *   - useAppActions()  -> solo acciones, referencia estable, NUNCA re-renderiza
 *                         por cambios de estado.
 *   - useApp()         -> hook combinado deprecado, mantenido por
 *                         compatibilidad hacia atrás.
 */

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
  selectedProduct: Product | null;
  compareIds: string[];
  cart: CartItem[];
  activeBrand: string;
  filters: AppState['filters'];
}

interface CtxActions {
  /** Acción: cierra el sheet (con sincronización de History API). */
  closeSheet: () => void;
  /** Acción: abre un sheet. */
  requestSheet: (key: Exclude<SheetKey, null>, product?: Product) => void;
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

const SheetStateContext = createContext<Ctx | null>(null);
const SheetActionsContext = createContext<CtxActions | null>(null);

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
  // FIX 2026-09-18: track listener attachment to prevent stacking
  // FIX 2026-09-19: store listener in ref to ensure proper cleanup
  /**
   * Cuenta cuantas entradas "fantasma" pusheamos nosotros y todavia no se
   * consumieron. Es el unico dato que hace segura la decision de
   * `closeSheet()`: sin el, hacer `history.back()` a ciegas podia sacar al
   * usuario del sitio.
   */
  const ghostEntriesRef = useRef(0);

  useEffect(() => {
    // FIX 2026-09-19 (causa raiz de "el boton Atras se sale de la app"):
    // ANTES el `pushState` estaba en el cuerpo del efecto pero el cleanup que
    // lo balanceaba estaba DENTRO del `if` del listener. Con
    // `reactStrictMode: true` (next.config.mjs) React monta -> desmonta ->
    // remonta cada efecto en dev, asi que se pusheaban DOS entradas fantasma
    // y solo se removia una. El stack quedaba desbalanceado y el boton Atras
    // necesitaba dos toques (indistinguible de un sheet congelado).
    //
    // Ahora: pushState y su limpieza viven en el MISMO scope condicional, y
    // llevamos la cuenta explicita de las entradas fantasma pendientes.
    if (!state.currentSheet) return;

    window.history.pushState({ sheet: state.currentSheet, ghost: true }, '');
    ghostEntriesRef.current += 1;

    const handlePop = () => {
      // popstate = el usuario presiono "Atras" (o consumimos la entrada
      // nosotros desde closeSheet). La entrada fantasma ya no existe.
      if (ghostEntriesRef.current > 0) ghostEntriesRef.current -= 1;
      if (stateRef.current.currentSheet) {
        dispatch({ type: 'CLOSE_SHEET' });
      }
    };

    window.addEventListener('popstate', handlePop);

    return () => {
      window.removeEventListener('popstate', handlePop);
    };
  }, [state.currentSheet]);

  // Mantiene el contador accesible desde las acciones (referencia estable).
  const closeSheetRef = useRef<() => void>(() => {});
  closeSheetRef.current = () => {
    // FIX 2026-09-19: antes esto hacia `window.history.back()` sin condicion
    // alguna. Si la entrada fantasma ya habia sido consumida (o reescrita por
    // el `replaceState` que hacia `scrollToProduct`), ese `back()` navegaba
    // FUERA del sitio: el "redirect raro" que se reportaba.
    //
    // Ahora solo usamos la History API si nosotros pusheamos una entrada que
    // sigue pendiente. Si no, cerramos por estado, que siempre es seguro.
    if (ghostEntriesRef.current > 0) {
      window.history.back();
      return;
    }
    dispatch({ type: 'CLOSE_SHEET' });
  };

  // ------ Estado expuesto: cambia solo cuando cambia el state.
  // Memoizamos por primitivos para evitar invalidaciones innecesarias
  // (ej. si solo cambia cart, los consumidores de openSheet no ven ref nueva).
  const stateValue = useMemo<Ctx>(
    () => ({
      openSheet: state.currentSheet,
      selectedProduct: state.selectedProduct,
      compareIds: state.compareIds,
      cart: state.cart,
      activeBrand: state.activeBrand,
      filters: state.filters,
    }),
    [
      state.currentSheet,
      state.selectedProduct,
      state.compareIds,
      state.cart,
      state.activeBrand,
      state.filters,
    ]
  );

  // ------ Acciones expuestas: referencia ESTABLE de por vida.
  // Guardamos dispatch + state actual en refs para que las funciones lean
  // siempre el state más reciente sin tener que recrearse en cada render.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const actionsValue = useMemo<CtxActions>(
    () => ({
      requestSheet: (key, product) =>
        dispatch({ type: 'OPEN_SHEET', key, product }),
      // Delega en `closeSheetRef` para que la logica pueda leer el contador
      // de entradas fantasma sin romper la referencia estable de las acciones.
      closeSheet: () => closeSheetRef.current(),
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
    []
  );

  return (
    <SheetStateContext.Provider value={stateValue}>
      <SheetActionsContext.Provider value={actionsValue}>
        {children}
      </SheetActionsContext.Provider>
    </SheetStateContext.Provider>
  );
}

/** Lee solo el estado. Re-renderiza cuando cambia el estado. */
export function useAppState(): Ctx {
  const ctx = useContext(SheetStateContext);
  if (!ctx) throw new Error('useAppState debe usarse dentro de <SheetProvider>');
  return ctx;
}

/** Lee solo las acciones. La referencia es estable: nunca re-renderiza. */
export function useAppActions(): CtxActions {
  const ctx = useContext(SheetActionsContext);
  if (!ctx) throw new Error('useAppActions debe usarse dentro de <SheetProvider>');
  return ctx;
}

/**
 * Hook combinado deprecado. Mantenido por compatibilidad hacia atrás.
 * Internamente une useAppState() + useAppActions(). Los consumidores deberían
 * migrar a los hooks individuales para evitar re-renders innecesarios.
 */
export function useApp(): Ctx & CtxActions {
  const stateCtx = useAppState();
  const actionsCtx = useAppActions();
  // La referencia cambia SOLO cuando cambia el state (igual que antes),
  // pero las acciones internas ya no se recrean.
  return useMemo(
    () => ({ ...stateCtx, ...actionsCtx }),
    [stateCtx, actionsCtx]
  );
}

export function useOpenSheet() {
  const { requestSheet } = useAppActions();
  return useCallback(
    (key: Exclude<SheetKey, null>, product?: Product) => requestSheet(key, product),
    [requestSheet]
  );
}
