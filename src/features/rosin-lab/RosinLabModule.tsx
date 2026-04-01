import { RosinLabNav } from './components/RosinLabNav';
import { RosinDashboard } from './screens/RosinDashboard';
import { MaterialsHub } from './screens/MaterialsHub';
import { WashDryHub } from './screens/WashDryHub';
import { PressHub } from './screens/PressHub';
import { Analytics } from './screens/Analytics';
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
      case 'materials':
      case 'fresh-frozen':
      case 'hash':
      case 'rosin':
        return <MaterialsHub onNavigate={handleNavigate} />;
      case 'wash':
        return <WashDryHub onNavigate={handleNavigate} />;
      case 'press':
      case 'log':
        return <PressHub onNavigate={handleNavigate} />;
      case 'analytics':
        return <Analytics />;
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
