'use client';

import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { SearchX } from 'lucide-react';
import { HeroScreen } from './HeroScreen';
import { BrandChips } from './BrandChips';
import { ProductReelCard } from './ProductReelCard';
import { TrustCard } from './TrustCard';
import { SplashScreen } from './SplashScreen';
import { FloatingHeader } from '@/components/ui/FloatingHeader';
import { SheetProvider, useAppState, useAppActions } from '@/components/providers/SheetProvider';
import { products, getAllBrands } from '@/lib/products';
import { applyFilters } from '@/lib/filters';
import { parseHashProductId, scrollToProductAfterSplash } from '@/lib/deepLink';
import { useAppHeight } from '@/lib/useAppHeight';
import {
  beginProgrammaticScroll,
  consumeProgrammaticScroll,
  resetProgrammaticScroll,
} from '@/lib/programmaticScroll';

// Lazy load de TODOS los Bottom Sheets: solo se descargan cuando el usuario
// abre el sheet por primera vez. Esto reduce el bundle inicial y, mas
// importante, evita que los 5 sheets vivan en el árbol React del feed
// (no consumen memoria ni participan en re-renders del contexto cuando
// el usuario no esta interactuando con ellos).
const SpecsSheet = lazy(() =>
  import('@/components/sheets/SpecsSheet').then((m) => ({ default: m.SpecsSheet }))
);
const CompareSheet = lazy(() =>
  import('@/components/sheets/CompareSheet').then((m) => ({ default: m.CompareSheet }))
);
const SearchSheet = lazy(() =>
  import('@/components/sheets/SearchSheet').then((m) => ({ default: m.SearchSheet }))
);
const FiltersSheet = lazy(() =>
  import('@/components/sheets/FiltersSheet').then((m) => ({ default: m.FiltersSheet }))
);
const CartSheet = lazy(() =>
  import('@/components/sheets/CartSheet').then((m) => ({ default: m.CartSheet }))
);

// Funciones de pre-fetch. Guardan la promesa internamente para no
// dispararla dos veces si el usuario hace pointerdown varias veces
// sobre el mismo boton. NO se exportan como default para que solo
// FloatingHeader las use.
export const prefetchSpecsSheet = () =>
  import('@/components/sheets/SpecsSheet');
export const prefetchCompareSheet = () =>
  import('@/components/sheets/CompareSheet');
export const prefetchSearchSheet = () =>
  import('@/components/sheets/SearchSheet');
export const prefetchFiltersSheet = () =>
  import('@/components/sheets/FiltersSheet');
export const prefetchCartSheet = () =>
  import('@/components/sheets/CartSheet');

interface MobileFeedProps {
  storeName: string;
}

/**
 * Feed principal mobile.
 * Renderiza las pantallas en este orden vertical:
 *   1. Hero
 *   2. BrandChips
 *   3..N. ProductReelCard (uno por producto, filtrados por marca)
 *   N+1. TrustCard
 *
 * MOTOR DE NAVEGACION (2026-09-18, "Option B"): el scroll vertical usa el
 * scroll nativo del navegador (momentum/inercia real, sin reinventar el
 * gesto tactil), pero el ALINEADO final a una seccion completa YA NO
 * depende de `scroll-snap-type` de CSS. Ese mecanismo se saco por completo:
 * combinado con capas de composicion (`will-change`) e imagenes pesadas,
 * generaba glitches especificos de GPU/navegador en celulares reales
 * (scroll trabado a mitad de seccion, imagen anterior pegada, saltos raros)
 * que no se podian reproducir ni depurar en desktop. En su lugar, un
 * `useEffect` en `FeedInner` es el UNICO responsable de decidir donde
 * aterriza el scroll: espera a que el scroll se quede quieto y hace
 * `scrollTo({ top, behavior: 'smooth' })` a la seccion mas cercana. Ver
 * ese efecto mas abajo para el detalle.
 *
 * Cualquier Bottom Sheet se monta fuera de este contenedor, en `app.page.tsx`.
 */
