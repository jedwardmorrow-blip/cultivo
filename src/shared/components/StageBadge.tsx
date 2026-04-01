export type CultivationStage = 'clone' | 'veg' | 'flower' | 'harvest' | 'cure' | 'package';

const stageConfig: Record<CultivationStage, { label: string; color: string; bg: string }> = {
  clone: { label: 'Clone', color: 'text-cult-stage-clone', bg: 'bg-cult-stage-clone/10' },
  veg: { label: 'Vegetative', color: 'text-cult-stage-veg', bg: 'bg-cult-stage-veg/10' },
  flower: { label: 'Flower', color: 'text-cult-stage-flower', bg: 'bg-cult-stage-flower/10' },
  harvest: { label: 'Harvest', color: 'text-cult-stage-harvest', bg: 'bg-cult-stage-harvest/10' },
  cure: { label: 'Cure', color: 'text-cult-stage-cure', bg: 'bg-cult-stage-cure/10' },
  package: { label: 'Package', color: 'text-cult-stage-package', bg: 'bg-cult-stage-package/10' },
};

interface StageBadgeProps {
  stage: CultivationStage;
  size?: 'sm' | 'md';
  className?: string;
}

export function StageBadge({ stage, size = 'sm', className = '' }: StageBadgeProps) {
  const config = stageConfig[stage];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.color} ${sizeClasses} ${className}`}>
      {config.label}
    </span>
  );
}
