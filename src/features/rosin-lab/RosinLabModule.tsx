import { FlaskConical } from 'lucide-react';
import { RosinLabNav } from './components/RosinLabNav';
import { RosinDashboard } from './screens/RosinDashboard';
import { FreshFrozenInventory } from './screens/FreshFrozenInventory';
import { HashInventory } from './screens/HashInventory';
import type { RosinLabScreen } from './types/rosin-lab.types';

function viewToScreen(view: string): RosinLabScreen {
  if (view === 'rosin-lab') return 'dashboard';
  if (view.startsWith('rosin-lab-')) {
    return view.replace('rosin-lab-', '') as RosinLabScreen;
  }
  return 'dashboard';
}

function screenToView(screen: RosinLabScreen): string {
  if (screen === 'dashboard') return 'rosin-lab';
  return `rosin-lab-${screen}`;
}

interface ComingSoonProps {
  label: string;
}

function ComingSoon({ label }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <FlaskConical className="w-12 h-12 text-cult-border-strong" />
      <p className="text-[15px] font-semibold text-cult-text-secondary">{label}</p>
      <p className="text-[13px] text-cult-text-muted">This screen is coming soon.</p>
    </div>
  );
}

interface RosinLabModuleProps {
  setCurrentView: (view: string) => void;
  currentView: string;
}

export function RosinLabModule({ setCurrentView, currentView }: RosinLabModuleProps) {
  const activeScreen = viewToScreen(currentView);

  function handleNavigate(screen: RosinLabScreen) {
    setCurrentView(screenToView(screen));
  }

  function renderScreen() {
    switch (activeScreen) {
      case 'dashboard':
        return <RosinDashboard onNavigate={handleNavigate} />;
      case 'fresh-frozen':
        return <FreshFrozenInventory onNavigate={handleNavigate} />;
      case 'hash':
        return <HashInventory onNavigate={handleNavigate} />;
      case 'rosin':
        return <ComingSoon label="Rosin" />;
      case 'wash':
        return <ComingSoon label="New Wash" />;
      case 'press':
        return <ComingSoon label="Press" />;
      case 'log':
        return <ComingSoon label="Press & Cure Log" />;
      case 'analytics':
        return <ComingSoon label="Analytics" />;
      default:
        return <RosinDashboard onNavigate={handleNavigate} />;
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-130px)] -mx-6 -mt-8">
      <div
        className="flex-shrink-0 bg-cult-surface-raised border-r border-cult-border"
        style={{ width: 220 }}
      >
        <RosinLabNav
          activeScreen={activeScreen}
          onNavigate={handleNavigate}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1180px] mx-auto px-6 py-6">
          {renderScreen()}
        </div>
      </div>
    </div>
  );
}
