import { useState, useEffect, useCallback } from 'react';
import { HubTabs } from '../components/HubTabs';
import { NewWashForm } from '../components/wash/NewWashForm';
import { ActiveWashRuns } from '../components/wash/ActiveWashRuns';
import { FreezeDryerPanel } from '../components/wash/FreezeDryerPanel';
import { CompletedWashRuns } from '../components/wash/CompletedWashRuns';
import { getPipelineStageCounts } from '../services/rosinLabService';
import type { RosinLabScreen } from '../types/rosin-lab.types';

type WashTab = 'new-wash' | 'active' | 'freeze-dryer' | 'completed';

interface WashDryHubProps {
  onNavigate: (screen: RosinLabScreen) => void;
}

export function WashDryHub({ onNavigate: _onNavigate }: WashDryHubProps) {
  const [activeTab, setActiveTab] = useState<WashTab>('new-wash');
  const [washCount, setWashCount] = useState(0);
  const [fdCount, setFdCount] = useState(0);

  const fetchCounts = useCallback(async () => {
    const counts = await getPipelineStageCounts();
    setWashCount(counts.wash ?? 0);
    setFdCount(counts.fd ?? 0);
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  function handleTabChange(key: string) {
    setActiveTab(key as WashTab);
    fetchCounts();
  }

  const tabs = [
    { key: 'new-wash', label: 'New Wash Run' },
    { key: 'active', label: 'Active', badge: washCount },
    { key: 'freeze-dryer', label: 'Freeze Dryer', badge: fdCount },
    { key: 'completed', label: 'Completed' },
  ];

  function handleNewWashSuccess() {
    setActiveTab('active');
    fetchCounts();
  }

  function renderTab() {
    switch (activeTab) {
      case 'new-wash':
        return <NewWashForm onSuccess={handleNewWashSuccess} />;
      case 'active':
        return (
          <ActiveWashRuns
            onNewWash={() => handleTabChange('new-wash')}
            onFreezeDryer={() => handleTabChange('freeze-dryer')}
          />
        );
      case 'freeze-dryer':
        return <FreezeDryerPanel />;
      case 'completed':
        return <CompletedWashRuns />;
    }
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-cult-text-primary">Wash &amp; Dry</h1>
        <p className="text-sm text-cult-text-secondary mt-0.5">
          Wash fresh frozen material and freeze dry for pressing
        </p>
      </div>

      {/* Content card */}
      <div className="bg-cult-surface-raised border border-cult-border rounded-[6px] overflow-hidden">
        <HubTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          accentColor="#3B82F6"
        />
        <div className="p-5">{renderTab()}</div>
      </div>
    </div>
  );
}
