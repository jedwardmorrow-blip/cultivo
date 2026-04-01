import type React from 'react';
import { Snowflake, Waves, Wind, Circle, ArrowDownToLine, FlaskConical, ChevronRight } from 'lucide-react';
import type { RosinLabScreen } from '../types/rosin-lab.types';

interface StageConfig {
  key: string;
  label: string;
  color: string;
  navKey: RosinLabScreen;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

const STAGES: StageConfig[] = [
  { key: 'ff', label: 'Fresh Frozen', color: '#06B6D4', navKey: 'fresh-frozen', Icon: Snowflake },
  { key: 'wash', label: 'Wash', color: '#3B82F6', navKey: 'wash', Icon: Waves },
  { key: 'fd', label: 'Freeze Dry', color: '#94A3B8', navKey: 'hash', Icon: Wind },
  { key: 'hash', label: 'Hash', color: '#F59E0B', navKey: 'hash', Icon: Circle },
  { key: 'press', label: 'Press', color: '#F97316', navKey: 'press', Icon: ArrowDownToLine },
  { key: 'cure', label: 'Cure', color: '#8B5CF6', navKey: 'rosin', Icon: FlaskConical },
];

interface PipelineStagesProps {
  counts: Record<string, number>;
  onStageClick: (screen: RosinLabScreen) => void;
}

export function PipelineStages({ counts, onStageClick }: PipelineStagesProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {STAGES.map((stage, index) => {
        const count = counts[stage.key] ?? 0;
        const isLast = index === STAGES.length - 1;

        return (
          <div key={stage.key} className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onStageClick(stage.navKey)}
              className="flex flex-col items-center gap-1.5 w-[88px] rounded-cult border bg-cult-surface-raised hover:bg-cult-surface-overlay transition-all duration-200 py-3 px-2 group"
              style={{ borderColor: stage.color + '40', borderTopColor: stage.color, borderTopWidth: 3 }}
            >
              <stage.Icon
                className="w-5 h-5 transition-transform group-hover:scale-110"
                style={{ color: stage.color }}
              />
              <span className="text-xs font-semibold text-cult-silver text-center leading-tight">
                {stage.label}
              </span>
              <span
                className="text-base font-bold leading-none"
                style={{ color: count > 0 ? stage.color : '#404040' }}
              >
                {count}
              </span>
            </button>

            {!isLast && (
              <ChevronRight className="w-4 h-4 text-cult-border-strong flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
