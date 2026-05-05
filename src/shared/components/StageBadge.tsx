export type CultivationStage = 'clone' | 'veg' | 'flower' | 'harvest' | 'cure' | 'package';

/**
 * StageBadge — neutral chip + 6px stage-color dot.
 *
 * Per CLAUDE.md > Banned patterns: stage colors are markers, not fills.
 * The badge surface is always neutral (cult-surface, cult-border-subtle,
 * cult-text-secondary). Stage identity is conveyed by the leading 6px dot.
 */

const stageConfig: Record<CultivationStage, { label: string; dot: string }> = {
  clone:   { label: 'Clone',      dot: 'bg-cult-stage-clone' },
  veg:     { label: 'Vegetative', dot: 'bg-cult-stage-veg' },
  flower:  { label: 'Flower',     dot: 'bg-cult-stage-flower' },
  harvest: { label: 'Harvest',    dot: 'bg-cult-stage-harvest' },
  cure:    { label: 'Cure',       dot: 'bg-cult-stage-cure' },
  package: { label: 'Package',    dot: 'bg-cult-stage-package' },
};

interface StageBadgeProps {
  stage: CultivationStage;
  size?: 'sm' | 'md';
  className?: string;
}

export function StageBadge({ stage, size = 'sm', className = '' }: StageBadgeProps) {
  const config = stageConfig[stage];
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[10px] gap-1.5'
    : 'px-3 py-1 text-[11px] gap-2';
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <span
      className={`inline-flex items-center font-mono uppercase tracking-[0.14em] border rounded border-cult-border-subtle bg-cult-surface text-cult-text-secondary ${sizeClasses} ${className}`}
    >
      <span className={`${dotSize} rounded-full ${config.dot} flex-shrink-0`} />
      {config.label}
    </span>
  );
}
