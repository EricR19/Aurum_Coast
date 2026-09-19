'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useAppState, useAppActions } from '@/components/providers/SheetProvider';
import type { SheetKey } from '@/lib/types';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Tamaño máximo del sheet: 'default' = ~70dvh, 'tall' = ~90dvh */
  size?: 'default' | 'tall';
}

/**
 * Wrapper reutilizable para todos los paneles desplegables.
 * - Animación con Framer Motion.
 * - Cierra con tap en el backdrop o en la X.
 * - Respeta el ciclo de History API: está enlazado al provider para que
 *   el botón "Atrás" lo cierre en lugar de salir de la app.
 * - Bloquea scroll del body mientras está abierto.
 */
export function BottomSheet({ open, onClose, title, children, size = 'default' }: BottomSheetProps) {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      const prevPaddingRight = document.body.style.paddingRight;
      
      // FIX 2026-09-18: calculate scrollbar width to prevent layout shift
      // when overflow is hidden
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      return () => {
        document.body.style.overflow = prev;
        document.body.style.paddingRight = prevPaddingRight;
      };
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // Solo animamos opacity del contenedor. Esto es GPU-accelerated
          // (no toca layout). El backdrop blur queda solo en el sheet
          // cerrado (cuando la animacion termino) para que la entrada
          // sea fluida en gama media-baja.
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {/* Backdrop.
              ANTES: backdrop-blur-md (12px blur) — MUY caro en mobile GPU
              (~5ms/frame en gama media). Ahora: bg solido negro 85%.
              El blur se aplica solo cuando la animacion termina, con un
              will-change explicito para que el browser prepare la composicion. */}
          <motion.button
            type="button"
            aria-label="Cerrar panel"
            onClick={onClose}
            className="absolute inset-0 bg-black/85"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Sheet. Usamos `tween` con curva easeOutCubic en vez de `spring`
              para que la animacion sea deterministica (no recalcula physics
              cada frame) y mas performante en gama baja. Solo animamos `y`
              que es GPU-accelerated. */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl bg-zinc-900 text-white shadow-2xl"
            style={{
              maxHeight: size === 'tall' ? '90dvh' : '75dvh',
              // will-change le avisa al browser que vamos a animar este
              // elemento, asi puede subirlo a su propia compositing layer.
              willChange: 'transform',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'tween',
              ease: [0.32, 0.72, 0, 1], // easeOutCubic - entrada snappy
              duration: 0.32,
            }}
          >
            {/* Handle */}
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/20" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <h2 className="text-lg font-bold">{title}</h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(75dvh-90px)] overflow-y-auto px-5 pb-6">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Hook de conveniencia para componentes sheet.
 * Devuelve `open` SOLO si el sheet actual coincide con el `name` que el
 * componente declara. Así, 4 sheets pueden coexistir en el DOM y solo
 * se muestra el que esté activo, sin colisiones.
 *
 * Optimizado: solo se suscribe al contexto de ESTADO. La accion `closeSheet`
 * viene del contexto de ACCIONES (referencia estable, no causa re-renders).
 */
export function useSheetState(name: SheetKey): {
  open: boolean;
  onClose: () => void;
  selectedProduct: ReturnType<typeof useAppState>['selectedProduct'];
  compareIds: ReturnType<typeof useAppState>['compareIds'];
  cart: ReturnType<typeof useAppState>['cart'];
  activeBrand: ReturnType<typeof useAppState>['activeBrand'];
} {
  const { openSheet, selectedProduct, compareIds, cart, activeBrand } = useAppState();
  const { closeSheet } = useAppActions();
  return {
    open: openSheet === name,
    onClose: closeSheet,
    selectedProduct,
    compareIds,
    cart,
    activeBrand,
  };
}
