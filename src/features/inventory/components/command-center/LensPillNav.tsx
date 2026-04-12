import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export type LensId = 'strains' | 'pipeline' | 'coa' | 'ship' | 'raw';

interface LensDef {
  id: LensId;
  label: string;
  icon: LucideIcon;
  ready: boolean;
}

interface LensPillNavProps {
  lenses: LensDef[];
  active: LensId;
  onChange: (id: LensId) => void;
}

export function LensPillNav({ lenses, active, onChange }: LensPillNavProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-cult-near-black border border-cult-border-subtle w-fit">
      {lenses.map((lens) => {
        const isActive = lens.id === active;
        const Icon = lens.icon;
        return (
          <button
            key={lens.id}
            onClick={() => lens.ready && onChange(lens.id)}
            disabled={!lens.ready}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !lens.ready
                ? 'text-white/20 cursor-not-allowed'
                : isActive
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/70'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="lens-pill-active"
                className="absolute inset-0 rounded-lg bg-cult-surface-active border border-cult-border-active"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <Icon className="w-3.5 h-3.5" />
              {lens.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
