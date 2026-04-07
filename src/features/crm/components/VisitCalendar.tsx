import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  CalendarDays,
  RefreshCw,
  Plus,
  CheckCircle2,
  X,
  Truck,
  ExternalLink,
  AlertTriangle,
  CalendarClock,
  Users,
} from 'lucide-react';
import { LoadingSpinner } from '@/shared/components';
import { formatCurrency } from '@/shared/utils/format';
import { getOrderStatusStyle, isOrderReadyStatus } from '@/features/delivery/utils';
import { getVisitCadence } from '../services/crm.service';
import type { VisitCadenceItem, ComplianceStatus } from '../types/crm.types';
import { useVisitCalendar } from '../hooks';
import type { VisitSchedule, VisitType, CRMCalendarOrder } from '../types';
import { VisitScheduleModal } from './VisitScheduleModal';

const visitTypeColors: Record<VisitType, { bg: string; text: string; dot: string }> = {
  check_in: { bg: 'bg-teal-500/15', text: 'text-teal-400', dot: 'bg-teal-400' },
  sample_drop: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  new_pitch: { bg: 'bg-sky-500/15', text: 'text-sky-400', dot: 'bg-sky-400' },
  relationship: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
};

const visitTypeLabels: Record<VisitType, string> = {
  check_in: 'Check-in',
  sample_drop: 'Sample Drop',
  new_pitch: 'New Pitch',
  relationship: 'Relationship',
};


const COMPLIANCE_CONFIG: Record<ComplianceStatus, { label: string; color: string; bg: string; border: string; order: number }> = {
  overdue: { label: 'Overdue', color: 'text-cult-danger', bg: 'bg-cult-danger/15', border: 'border-cult-danger/30', order: 0 },
  never_visited: { label: 'Never Visited', color: 'text-cult-warning', bg: 'bg-cult-warning/15', border: 'border-cult-warning/30', order: 1 },
  due_soon: { label: 'Due Soon', color: 'text-cult-warning', bg: 'bg-cult-warning/15', border: 'border-cult-warning/30', order: 2 },
  scheduled: { label: 'Scheduled', color: 'text-cult-info', bg: 'bg-cult-info/15', border: 'border-cult-info/30', order: 3 },
  on_track: { label: 'On Track', color: 'text-cult-success', bg: 'bg-cult-success/15', border: 'border-cult-success/30', order: 4 },
};

const CADENCE_LS_KEY = 'cult-crm-calendar-showCadence';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const LS_KEY = 'cult-crm-calendar-showDeliveries';

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDeliveryStatusDot(orders: CRMCalendarOrder[]): string {
  if (orders.length === 0) return '';
  const allReady = orders.every(o => isOrderReadyStatus(o.status));
  if (allReady) return 'bg-cult-success';
  const someReady = orders.some(o => isOrderReadyStatus(o.status));
  return someReady ? 'bg-cult-warning' : 'bg-cult-warning';
}


function StatBlock({ label, value, icon: Icon, iconColor }: { label: string; value: number; icon: React.ElementType; iconColor: string }) {
  return (
    <div className="bg-cult-dark-gray border border-cult-medium-gray rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-xs text-cult-silver">{label}</span>
      </div>
      <div className="text-2xl font-bold text-cult-white">{value}</div>
    </div>
  );
}
interface VisitCalendarProps {
  onSelectOrder?: (orderId: string) => void;
}

