import { useState } from 'react';
import { Search } from 'lucide-react';
import { HubTabs } from '../components/HubTabs';
import { PressRunLog } from '../components/log/PressRunLog';
import { CureSessionLog } from '../components/log/CureSessionLog';
import type { RosinLabScreen } from '../types/rosin-lab.types';

type LogTab = 'press-runs' | 'cure-sessions';

interface PressCureLogProps {
  onNavigate: (screen: RosinLabScreen) => void;
}

const TABS = [
  { key: 'press-runs', label: 'Press Runs' },
  { key: 'cure-sessions', label: 'Cure Sessions' },
];

export function PressCureLog({ onNavigate: _onNavigate }: PressCureLogProps) {
  const [activeTab, setActiveTab] = useState<LogTab>('press-runs');
  const [searchTerm, setSearchTerm] = useState('');

  function handleTabChange(key: string) {
    setActiveTab(key as LogTab);
    setSearchTerm('');
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-cult-text-primary">Press &amp; Cure Log</h1>
          <p className="text-sm text-cult-text-secondary mt-0.5">
            Historical press runs and cure sessions
          </p>
        </div>

        {/* Search */}
        <div className="relative" style={{ width: 280 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cult-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search strain, batch…"
            className="w-full h-9 pl-9 pr-3 text-sm bg-cult-surface-overlay border border-cult-border rounded-[6px] text-cult-text-primary placeholder-cult-text-muted focus:outline-none focus:border-cult-border-strong"
          />
        </div>
      </div>

      {/* Content card */}
      <div className="bg-cult-surface-raised border border-cult-border rounded-[6px] overflow-hidden">
        <HubTabs
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          accentColor="#F97316"
        />
        <div className="p-5">
          {activeTab === 'press-runs' ? (
            <PressRunLog searchTerm={searchTerm} />
          ) : (
            <CureSessionLog searchTerm={searchTerm} />
          )}
        </div>
      </div>
    </div>
  );
}