function FeedInner({ storeName }: { storeName: string }) {
  useAppHeight();
  const { filters } = useAppState();
  const { clearFilters } = useAppActions();
  const feedRef = useRef<HTMLDivElement | null>(null);
  const [showSplash, setShowSplash] = useState(false);

  const brands = useMemo(() => getAllBrands(), []);
  const filtered = useMemo(() => applyFilters(products, filters), [filters]);

  // Deep linking: si la URL trae `#slug`, muestra splash 500ms y hace scroll.
  useEffect(() => {
    const targetId = parseHashProductId();
    if (!targetId) return;
    setShowSplash(true);
    scrollToProductAfterSplash(feedRef.current, targetId, products, 500, {
      // La marca se pone JUSTO antes del `scrollTo` (no aca arriba): si se
      // marcara ahora, cualquier `scrollend` que ocurriera durante los
      // frames de espera del slide consumiria la marca antes de tiempo.
      onScrollStart: () => beginProgrammaticScroll(),
    }).finally(() => {
      setShowSplash(false);
    });
  }, []);

  // FIX 2026-09-19 (causa raiz de los glitches / "imagen anterior pegada"):
  // este `willChange: 'transform'` sobre `<main>` se sumaba al
  // `will-change: transform` que `.h-screen-snap` aplicaba a las 15
  // secciones (Hero + BrandChips + 12 productos + TrustCard). Eso son 16
  // capas de composicion full-screen permanentes: a ~10 MB de textura cada
  // una en un 1080x2400, ~150 MB de memoria de GPU retenidos toda la
  // sesion. Cuando el compositor se queda sin presupuesto empieza a
  // expulsar y re-rasterizar tiles, y eso es EXACTAMENTE lo que se veia:
  // el frame viejo pegado, el scroll trabado y los glitches de pintado.
  //
  // Ahora el feed NO promueve capas de forma permanente: `will-change` se
  // aplica solo mientras hay un scroll activo (y solo al contenedor), que
  // es cuando realmente aporta. Ver tambien `globals.css`, donde se saco
  // el `will-change` de `.h-screen-snap`.
  const [isScrolling, setIsScrolling] = useState(false);
  const willChange = isScrolling ? ('transform' as const) : ('auto' as const);

  // MOTOR DE PAGINADO (Option B): esta es la UNICA logica que decide donde
  // "snapea" el feed. No hay `scroll-snap-type` en el CSS -- se saco por
  // completo (ver comentario de `FeedInner` mas arriba). El scroll en si
  // sigue siendo el nativo del navegador (momentum/inercia reales); esto
  // solo corrige el punto de aterrizaje final.
  //
  // FIX 2026-09-18 #2 "saltos/redirecciones raras siguen pasando":
  // la version anterior (rAF + "6 frames sin cambio de scrollTop > 0.5px")
  // segui teniendo un defecto de FISICA, no de timing: el momentum nativo
  // decae EXPONENCIALMENTE, nunca llega a cero de golpe. Eso significa que
  // en CUALQUIER fling (incluso uno fuerte que todavia va a recorrer 2-3
  // secciones mas) hay un tramo donde el delta entre frames cae por debajo
  // del umbral por pura desaceleracion normal, sin que el scroll haya
  // terminado de verdad. Nuestro codigo lo confundia con "quieto", corregia
  // hacia la seccion mas cercana EN ESE INSTANTE (todavia detras de adonde
  // iba el fling) con `scrollTo`, y eso peleaba contra el momentum nativo
  // que seguia corriendo -> resultado impredecible ("salto raro").
  //
  // Ningun umbral arbitrario (ni en tiempo ni en pixeles) puede distinguir
  // "desacelerando lento" de "ya termino" con certeza, porque son la misma
  // curva. La unica fuente de verdad real es el navegador: el evento
  // nativo `scrollend` se dispara EXACTAMENTE una vez, cuando TODO el
  // scroll (momentum del usuario + cualquier `scrollTo` programatico)
  // termino de verdad. Sin heuristicas, sin falsos positivos.
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    let touching = false;

    // Tolerancia de alineado. Antes era 2px, pero las secciones miden
    // `--app-height` = `visualViewport.height`, que es FRACCIONARIA (ej.
    // 731.43px). Los `offsetTop` acumulan ese error subpixel, asi que el
    // scroll "correcto" podia quedar a 3-4px del `offsetTop` teorico y el
    // motor seguia intentando corregir -> micro-jitter infinito.
    const SNAP_TOLERANCE_PX = 6;

    const snapToNearest = () => {
      const sections = Array.from(el.children) as HTMLElement[];
      if (sections.length === 0) return;
      const scrollTop = el.scrollTop;

      // Si ya estamos al final del scroll no hay nada que corregir: forzar
      // el `offsetTop` de la ultima seccion ahi produce un tiron hacia
      // atras (el clasico "me saca del TrustCard").
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (scrollTop >= maxScroll - SNAP_TOLERANCE_PX) return;

      let nearest = sections[0];
      let nearestDist = Math.abs(nearest.offsetTop - scrollTop);
      for (const section of sections) {
        const dist = Math.abs(section.offsetTop - scrollTop);
        if (dist < nearestDist) {
          nearest = section;
          nearestDist = dist;
        }
      }
      if (nearestDist <= SNAP_TOLERANCE_PX) return;

      // FIX 2026-09-19: este `scrollTo` tambien termina emitiendo su propio
      // `scrollend`. Sin marcarlo, ese evento volvia a entrar a
      // `snapToNearest()` -> bucle de correcciones encadenadas. Lo marcamos
      // como programatico para que el proximo `scrollend` se ignore.
      beginProgrammaticScroll();
      el.scrollTo({ top: Math.round(nearest.offsetTop), behavior: 'smooth' });
    };

    const onScrollEnd = () => {
      setIsScrolling(false);
      // FIX 2026-09-19: ANTES este flag se resetaba pero NUNCA se leia en
      // esta rama (solo en el fallback de linea ~182), asi que la proteccion
      // contra scrolls programaticos era codigo muerto: cada deep link y
      // cada tap de busqueda recibia una correccion de snap encima, y eso
      // producia el salto visible al aterrizar. Ahora si se consume.
      if (consumeProgrammaticScroll()) return;
      if (!touching) snapToNearest();
    };

    // Fallback para navegadores sin soporte de `scrollend` (Baseline desde
    // 2023; deberia existir en cualquier Chrome/MIUI moderno, pero por las
    // dudas). Sin esto, esos navegadores se quedarian sin ningun ajuste.
    const supportsScrollEnd = 'onscrollend' in window;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      // Promueve el contenedor a capa de composicion mientras dura el
      // scroll. Se baja en `scrollend` (o en el fallback de abajo).
      setIsScrolling(true);
      if (supportsScrollEnd) return;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      fallbackTimer = setTimeout(() => {
        setIsScrolling(false);
        if (consumeProgrammaticScroll()) return;
        if (!touching) snapToNearest();
      }, 250);
    };

    // Un toque nuevo cancela cualquier intento de corregir: nunca debe
    // pelear un `scrollTo` programatico contra un gesto activo del usuario.
    const onTouchStart = () => {
      touching = true;
    };
    const onTouchEnd = () => {
      touching = false;
    };

    el.addEventListener('scrollend', onScrollEnd);
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('scrollend', onScrollEnd);
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      resetProgrammaticScroll();
    };
  }, []);

  return (
    <>
      <SplashScreen visible={showSplash} storeName={storeName} />
      {/* PERFORMANCE: el contenedor del feed vive en `position: fixed`
          para aislar su repaint del `<body>`. Antes era `position: relative`,
          y cualquier cambio de estilo en el body (toolbar de Chrome moviendose,
          header ocultandose) forzaba re-layout del feed completo. Con fixed,
          el feed tiene su propio layer del compositor y se re-pinta solo.

          CAMBIOS para fix de stutter en Xiaomi (MIUI Chromium):
          - `overflow-y-scroll` -> `overflow-y-auto`. Evita el bug conocido
            de MIUI donde `overflow-y: scroll` con `position: fixed` genera
            frames duplicados durante scroll rapido.
          - Agregamos `overscroll-behavior-y: contain` para que el rubber
            band del browser no se propague al body.

          SIN `scroll-snap-type` (2026-09-18, "Option B"): se probo
          `snap-mandatory` y despues `snap-proximity`, y ambos generaban
          glitches en celulares reales (scroll trabado a mitad de seccion,
          imagen anterior pegada al hacer scroll rapido) al combinarse con
          las capas de composicion de las imagenes. En vez de seguir
          parchando el snap nativo, se saco por completo: el scroll es
          100% nativo (momentum real) y el aterrizaje final a una seccion
          completa lo decide JS (ver el `useEffect` de "MOTOR DE PAGINADO"
          mas arriba en este archivo). */}
      <main
        ref={feedRef}
        style={{ willChange }}
        className="fixed inset-0 h-screen-snap w-full overflow-y-auto scrollbar-none"
      >
        <HeroScreen storeName={storeName} />
        <BrandChips brands={brands} />
        {filtered.length === 0 ? (
          <EmptyFilters onClear={clearFilters} />
        ) : (
          filtered.map((product, idx) => (
            <ProductReelCard
              key={product.id}
              product={product}
              scrollRootRef={feedRef}
              isFirstSlide={idx === 0}
            />
          ))
        )}
        <TrustCard />
      </main>
      {/* FloatingHeader una sola vez, fuera del loop. Antes vivia dentro de
          cada ProductReelCard (10 instancias), lo que provocaba 10 re-renders
          cuando cambiaba el carrito o el comparador. z-50 lo pone sobre
          todo (encima del feed y de los overlays de los ReelCards). */}
      <FloatingHeader />
    </>
  );
}

