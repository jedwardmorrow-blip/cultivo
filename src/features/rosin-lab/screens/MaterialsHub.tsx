import { useState } from 'react';
import { Snowflake, Circle, Droplet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HubTabs } from '../components/HubTabs';
import { FreshFrozenInventory } from './FreshFrozenInventory';
import { HashInventory } from './HashInventory';
import { RosinInventory } from './RosinInventory';
import type { RosinLabScreen } from '../types/rosin-lab.types';

type MaterialTab = 'fresh-frozen' | 'hash' | 'rosin';

interface MaterialsHubProps {
  onNavigate: (screen: RosinLabScreen) => void;
}

const MATERIAL_TABS: { key: MaterialTab; label: string; icon: LucideIcon; accent: string }[] = [
  { key: 'fresh-frozen', label: 'Fresh Frozen', icon: Snowflake, accent: '#06B6D4' },
  { key: 'hash', label: 'Hash', icon: Circle, accent: '#F59E0B' },
  { key: 'rosin', label: 'Rosin', icon: Droplet, accent: '#6366F1' },
];

export function MaterialsHub({ onNavigate }: MaterialsHubProps) {
  const [activeTab, setActiveTab] = useState<MaterialTab>('fresh-frozen');

  const activeMaterial = MATERIAL_TABS.find((t) => t.key === activeTab)!;

  const tabs = MATERIAL_TABS.map(({ key, label }) => ({ key, label }));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-cult-text-primary">Materials</h1>
        <p className="text-sm text-cult-text-secondary mt-0.5">
          Fresh frozen, hash, and rosin inventory
        </p>
      </div>

      <div className="mb-5">
        <HubTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(key) => setActiveTab(key as MaterialTab)}
          accentColor={activeMaterial.accent}
        />
      </div>

      {activeTab === 'fresh-frozen' && <FreshFrozenInventory onNavigate={onNavigate} />}
      {activeTab === 'hash' && <HashInventory onNavigate={onNavigate} />}
      {activeTab === 'rosin' && <RosinInventory onNavigate={onNavigate} />}
    </div>
  );
}
