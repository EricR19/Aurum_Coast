'use client';

interface GalleryProgressProps {
  total: number;
  active: number;
}

/**
 * Barras de progreso delgadas superiores, estilo Instagram.
 * Cada slide tiene una barra horizontal; la activa se rellena suavemente.
 *
 * Estados por barra (de izquierda a derecha):
 *   - i < active  -> scaleX(1)  ya visitada, llena
 *   - i === active -> scaleX(1)  activa, llena (no se distingue visualmente
 *                                de las visitadas, pero queda lista para
 *                                animarse si el usuario avanza)
 *   - i > active  -> scaleX(0)  pendiente, vacia
 *
 * BUG HISTORICO: en la simplificacion de Fase 1 (#13) perdi el estado
 * intermedio de "activa = llena". El codigo decia `i < active ? 1 : 0`,
 * lo que hacia que la barra activa quedara vacia. Esto daba la impresion
 * de que faltaba una barra cuando habia 2+ fotos y estabas en la primera.
 *
 * Performance:
 * - Un unico `transform: scaleX(...)` con `transform-origin: left`,
 *   GPU-accelerated y sin re-paint. Sin clases dinamicas de Tailwind.
 */
export function GalleryProgress({ total, active }: GalleryProgressProps) {
  if (total <= 1) return null;
  return (
    <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pt-2">
      {Array.from({ length: total }).map((_, i) => {
        const progress = i <= active ? 1 : 0;
        return (
          <div
            key={i}
            className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30"
          >
            <div
              className="h-full origin-left bg-white"
              style={{
                transform: `scaleX(${progress})`,
                transition: 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
