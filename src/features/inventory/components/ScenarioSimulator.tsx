/**
 * Scenario Simulator
 *
 * Interactive UI for running pre-defined movement scenarios.
 * Tests complex workflows like production, fulfillment, and reconciliation.
 */

import { useState } from 'react';
import { Play, CheckCircle, AlertCircle, Package, Truck, ClipboardCheck } from 'lucide-react';
import * as triggerTestingService from '../services/triggerTesting.service';
import type { ScenarioStep } from '../services/triggerTesting.service';

type ScenarioName = 'production' | 'fulfillment' | 'reconciliation';

interface ScenarioConfig {
  name: ScenarioName;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  steps: string[];
}

export function ScenarioSimulator() {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioName | null>(null);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ScenarioStep[]>([]);
  const [error, setError] = useState<string | null>(null);

  const scenarios: Record<ScenarioName, ScenarioConfig> = {
    production: {
      name: 'production',
      label: 'Production Workflow',
      description: 'Simulates the complete production cycle from raw material to finished product',
      icon: <Package className="w-6 h-6" />,
      color: 'green',
      steps: [
        'Create test inventory item (1000g)',
        'CONSUME 900g for bucking session',
        'PRODUCE 850g bulk after trim',
        'Verify quantity calculations',
        'Clean up test data'
      ]
    },
    fulfillment: {
      name: 'fulfillment',
      label: 'Order Fulfillment',
      description: 'Simulates order reservation and fulfillment process',
      icon: <Truck className="w-6 h-6" />,
      color: 'purple',
      steps: [
        'Create test inventory item (500g)',
        'RESERVE 100g for order',
        'FULFILLMENT 100g (ship to customer)',
        'Verify remaining quantity',
        'Clean up test data'
      ]
    },
    reconciliation: {
      name: 'reconciliation',
      label: 'Audit Reconciliation',
      description: 'Simulates physical count and inventory reconciliation',
      icon: <ClipboardCheck className="w-6 h-6" />,
      color: 'blue',
      steps: [
        'Create test inventory item (200g)',
        'Detect physical count discrepancy (195g)',
        'RECONCILIATION to correct quantity',
        'Verify adjustment applied',
        'Clean up test data'
      ]
    }
  };

  const runScenario = async (scenarioName: ScenarioName) => {
    try {
      setRunning(true);
      setError(null);
      setResults([]);
      setSelectedScenario(scenarioName);

      const steps = await triggerTestingService.simulateScenario(scenarioName);
      setResults(steps);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run scenario');
    } finally {
      setRunning(false);
    }
  };

  const getStepIcon = (action: string) => {
    if (action.includes('Setup') || action.includes('Create')) {
      return <Package className="w-4 h-4 text-blue-600" />;
    } else if (action.includes('Cleanup') || action.includes('Delete')) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (action.includes('Error')) {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    } else {
      return <Play className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900">Scenario Simulator</h2>
        <p className="text-gray-600 mt-1">Test complex workflows with pre-defined scenarios</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error Running Scenario</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scenario Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Select Scenario</h3>

          {(Object.values(scenarios) as ScenarioConfig[]).map((scenario) => (
            <button
              key={scenario.name}
              onClick={() => !running && runScenario(scenario.name)}
              disabled={running}
              className={`w-full text-left p-6 rounded-lg border-2 transition-all ${
                selectedScenario === scenario.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              } ${running ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg bg-${scenario.color}-100 text-${scenario.color}-600`}>
                  {scenario.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{scenario.label}</h4>
                    {selectedScenario === scenario.name && running && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full animate-pulse">
                        Running...
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-700">Steps:</p>
                    <ul className="text-xs text-gray-600 space-y-0.5">
                      {scenario.steps.map((step, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <span className="text-gray-400">•</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Results Display */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Execution Results</h3>

          {results.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="space-y-3">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {getStepIcon(result.action)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">{result.step}</p>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">{result.action}</p>
                      <p className="text-xs text-gray-600">{result.result}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-gray-900">Scenario Complete</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {results.length} steps executed
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg shadow-sm p-12 text-center">
              <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No scenario selected</p>
              <p className="text-sm text-gray-500">
                Choose a scenario from the left to begin testing
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">About Scenarios</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            Scenarios simulate real-world workflows by creating temporary test data, executing movements,
            and verifying trigger behavior. All test data is automatically cleaned up.
          </p>
          <p className="font-medium">
            Scenarios are safe to run - they use temporary data and don't affect production inventory.
          </p>
        </div>
      </div>
    </div>
  );
}
