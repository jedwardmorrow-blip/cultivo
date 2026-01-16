/**
 * Test Mode Dashboard Page
 *
 * Comprehensive testing interface for the event-driven inventory system.
 * Provides trigger testing, movement testing, scenario simulation, and monitoring.
 */

import { useState } from 'react';
import { TriggerTestingDashboard } from '@/features/inventory/components/TriggerTestingDashboard';
import { MovementTestingPanel } from '@/features/inventory/components/MovementTestingPanel';
import { ScenarioSimulator } from '@/features/inventory/components/ScenarioSimulator';
import { Activity, Play, Zap } from 'lucide-react';

type TabView = 'monitor' | 'manual' | 'scenarios';

export default function TestModeDashboard() {
  const [activeView, setActiveView] = useState<TabView>('monitor');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Test Mode Dashboard</h1>
          </div>
          <p className="text-blue-100">
            Comprehensive testing and validation for the event-driven inventory trigger system
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <nav className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveView('monitor')}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeView === 'monitor'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Activity className="w-5 h-5" />
              Monitor & Health
            </button>
            <button
              onClick={() => setActiveView('manual')}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeView === 'manual'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Play className="w-5 h-5" />
              Manual Testing
            </button>
            <button
              onClick={() => setActiveView('scenarios')}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeView === 'scenarios'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Zap className="w-5 h-5" />
              Scenario Simulation
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div>
          {activeView === 'monitor' && <TriggerTestingDashboard />}
          {activeView === 'manual' && <MovementTestingPanel />}
          {activeView === 'scenarios' && <ScenarioSimulator />}
        </div>
      </div>
    </div>
  );
}
