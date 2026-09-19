# 🕰️ AURUM COAST — E-commerce de relojes (estilo Reels)

> Tienda web mobile-first con experiencia Reel/TikTok en teléfonos y catálogo tradicional en escritorio.
> Ventas cerradas directamente por WhatsApp. Sin pasarela de pago en Fase 1.

## ✨ Características implementadas (Fase 1)

| # | Característica | Estado |
|---|---|---|
| 1 | Feed vertical tipo Reel (CSS Scroll Snap, 1 producto = 100dvh) | ✅ |
| 2 | Galería horizontal por producto (Embla Carousel) | ✅ |
| 3 | Header flotante (logo + filtros/búsqueda/carrito) | ✅ |
| 4 | Barra lateral TikTok (Comparar / Specs) | ✅ |
| 5 | Overlay inferior (glass-morphism: título, precio USD/CRC, badge, CTA) | ✅ |
| 6 | Chips de marca filtrables | ✅ |
| 7 | Pantalla de cierre con tarjeta de confianza | ✅ |
| 8 | Bottom Sheet de **Specs** (Framer Motion) | ✅ |
| 9 | Bottom Sheet de **Filtros/Ordenamiento** | ✅ |
| 10 | Bottom Sheet de **Comparador** (tabla horizontal) | ✅ |
| 11 | Bottom Sheet de **Carrito** con checkout a WhatsApp | ✅ |
| 12 | URL pre-formateada `wa.me` con productos + total | ✅ |
| 13 | Deep linking `#seiko-presage` con splash de 500 ms | ✅ |
| 14 | History API: botón "Atrás" cierra el sheet | ✅ |
| 15 | Meta Pixel (`ViewContent`, `AddToCart`, `InitiateCheckout`, `Lead`) | ✅ |
| 16 | Vista de escritorio con cuadrícula (Tailwind `md:block`) | ✅ |
| 17 | Bottom Sheet de **Búsqueda** fuzzy (Fuse.js, live search, deep-link al producto) | ✅ |

## 🛠️ Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS 3** (mobile-first)
- **Embla Carousel** (galería horizontal)
- **Framer Motion** (Bottom Sheets)
- **Lucide React** (iconos)
- **Sin backend**: productos en `data/products.json`
- **next/image** con auto-formato WebP/AVIF

## 🚀 Cómo correrlo

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno y editar
cp .env.example .env

# 3. Levantar dev server
npm run dev
```

Abre `http://localhost:3000` en un dispositivo móvil o en las DevTools con la vista responsive.

## 📁 Estructura del proyecto

```
app/
├── layout.tsx              # Root layout + Meta Pixel + Viewport
├── page.tsx                # Página principal (breakpoint mobile vs desktop)
└── globals.css             # Tailwind + scroll-snap base + glass-morphism

components/
├── mobile/
│   ├── MobileFeed.tsx      # Contenedor snap-y (Hero → Chips → Reels → Trust)
│   ├── HeroScreen.tsx
│   ├── BrandChips.tsx
│   ├── ProductReelCard.tsx # ⭐ estrella: galería + overlays + CTA
│   ├── GalleryEmbla.tsx
│   ├── GalleryProgress.tsx
│   └── TrustCard.tsx
├── desktop/
│   └── DesktopGrid.tsx     # Cuadrícula catálogo
├── sheets/
│   ├── BottomSheet.tsx     # Wrapper reutilizable con Framer Motion
│   ├── SpecsSheet.tsx
│   ├── FiltersSheet.tsx
│   ├── CompareSheet.tsx
│   └── CartSheet.tsx
├── ui/
│   ├── IconButton.tsx
│   ├── StockBadge.tsx
│   └── FloatingHeader.tsx
└── providers/
    ├── SheetProvider.tsx   # Estado global + History API
    └── MetaPixel.tsx

lib/
├── types.ts                # Interfaces Product / Specs / FilterState / SheetKey
├── products.ts             # Data accessors + formateadores
├── filters.ts              # applyFilters + defaultFilterState
├── whatsapp.ts             # buildWhatsAppCheckoutUrl
├── metaPixel.ts            # track('ViewContent'|'AddToCart'|...)
└── deepLink.ts             # parseHashProductId + scrollToProductAfterSplash

data/
└── products.json           # Catálogo de ejemplo (Seiko / Tissot / Casio)

public/
├── watches/                # Imágenes WebP/AVIF (fase 2: migrar desde Unsplash)
└── brands/                 # Logos de marca
```

## 🧠 Decisiones técnicas clave

1. **CSS Scroll Snap nativo** para el feed vertical → mucho más fluido que un carrusel JS para 50+ slides.
2. **Embla solo para la galería horizontal** → permite `select` event para sincronizar las barras de progreso.
3. **`SheetProvider` con `useReducer` + Context** → un solo source of truth para sheets, carrito y comparador.
4. **History API**: cada sheet abierto hace `pushState({sheet:'...'})`; el evento `popstate` cierra el sheet en lugar de salir del feed.
5. **Mobile vs Desktop por Tailwind `md:` breakpoint** (no por JS mediaQuery) → sin flash en SSR.

## ⚠️ Limitaciones conocidas (Fase 1)

- Imágenes cargadas vía Unsplash (URLs externas); en Fase 2 conviene migrar a `public/watches/` para mejor control de AVIF y Lighthouse.
- No hay CMS ni panel admin: editar productos directamente en `data/products.json`.
- Sin tests automatizados todavía (siguiente iteración).

## 📞 Próximos pasos sugeridos

- [ ] Migrar imágenes a `public/watches/*.webp` local (mejor LCP).
- [ ] Tabla comparativa: hacer "sticky" la primera columna al hacer scroll horizontal.
- [ ] Persistencia del carrito en `localStorage`.
- [ ] Vista admin para gestionar productos desde el navegador.
