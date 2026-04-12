import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import type { LensId } from './LensPillNav';

interface LensContainerProps {
  activeId: LensId;
  children: ReactNode;
}

export function LensContainer({ activeId, children }: LensContainerProps) {
  return (
    <motion.div layoutId="lens-container" className="min-h-[400px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
