import type { HealthStatus, GradeCode, SortMode } from '../../hooks/useSalesPipeline';
import { HEALTH_STYLES, GRADE_STYLES } from './pipelineConstants';

interface PipelineFilterBarProps {
  healthFilter: HealthStatus | 'all';
  setHealthFilter: (v: HealthStatus | 'all') => void;
  gradeFilter: GradeCode | 'all';
  setGradeFilter: (v: GradeCode | 'all') => void;
  sortMode: SortMode;
  setSortMode: (v: SortMode) => void;
}

const HEALTH_OPTIONS: (HealthStatus | 'all')[] = ['all', 'critical', 'low', 'warning', 'healthy'];
const GRADE_OPTIONS: (GradeCode | 'all')[] = ['all', 'CULT', 'B', 'C', 'D', 'UNDEFINED'];

export function PipelineFilterBar({
  healthFilter, setHealthFilter,
  gradeFilter, setGradeFilter,
  sortMode, setSortMode,
}: PipelineFilterBarProps) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-bold text-neutral-600 tracking-[0.08em] mr-1">HEALTH</span>
        {HEALTH_OPTIONS.map(h => {
          const active = healthFilter === h;
          const hs = h !== 'all' ? HEALTH_STYLES[h] : null;
          return (
            <button
              key={h}
              onClick={() => setHealthFilter(h)}
              className={`px-2 py-[3px] rounded-md text-xs font-semibold border transition-all duration-150 capitalize ${
                active
                  ? hs
                    ? `${hs.bg} ${hs.text} ${hs.border}`
                    : 'bg-neutral-800 text-neutral-300 border-neutral-600'
                  : 'bg-transparent text-neutral-600 border-neutral-800 hover:text-neutral-400'
              }`}
            >
              {h === 'all' ? 'All' : h}
            </button>
          );
        })}

        <span className="mx-2 w-px h-4 bg-neutral-800" />

        <span className="text-xs font-bold text-neutral-600 tracking-[0.08em] mr-1">GRADE</span>
        {GRADE_OPTIONS.map(g => {
          const active = gradeFilter === g;
          const gs = g !== 'all' ? GRADE_STYLES[g] : null;
          return (
            <button
              key={g}
              onClick={() => setGradeFilter(g)}
              className={`px-2 py-[3px] rounded-md text-xs font-semibold border transition-all duration-150 ${
                active
                  ? gs
                    ? `${gs.bg} ${gs.text} ${gs.border}`
                    : 'bg-neutral-800 text-neutral-300 border-neutral-600'
                  : 'bg-transparent text-neutral-600 border-neutral-800 hover:text-neutral-400'
              }`}
            >
              {g === 'all' ? 'All' : g === 'UNDEFINED' ? 'U' : g}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-neutral-600 tracking-[0.08em]">SORT</span>
        <select
          value={sortMode}
          onChange={e => setSortMode(e.target.value as SortMode)}
          className="text-xs font-semibold rounded-md px-2 py-[3px] border cursor-pointer outline-none bg-cult-black text-neutral-400 border-cult-border/40"
        >
          <option value="revenue">Revenue</option>
          <option value="health">Health</option>
          <option value="name">Name</option>
        </select>
      </div>
    </div>
  );
}
