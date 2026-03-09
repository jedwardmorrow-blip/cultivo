import { useState, useEffect, useCallback } from 'react';
import { HubTabs } from '../components/HubTabs';
import { NewPressForm } from '../components/press/NewPressForm';
import { PackageRosinPanel } from '../components/press/PackageRosinPanel';
import { ActiveCures } from '../components/press/ActiveCures';
import {
  getPressRunsForPackaging,
  getActiveCureSessions,
} from '../services/rosinLabService';
import type { RosinLabScreen } from '../types/rosin-lab.types';

type PressTab = 'new-press' | 'package' | 'cures';

interface PressHubProps {
  onNavigate: (screen: RosinLabScreen) => void;
}

export function PressHub({ onNavigate: _onNavigate }: PressHubProps) {
  const [activeTab, setActiveTab] = useState<PressTab>('new-press');
  const [packageBadge, setPackageBadge] = useState(0);
  const [curesBadge, setCuresBadge] = useState(0);

  const loadBadges = useCallback(async () => {
    const [runs, cures] = await Promise.all([
      getPressRunsForPackaging(),
      getActiveCureSessions(),
    ]);
    setPackageBadge(runs.length);
    setCuresBadge(cures.length);
  }, []);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  const tabs = [
    { key: 'new-press', label: 'New Press Run' },
    { key: 'package', label: 'Package Rosin', badge: packageBadge },
    { key: 'cures', label: 'Active Cures', badge: curesBadge },
  ];

  function handleTabChange(key: string) {
    setActiveTab(key as PressTab);
    loadBadges();
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-[#FFFFFF]">Press</h1>
        <p className="text-sm text-[#A6A6A6] mt-0.5">
          Press hash into rosin, package, and cure
        </p>
      </div>

      <div
        className="bg-[#111111] border border-[#2E2E2E] rounded-md overflow-hidden"
        style={{ minHeight: 400 }}
      >
        <HubTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          accentColor="#F97316"
        />

        <div className="p-5">
          {activeTab === 'new-press' && (
            <NewPressForm onSuccess={() => { loadBadges(); setActiveTab('package'); }} />
          )}
          {activeTab === 'package' && <PackageRosinPanel />}
          {activeTab === 'cures' && <ActiveCures />}
        </div>
      </div>
    </div>
  );
}
