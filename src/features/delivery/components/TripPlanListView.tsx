import { useCallback, useEffect, useState } from 'react';
import { Eye, Printer, CheckCircle, Plus, RefreshCw } from 'lucide-react';
import type { TripPlan, TripPlanWithDetails } from '@/types';
import { getTripPlans } from '../services/tripPlan.service';
import { TripPlanGeneratorModal } from './TripPlanGeneratorModal';
import { TripPlanSignoffModal } from './TripPlanSignoffModal';
import { TripPlanCompleteForm } from './TripPlanCompleteForm';
import { TripPlanPrintView } from './TripPlanPrintView';

type StatusFilter = TripPlan['status'] | 'all';

const STATUS_LABELS: Record<TripPlan['status'], string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
};

const STATUS_COLORS: Record<TripPlan['status'], string> = {
  draft: 'bg-gray-700 text-gray-300',
  active: 'bg-cult-success/20 text-cult-success',
  completed: 'bg-cult-info/20 text-cult-info',
};

function fmt(dt: string | null | undefined): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TripPlanListView() {
  const [plans, setPlans] = useState<TripPlanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [showGenerator, setShowGenerator] = useState(false);
  const [signoffPlan, setSignoffPlan] = useState<TripPlanWithDetails | null>(null);
  const [completePlan, setCompletePlan] = useState<TripPlanWithDetails | null>(null);
  const [printPlan, setPrintPlan] = useState<TripPlanWithDetails | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getTripPlans(
      statusFilter === 'all' ? undefined : statusFilter
    );
    setPlans(data);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  function handleCreated(planId: string) {
    setShowGenerator(false);
    load();
  }

  function handleDispatched() {
    setSignoffPlan(null);
    load();
  }

  function handleCompleted() {
    setCompletePlan(null);
    load();
  }

  return (
    <div className="p-4 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {(['all', 'draft', 'active', 'completed'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                statusFilter === s
                  ? 'bg-cult-success text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s as TripPlan['status']]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-md disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowGenerator(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-cult-success hover:bg-cult-success/85 rounded-md"
          >
            <Plus className="w-3.5 h-3.5" />
            New Trip Plan
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading trip plans…</div>
      ) : plans.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p>No trip plans found.</p>
          <button
            onClick={() => setShowGenerator(true)}
            className="mt-3 text-cult-success hover:text-cult-success/80 text-sm"
          >
            Create your first trip plan
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800/60 border-b border-gray-700">
                <th className="px-4 py-2.5 text-left text-xs text-gray-400 uppercase tracking-wide">
                  Date
                </th>
                <th className="px-4 py-2.5 text-left text-xs text-gray-400 uppercase tracking-wide">
                  Driver
                </th>
                <th className="px-4 py-2.5 text-left text-xs text-gray-400 uppercase tracking-wide">
                  Vehicle
                </th>
                <th className="px-4 py-2.5 text-left text-xs text-gray-400 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-2.5 text-center text-xs text-gray-400 uppercase tracking-wide">
                  Stops
                </th>
                <th className="px-4 py-2.5 text-right text-xs text-gray-400 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-gray-300">{fmt(plan.departure_time ?? plan.created_at)}</td>
                  <td className="px-4 py-3 text-white font-medium">
                    {plan.driver.first_name} {plan.driver.last_name}
                    <span className="ml-1.5 text-gray-500 text-xs">FA# {plan.driver.fa_number}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {[plan.vehicle.year, plan.vehicle.make, plan.vehicle.model]
                      .filter(Boolean)
                      .join(' ') || '—'}
                    {plan.vehicle.license_plate && (
                      <span className="ml-1.5 text-gray-500 text-xs">{plan.vehicle.license_plate}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[plan.status]}`}
                    >
                      {STATUS_LABELS[plan.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400">{plan.stops.length}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Print */}
                      <button
                        onClick={() => setPrintPlan(plan)}
                        title="Print"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Draft: sign-off to dispatch */}
                      {plan.status === 'draft' && (
                        <button
                          onClick={() => setSignoffPlan(plan)}
                          title="Sign-Off & Dispatch"
                          className="p-1.5 text-cult-success hover:text-cult-success/80 hover:bg-gray-700 rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      {/* Active: complete trip */}
                      {plan.status === 'active' && (
                        <button
                          onClick={() => setCompletePlan(plan)}
                          title="Complete Trip"
                          className="p-1.5 text-cult-info hover:text-cult-info/80 hover:bg-gray-700 rounded"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showGenerator && (
        <TripPlanGeneratorModal
          onClose={() => setShowGenerator(false)}
          onCreated={handleCreated}
        />
      )}
      {signoffPlan && (
        <TripPlanSignoffModal
          plan={signoffPlan}
          onClose={() => setSignoffPlan(null)}
          onDispatched={handleDispatched}
        />
      )}
      {completePlan && (
        <TripPlanCompleteForm
          plan={completePlan}
          onClose={() => setCompletePlan(null)}
          onCompleted={handleCompleted}
        />
      )}
      {printPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 print:p-0 print:bg-white print:inset-auto">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg relative print:rounded-none print:max-h-none print:overflow-visible">
            <button
              onClick={() => setPrintPlan(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 print:hidden"
            >
              ✕
            </button>
            <TripPlanPrintView plan={printPlan} />
            <div className="flex justify-end px-8 pb-6 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
