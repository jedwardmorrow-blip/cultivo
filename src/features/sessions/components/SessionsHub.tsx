import { useSearchParams } from 'react-router-dom';
import { Scissors, Leaf, Box } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BuckingSessionsRefactored } from './BuckingSessionsRefactored';
import { TrimSessionsRefactored } from './TrimSessionsRefactored';
import { PackagingSessionsRefactored } from './PackagingSessionsRefactored';

type SessionTab = 'bucking' | 'trim' | 'packaging';

const SESSION_TABS: { key: SessionTab; label: string; icon: LucideIcon; accent: string }[] = [
  { key: 'bucking', label: 'Bucking', icon: Scissors, accent: '#3B82F6' },
  { key: 'trim', label: 'Trim', icon: Leaf, accent: '#10B981' },
  { key: 'packaging', label: 'Packaging', icon: Box, accent: '#F59E0B' },
];

const TAB_KEYS: SessionTab[] = ['bucking', 'trim', 'packaging'];

export function SessionsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as SessionTab | null;
  const activeTab: SessionTab = tabParam && TAB_KEYS.includes(tabParam) ? tabParam : 'bucking';
  const setActiveTab = (tab: SessionTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const activeDef = SESSION_TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="flex flex-col gap-0">
      {/* Tabs */}
      <div className="flex items-end gap-0 border-b border-cult-border mb-5">
        {SESSION_TABS.map(({ key, label, icon: Icon, accent }) => {
          const isActive = key === activeTab;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`
                relative flex items-center gap-2 px-5 py-3 text-sm transition-colors
                border-b-2 -mb-px whitespace-nowrap
                ${isActive
                  ? 'text-cult-text-primary font-medium border-transparent'
                  : 'text-cult-text-secondary hover:text-cult-text-primary border-transparent'
                }
              `}
              style={isActive ? { borderBottomColor: accent } : undefined}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Content — render the full session component */}
      {activeTab === 'bucking' && <BuckingSessionsRefactored />}
      {activeTab === 'trim' && <TrimSessionsRefactored />}
      {activeTab === 'packaging' && <PackagingSessionsRefactored />}
    </div>
  );
}
