import { useState, useEffect } from 'react';
import { Scissors, Box, Package } from 'lucide-react';
import { BuckingSessionsRefactored } from './BuckingSessionsRefactored';
import { TrimSessionsRefactored } from './TrimSessionsRefactored';
import { PackagingSessionsRefactored } from './PackagingSessionsRefactored';
import type { SessionType } from '../types';

export function SessionsUnified() {
  const [activeTab, setActiveTab] = useState<SessionType>('bucking');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as SessionType;
    if (tab && ['bucking', 'trim', 'packaging'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const handleTabChange = (tab: SessionType) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());
  };

  const tabs = [
    {
      id: 'bucking' as SessionType,
      label: 'Bucking',
      icon: Package,
      description: 'Binned → Bucked'
    },
    {
      id: 'trim' as SessionType,
      label: 'Trim',
      icon: Scissors,
      description: 'Bucked → Bulk'
    },
    {
      id: 'packaging' as SessionType,
      label: 'Packaging',
      icon: Box,
      description: 'Bulk → Packaged'
    }
  ];

  return (
    <div className="min-h-screen bg-cult-black">
      <div className="bg-cult-graphite border-b border-cult-charcoal sticky top-[73px] z-40 shadow-glow">
        <div className="max-w-[1800px] mx-auto px-6">
          <div className="flex items-center gap-2 py-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-cult-off-white text-cult-black shadow-lg'
                      : 'bg-cult-charcoal text-cult-silver hover:bg-cult-medium-gray hover:text-cult-off-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-sm font-bold uppercase tracking-wider">{tab.label}</div>
                    <div className={`text-xs ${isActive ? 'text-cult-dark-gray' : 'text-cult-silver'}`}>
                      {tab.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto">
        {activeTab === 'bucking' && <BuckingSessionsRefactored />}
        {activeTab === 'trim' && <TrimSessionsRefactored />}
        {activeTab === 'packaging' && <PackagingSessionsRefactored />}
      </div>
    </div>
  );
}
