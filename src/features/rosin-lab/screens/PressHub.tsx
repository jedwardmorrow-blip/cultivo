import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { HubTabs } from '../components/HubTabs';
import { NewPressForm } from '../components/press/NewPressForm';
import { PackageRosinPanel } from '../components/press/PackageRosinPanel';
import { ActiveCures } from '../components/press/ActiveCures';
import { PressRunLog } from '../components/log/PressRunLog';
import { CureSessionLog } from '../components/log/CureSessionLog';
import {
  getPressRunsForPackaging,
  getActiveCureSessions,
} from '../services/rosinLabService';
import type { RosinLabScreen } from '../types/rosin-lab.types';

type PressTab = 'new-press' | 'package' | 'cures' | 'history';

interface PressHubProps {
  onNavigate: (screen: RosinLabScreen) => void;
}

type HistorySubTab = 'press-runs' | 'cure-sessions';

function HistoryPanel() {
  const [subTab, setSubTab] = useState<HistorySubTab>('press-runs');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setSubTab('press-runs'); setSearchTerm(''); }}
            className={`px-3 py-1.5 text-sm rounded-[5px] transition-colors ${
              subTab === 'press-runs'
                ? 'bg-cult-surface-overlay text-cult-text-primary font-medium'
                : 'text-cult-text-secondary hover:text-cult-text-primary'
            }`}
          >
            Press Runs
          </button>
          <button
            onClick={() => { setSubTab('cure-sessions'); setSearchTerm(''); }}
            className={`px-3 py-1.5 text-sm rounded-[5px] transition-colors ${
              subTab === 'cure-sessions'
                ? 'bg-cult-surface-overlay text-cult-text-primary font-medium'
                : 'text-cult-text-secondary hover:text-cult-text-primary'
            }`}
          >
            Cure Sessions
          </button>
        </div>
        <div className="relative" style={{ width: 240 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cult-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search strain, batch…"
            className="w-full h-8 pl-9 pr-3 text-sm bg-cult-surface-overlay border border-cult-border rounded-[6px] text-cult-text-primary placeholder-cult-text-muted focus:outline-none focus:border-cult-border-strong"
          />
        </div>
      </div>
      {subTab === 'press-runs' ? (
        <PressRunLog searchTerm={searchTerm} />
      ) : (
        <CureSessionLog searchTerm={searchTerm} />
      )}
    </div>
  );
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
    { key: 'history', label: 'History' },
  ];

  function handleTabChange(key: string) {
    setActiveTab(key as PressTab);
    if (key !== 'history') loadBadges();
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
          {activeTab === 'history' && <HistoryPanel />}
        </div>
      </div>
    </div>
  );
}
