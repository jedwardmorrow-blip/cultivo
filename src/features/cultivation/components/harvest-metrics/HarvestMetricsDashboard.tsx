import { useState } from 'react';
import { BarChart3, Leaf, Home, DollarSign, ArrowLeft } from 'lucide-react';
import { PageSkeleton } from '@/shared/components';
import { useHarvestMetrics } from '../../hooks/useHarvestMetrics';
import { MetricsScorecard } from './MetricsScorecard';
import { StrainBreakdown } from './StrainBreakdown';
import { RoomLeaderboard } from './RoomLeaderboard';
import { StrainLeaderboard } from './StrainLeaderboard';
import { CostAnalysis } from './CostAnalysis';

type MetricsTab = 'scorecard' | 'strains' | 'rooms' | 'cost';

const TAB_CONFIG: { key: MetricsTab; label: string; icon: typeof BarChart3 }[] = [
  { key: 'scorecard', label: 'Scorecard', icon: BarChart3 },
  { key: 'strains', label: 'Strains', icon: Leaf },
  { key: 'rooms', label: 'Rooms', icon: Home },
  { key: 'cost', label: 'Cost', icon: DollarSign },
];

interface HarvestMetricsDashboardProps {
  onBack: () => void;
}

export function HarvestMetricsDashboard({ onBack }: HarvestMetricsDashboardProps) {
  const { rows, totals, strainAggregates, roomAggregates, loading, error } = useHarvestMetrics();
  const [activeTab, setActiveTab] = useState<MetricsTab>('scorecard');

  if (loading) {
    return <PageSkeleton variant="cards" />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-cult-light-gray hover:text-cult-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Harvests
        </button>
        <div className="bg-red-950 border border-red-700 text-red-300 text-sm p-4">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-cult-light-gray hover:text-cult-white text-sm transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Harvests
          </button>
          <h1 className="text-3xl font-bold text-cult-white">Harvest Metrics</h1>
          <p className="text-cult-light-gray mt-2">
            Yield analysis across {totals.harvest_count} completed harvest{totals.harvest_count !== 1 ? 's' : ''}
            {strainAggregates.length > 0 && ` covering ${strainAggregates.length} strain${strainAggregates.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <div className="flex gap-0 border-b border-cult-medium-gray">
        {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-px ${
              activeTab === key
                ? 'border-cult-white text-cult-white'
                : 'border-transparent text-cult-medium-gray hover:text-cult-light-gray'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'scorecard' && (
        <div className="space-y-8">
          <MetricsScorecard totals={totals} />

          {strainAggregates.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-cult-white uppercase tracking-wider">Strain Breakdown</h2>
              <StrainBreakdown strainAggregates={strainAggregates} rows={rows} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'strains' && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-cult-white uppercase tracking-wider">Strain Leaderboard</h2>
          <p className="text-cult-light-gray text-sm">Strains ranked by average dry yield percentage</p>
          <StrainLeaderboard strainAggregates={strainAggregates} />
        </div>
      )}

      {activeTab === 'rooms' && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-cult-white uppercase tracking-wider">Room Leaderboard</h2>
          <p className="text-cult-light-gray text-sm">Rooms ranked by total dry weight output</p>
          <RoomLeaderboard roomAggregates={roomAggregates} />
        </div>
      )}

      {activeTab === 'cost' && (
        <CostAnalysis rows={rows} totals={totals} strainAggregates={strainAggregates} roomAggregates={roomAggregates} />
      )}
    </div>
  );
}