/**
 * Pantalla que se muestra cuando la combinacion de filtros activos no devuelve
 * ningun producto. Da contexto al usuario y una salida clara (limpiar filtros)
 * sin necesidad de abrir el sheet.
 */
function EmptyFilters({ onClear }: { onClear: () => void }) {
  return (
    <section
      className="relative flex h-screen-snap w-full flex-col items-center justify-center bg-black px-6 text-center"
      data-empty-filters
    >
      <div className="flex max-w-sm flex-col items-center gap-4">
        <div className="rounded-full bg-white/5 p-5">
          <SearchX size={36} className="text-white/40" />
        </div>
        <h2 className="text-xl font-bold text-white">
          No hay relojes con esos filtros
        </h2>
        <p className="text-sm text-white/60">
          Proba quitar alguno o limpia todos para ver el catalogo completo.
        </p>
        <button
          type="button"
          onClick={onClear}
          className="mt-2 rounded-full bg-brand-accent px-6 py-2.5 text-sm font-bold text-black hover:bg-yellow-400 active:scale-[0.98]"
        >
          Limpiar filtros
        </button>
      </div>
    </section>
  );
}

export function MobileFeed({ storeName }: MobileFeedProps) {
  return (
    <SheetProvider>
      <FeedInner storeName={storeName} />
      {/* Los Bottom Sheets se montan al nivel superior del provider,
          fuera del contenedor con scroll-snap para que la animacion de
          Framer Motion no se rompa al estar dentro de un scroll anidado.
          TODOS los sheets son lazy: no se descargan hasta que se abren
          por primera vez. Esto evita que vivan en el árbol React y
          participen en re-renders del contexto cuando no se usan. */}
      <Suspense fallback={null}>
        <SpecsSheet />
        <CompareSheet />
        <SearchSheet />
        <FiltersSheet />
        <CartSheet />
      </Suspense>
    </SheetProvider>
  );
}
