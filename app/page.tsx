import { MobileFeed } from '@/components/mobile/MobileFeed';
import { DesktopGrid } from '@/components/desktop/DesktopGrid';

/**
 * Página raíz del proyecto.
 * Render condicional por breakpoint:
 *  - < md  → MobileFeed (Reels inmersivos + Bottom Sheets incluidos)
 *  - >= md → DesktopGrid (catálogo en cuadrícula)
 *
 * NOTA: Los Bottom Sheets están montados dentro de MobileFeed porque
 * dependen del SheetProvider y del estado del Reel.
 */
export default function HomePage() {
  return (
    <>
      {/* ---- MÓVIL ---- */}
      <div className="block md:hidden">
        <MobileFeed storeName={process.env.NEXT_PUBLIC_STORE_NAME ?? 'AURUM COAST'} />
      </div>

      {/* ---- ESCRITORIOR ---- */}
      <div className="hidden md:block">
        <DesktopGrid />
      </div>
    </>
  );
}
