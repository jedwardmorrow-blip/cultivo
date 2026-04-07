import { useState, useCallback } from 'react';
import { Calendar, GitCompareArrows } from 'lucide-react';
import type { DateRange, DatePreset } from '../utils/dateRange';
import { DATE_PRESETS, computeDateRange, getPresetForRange } from '../utils/dateRange';

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  compact?: boolean;
  showCompare?: boolean;
  compareEnabled?: boolean;
  onCompareToggle?: (enabled: boolean) => void;
}

export function DateRangeFilter({
  value,
  onChange,
  compact = false,
  showCompare = false,
  compareEnabled = false,
  onCompareToggle,
}: DateRangeFilterProps) {
  const [showCustom, setShowCustom] = useState(false);
  const activePreset = getPresetForRange(value);

  const handlePresetClick = useCallback(
    (preset: DatePreset) => {
      const range = computeDateRange(preset);
      onChange(range);
      setShowCustom(false);
    },
    [onChange]
  );

  const handleCustomDateChange = useCallback(
    (field: 'start' | 'end', dateStr: string) => {
      const updated = { ...value, [field]: dateStr, label: 'Custom' };
      onChange(updated);
    },
    [value, onChange]
  );

  const presets = compact
    ? DATE_PRESETS.filter((p) => ['30d', '60d', '90d', 'this_month', 'all_time'].includes(p.key))
    : DATE_PRESETS;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'bg-cult-near-black border border-cult-medium-gray/50 rounded-lg px-3 py-2'}`}>
      <div className="flex items-center gap-1 flex-wrap">
        {presets.map((preset) => (
          <button
            key={preset.key}
            onClick={() => handlePresetClick(preset.key)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 ${
              activePreset === preset.key && !showCustom
                ? 'bg-cult-success-muted text-cult-success border border-cult-success/30'
                : 'text-cult-silver hover:text-cult-white hover:bg-cult-dark-gray border border-transparent'
            }`}
          >
            {compact ? preset.shortLabel : preset.label}
          </button>
        ))}

        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1 ${
            showCustom || (!activePreset && value.label === 'Custom')
              ? 'bg-cult-success-muted text-cult-success border border-cult-success/30'
              : 'text-cult-silver hover:text-cult-white hover:bg-cult-dark-gray border border-transparent'
          }`}
        >
          <Calendar className="w-3 h-3" />
          {compact ? 'Custom' : 'Custom Range'}
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 ml-1">
          <input
            type="date"
            value={value.start}
            onChange={(e) => handleCustomDateChange('start', e.target.value)}
            className="bg-cult-dark-gray border border-cult-medium-gray rounded px-2 py-1 text-xs text-cult-white focus:border-cult-success/50 focus:outline-none"
          />
          <span className="text-xs text-cult-silver">to</span>
          <input
            type="date"
            value={value.end}
            onChange={(e) => handleCustomDateChange('end', e.target.value)}
            className="bg-cult-dark-gray border border-cult-medium-gray rounded px-2 py-1 text-xs text-cult-white focus:border-cult-success/50 focus:outline-none"
          />
        </div>
      )}

      {showCompare && onCompareToggle && (
        <button
          onClick={() => onCompareToggle(!compareEnabled)}
          className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 ${
            compareEnabled
              ? 'bg-cult-info-muted text-cult-info border border-cult-info/30'
              : 'text-cult-silver hover:text-cult-white hover:bg-cult-dark-gray border border-transparent'
          }`}
        >
          <GitCompareArrows className="w-3 h-3" />
          Compare
        </button>
      )}
    </div>
  );
}