export function VisitCalendar({ onSelectOrder }: VisitCalendarProps) {
  const navigate = useNavigate();
  const {
    visitsByDate,
    ordersByDate,
    year,
    month,
    loading,
    scheduledCount,
    completedCount,
    deliveryCount,
    navigateMonth,
    reload,
    actions,
  } = useVisitCalendar();

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayVisits, setSelectedDayVisits] = useState<VisitSchedule[]>([]);
  const [selectedDayOrders, setSelectedDayOrders] = useState<CRMCalendarOrder[]>([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [completingVisit, setCompletingVisit] = useState<VisitSchedule | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [draggedVisit, setDraggedVisit] = useState<VisitSchedule | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [showDeliveries, setShowDeliveries] = useState(() => {
    const stored = localStorage.getItem(LS_KEY);
    return stored === null ? true : stored === 'true';
  });


  // Cadence panel state
  const [cadenceAccounts, setCadenceAccounts] = useState<VisitCadenceItem[]>([]);
  const [cadenceLoading, setCadenceLoading] = useState(false);
  const [showCadencePanel, setShowCadencePanel] = useState(() => {
    const stored = localStorage.getItem(CADENCE_LS_KEY);
    return stored === null ? false : stored === 'true';
  });

  // Load cadence data
  const loadCadence = useCallback(async () => {
    setCadenceLoading(true);
    try {
      const { data, error } = await getVisitCadence();
      if (data && !error) {
        // Sort by compliance urgency
        const sorted = [...data].sort((a, b) => {
          const orderA = COMPLIANCE_CONFIG[a.compliance_status]?.order ?? 99;
          const orderB = COMPLIANCE_CONFIG[b.compliance_status]?.order ?? 99;
          if (orderA !== orderB) return orderA - orderB;
          return (a.days_until_due ?? 999) - (b.days_until_due ?? 999);
        });
        setCadenceAccounts(sorted);
      }
    } catch (err) {
      console.error('Failed to load cadence data:', err);
    } finally {
      setCadenceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showCadencePanel) loadCadence();
  }, [showCadencePanel, loadCadence]);

  const toggleCadencePanel = () => {
    setShowCadencePanel(prev => {
      const next = !prev;
      localStorage.setItem(CADENCE_LS_KEY, String(next));
      return next;
    });
  };

  // Cadence summary stats
  const cadenceStats = {
    overdue: cadenceAccounts.filter(a => a.compliance_status === 'overdue').length,
    dueSoon: cadenceAccounts.filter(a => a.compliance_status === 'due_soon').length,
    neverVisited: cadenceAccounts.filter(a => a.compliance_status === 'never_visited').length,
    onTrack: cadenceAccounts.filter(a => a.compliance_status === 'on_track' || a.compliance_status === 'scheduled').length,
    total: cadenceAccounts.length,
  };

  const toggleDeliveries = () => {
    setShowDeliveries(prev => {
      const next = !prev;
      localStorage.setItem(LS_KEY, String(next));
      return next;
    });
  };

  const today = formatDateLocal(new Date());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const handleDayClick = (day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const visits = visitsByDate[dateKey] || [];
    const dayOrders = ordersByDate[dateKey] || [];
    setSelectedDate(dateKey);
    setSelectedDayVisits(visits);
    setSelectedDayOrders(dayOrders);
    setShowDayModal(true);
  };

  const handleDrop = async (dateKey: string) => {
    if (!draggedVisit) return;
    await actions.reschedule(draggedVisit.id, dateKey);
    setDraggedVisit(null);
    setDragOverDate(null);
  };

  const handleCompleteVisit = async () => {
    if (!completingVisit) return;
    await actions.complete(completingVisit.id, outcomeNotes);
    setCompletingVisit(null);
    setOutcomeNotes('');
    setShowDayModal(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0 space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cult-white">Visit Calendar</h1>
          <p className="text-cult-light-gray mt-2">Schedule and track account visits</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDeliveries}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showDeliveries
                ? 'text-cult-warning bg-cult-warning/10 border-cult-warning/30 hover:bg-cult-warning/20'
                : 'text-cult-silver bg-cult-dark-gray border-cult-medium-gray hover:text-cult-white hover:bg-cult-charcoal'
            }`}
            title={showDeliveries ? 'Hide deliveries' : 'Show deliveries'}
          >
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">Deliveries</span>
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-cult-black bg-cult-white rounded-lg hover:bg-cult-off-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Schedule Visit
          </button>
            <button onClick={toggleCadencePanel} className={`p-2 ${showCadencePanel ? "text-cult-info" : "text-cult-silver"} hover:text-cult-white bg-cult-dark-gray border border-cult-medium-gray rounded-lg hover:bg-cult-charcoal transition-colors`} title="Toggle Visit Cadence Panel">
              <CalendarClock className="w-4 h-4" />
            </button>
          <button onClick={reload} className="p-2 text-cult-silver hover:text-cult-white bg-cult-dark-gray border border-cult-medium-gray rounded-lg hover:bg-cult-charcoal transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBlock label="Scheduled" value={scheduledCount} icon={CalendarDays} iconColor="text-cult-info" />
        <StatBlock label="Completed" value={completedCount} icon={CheckCircle2} iconColor="text-cult-success" />
        <StatBlock label="Total Visits" value={scheduledCount + completedCount} icon={MapPin} iconColor="text-cult-silver" />
        <StatBlock label="Deliveries" value={deliveryCount} icon={Truck} iconColor="text-cult-warning" />
      </div>

      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-cult-charcoal flex items-center justify-between">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1.5 text-cult-silver hover:text-cult-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-cult-white">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            onClick={() => navigateMonth(1)}
            className="p-1.5 text-cult-silver hover:text-cult-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-7">
          {DAY_NAMES.map((name) => (
            <div key={name} className="px-2 py-2 text-center text-xs font-medium text-cult-silver uppercase tracking-wider border-b border-cult-charcoal">
              {name}
            </div>
          ))}

          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="min-h-[100px] border-b border-r border-cult-charcoal/30 bg-cult-dark-gray/20" />;
            }

            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayVisits = visitsByDate[dateKey] || [];
            const dayOrders = showDeliveries ? (ordersByDate[dateKey] || []) : [];
            const isToday = dateKey === today;
            const isDragOver = dateKey === dragOverDate;

            return (
              <div
                key={dateKey}
                className={`min-h-[100px] border-b border-r border-cult-charcoal/30 p-1.5 cursor-pointer transition-colors flex flex-col
                  ${isToday ? 'bg-cult-dark-gray/60' : 'hover:bg-cult-dark-gray/30'}
                  ${isDragOver ? 'bg-cult-info/10 ring-1 ring-cult-info/30' : ''}
                `}
                onClick={() => handleDayClick(day)}
                onDragOver={(e) => { e.preventDefault(); setDragOverDate(dateKey); }}
                onDragLeave={() => setDragOverDate(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop(dateKey); }}
              >
                <div className={`text-xs font-medium mb-1 ${isToday ? 'text-cult-info' : 'text-cult-light-gray'}`}>
                  {isToday && <span className="inline-block w-5 h-5 leading-5 text-center bg-cult-info text-cult-black rounded-full text-xs font-bold">{day}</span>}
                  {!isToday && day}
                </div>
                <div className="space-y-0.5 flex-1">
                  {dayVisits.slice(0, 3).map((visit) => {
                    const colors = visitTypeColors[visit.visit_type];
                    return (
                      <div
                        key={visit.id}
                        draggable
                        onDragStart={(e) => { e.stopPropagation(); setDraggedVisit(visit); }}
                        onDragEnd={() => { setDraggedVisit(null); setDragOverDate(null); }}
                        className={`flex items-center gap-1 px-1 py-0.5 rounded text-xs truncate cursor-grab active:cursor-grabbing ${colors.bg} ${colors.text} ${visit.status === 'completed' ? 'opacity-50 line-through' : ''}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                        <span className="truncate">{visit.customer_name}</span>
                      </div>
                    );
                  })}
                  {dayVisits.length > 3 && (
                    <div className="text-xs text-cult-silver text-center">+{dayVisits.length - 3} more</div>
                  )}
                </div>
                {dayOrders.length > 0 && (
                  <div className="mt-auto pt-1">
                    <div className="flex items-center gap-1 px-1 py-0.5 rounded bg-cult-dark-gray/50 border border-cult-charcoal/40">
                      <Truck className="w-2.5 h-2.5 text-cult-warning/80 flex-shrink-0" />
                      <span className="text-xs text-cult-lighter-gray font-medium">{dayOrders.length}</span>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ml-auto ${getDeliveryStatusDot(dayOrders)}`} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-cult-silver flex-wrap">
        {Object.entries(visitTypeColors).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
            <span>{visitTypeLabels[type as VisitType]}</span>
          </div>
        ))}
        {showDeliveries && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-cult-charcoal">
            <Truck className="w-3 h-3 text-cult-warning/70" />
            <span>Deliveries</span>
          </div>
        )}
      </div>

      {showDayModal && selectedDate && (
        <DayDetailModal
          date={selectedDate}
          visits={selectedDayVisits}
          orders={showDeliveries ? selectedDayOrders : []}
          onClose={() => setShowDayModal(false)}
          onComplete={(visit) => { setCompletingVisit(visit); }}
          onCancel={async (visitId) => { await actions.cancel(visitId); setShowDayModal(false); }}
          onSelectOrder={onSelectOrder}
        />
      )}

      {completingVisit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-cult-white mb-2">Complete Visit</h3>
            <p className="text-sm text-cult-light-gray mb-4">{completingVisit.customer_name}</p>
            <textarea
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              placeholder="Outcome notes (optional)"
              rows={4}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-sm text-cult-white placeholder-cult-silver focus:outline-none focus:border-cult-lighter-gray resize-none"
            />
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleCompleteVisit}
                className="px-4 py-2 text-sm font-medium text-cult-black bg-cult-white rounded hover:bg-cult-off-white transition-colors"
              >
                Complete
              </button>
              <button
                onClick={() => { setCompletingVisit(null); setOutcomeNotes(''); }}
                className="px-4 py-2 text-sm text-cult-silver hover:text-cult-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <VisitScheduleModal
          onClose={() => setShowScheduleModal(false)}
          onCreated={() => { setShowScheduleModal(false); reload(); }}
        />
      )}
      </div>

      {/* Cadence Side Panel */}
      {showCadencePanel && (
        <div className="w-80 shrink-0 bg-cult-dark-gray border border-cult-medium-gray rounded-xl p-4 h-fit max-h-[calc(100vh-8rem)] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-cult-white flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-cult-info" />
              Visit Cadence
            </h3>
            <button
              onClick={loadCadence}
              className="p-1 text-cult-silver hover:text-cult-white transition-colors"
              title="Refresh cadence data"
            >
              <RefreshCw className={`w-4 h-4 ${cadenceLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            <div className="bg-cult-danger/10 border border-cult-danger/20 rounded-lg px-3 py-2">
              <div className="text-cult-danger text-lg font-bold">{cadenceStats.overdue}</div>
              <div className="text-cult-danger/70 text-xs">Overdue</div>
            </div>
            <div className="bg-cult-warning/10 border border-cult-warning/20 rounded-lg px-3 py-2">
              <div className="text-cult-warning text-lg font-bold">{cadenceStats.dueSoon}</div>
              <div className="text-cult-warning/70 text-xs">Due Soon</div>
            </div>
            <div className="bg-cult-warning/10 border border-cult-warning/20 rounded-lg px-3 py-2">
              <div className="text-cult-warning text-lg font-bold">{cadenceStats.neverVisited}</div>
              <div className="text-cult-warning/70 text-xs">Never Visited</div>
            </div>
            <div className="bg-cult-success/10 border border-cult-success/20 rounded-lg px-3 py-2">
              <div className="text-cult-success text-lg font-bold">{cadenceStats.onTrack}</div>
              <div className="text-cult-success/70 text-xs">On Track</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            {cadenceLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : cadenceAccounts.length === 0 ? (
              <p className="text-cult-silver text-sm text-center py-4">No accounts found</p>
            ) : (
              cadenceAccounts.map(account => {
                const config = COMPLIANCE_CONFIG[account.compliance_status] || COMPLIANCE_CONFIG.on_track;
                return (
                  <button
                    key={account.customer_id}
                    onClick={() => navigate(`/crm-accounts-hub/account/${account.customer_id}`)}
                    className="w-full text-left p-2.5 rounded-lg bg-cult-charcoal/50 hover:bg-cult-charcoal border border-transparent hover:border-cult-medium-gray transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-cult-white truncate pr-2">
                        {account.customer_name}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-cult-silver opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${config.bg} ${config.color} border ${config.border}`}>
                        {config.label}
                      </span>
                      {account.days_until_due !== null && account.days_until_due !== undefined && (
                        <span className="text-xs text-cult-silver">
                          {account.days_until_due <= 0
                            ? `${Math.abs(account.days_until_due)}d overdue`
                            : `${account.days_until_due}d until due`}
                        </span>
                      )}
                    </div>
                    {account.account_tier && (
                      <div className="text-xs text-cult-silver/70 mt-1 capitalize">
                        {account.account_tier.replace('_', ' ')} \u00B7 {account.city || 'N/A'}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DayDetailModal({
  date,
  visits,
  orders,
  onClose,
  onComplete,
  onCancel,
  onSelectOrder,
}: {
  date: string;
  visits: VisitSchedule[];
  orders: CRMCalendarOrder[];
  onClose: () => void;
  onComplete: (visit: VisitSchedule) => void;
  onCancel: (visitId: string) => void;
  onSelectOrder?: (orderId: string) => void;
}) {
  const dateObj = new Date(date + 'T12:00:00');
  const formatted = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg w-full max-w-lg mx-4">
        <div className="px-5 py-4 border-b border-cult-charcoal flex items-center justify-between">
          <h3 className="text-lg font-semibold text-cult-white">{formatted}</h3>
          <button onClick={onClose} className="text-cult-silver hover:text-cult-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          <div className="divide-y divide-cult-charcoal/50">
            {visits.length === 0 && orders.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-cult-light-gray">
                No visits or deliveries scheduled for this day.
              </div>
            )}
            {visits.map((visit) => {
              const colors = visitTypeColors[visit.visit_type];
              return (
                <div key={visit.id} className="px-5 py-3 flex items-start gap-3">
                  <div className={`p-1.5 rounded flex-shrink-0 mt-0.5 ${colors.bg}`}>
                    <MapPin className={`w-3.5 h-3.5 ${colors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-cult-white">{visit.customer_name}</span>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${colors.bg} ${colors.text}`}>
                        {visitTypeLabels[visit.visit_type]}
                      </span>
                      {visit.status === 'completed' && (
                        <span className="px-1.5 py-0.5 text-xs rounded bg-cult-success/15 text-cult-success">Done</span>
                      )}
                    </div>
                    {visit.visit_time_window && (
                      <p className="text-xs text-cult-light-gray mt-0.5">{visit.visit_time_window}</p>
                    )}
                    {visit.location_notes && (
                      <p className="text-xs text-cult-silver mt-0.5">{visit.location_notes}</p>
                    )}
                    {visit.outcome_notes && (
                      <p className="text-xs text-cult-success/80 mt-1 italic">{visit.outcome_notes}</p>
                    )}
                  </div>
                  {visit.status === 'scheduled' && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => onComplete(visit)}
                        className="p-1.5 text-cult-medium-gray hover:text-cult-success transition-colors"
                        title="Complete"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onCancel(visit.id)}
                        className="p-1.5 text-cult-medium-gray hover:text-cult-danger transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {orders.length > 0 && (
            <div className="border-t border-cult-charcoal">
              <div className="px-5 py-3 flex items-center gap-2 bg-cult-dark-gray/30">
                <Truck className="w-4 h-4 text-cult-warning" />
                <span className="text-xs font-semibold text-cult-white uppercase tracking-wider">Scheduled Deliveries</span>
                <span className="text-xs text-cult-light-gray bg-cult-dark-gray px-2 py-0.5 rounded-full ml-auto">{orders.length}</span>
              </div>
              <div className="divide-y divide-cult-charcoal/30">
                {orders.map((order) => {
                  const statusStyle = getOrderStatusStyle(order.status);
                  return (
                    <div key={order.id} className="px-5 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-mono font-medium text-cult-white">{order.order_number}</span>
                          <span className={`px-1.5 py-0.5 text-xs font-semibold uppercase rounded ${statusStyle.bg} ${statusStyle.text}`}>
                            {statusStyle.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-cult-light-gray truncate">{order.customer_name}</span>
                          <span className="text-cult-medium-gray">&middot;</span>
                          <span className="text-xs font-semibold text-cult-white">{formatCurrency(order.total_amount)}</span>
                          <span className="text-cult-medium-gray">&middot;</span>
                          <span className="text-xs text-cult-lighter-gray">{order.item_count} items</span>
                        </div>
                      </div>
                      {onSelectOrder && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectOrder(order.id); }}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-cult-light-gray hover:text-cult-white bg-cult-dark-gray border border-cult-medium-gray rounded hover:bg-cult-charcoal transition-colors flex-shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="uppercase tracking-wider">View</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
