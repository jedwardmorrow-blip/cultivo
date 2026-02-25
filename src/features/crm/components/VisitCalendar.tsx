import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  CalendarDays,
  RefreshCw,
  Plus,
  CheckCircle2,
  X,
} from 'lucide-react';
import { LoadingSpinner } from '@/shared/components';
import { useVisitCalendar } from '../hooks';
import type { VisitSchedule, VisitType } from '../types';
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

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function VisitCalendar() {
  const {
    visitsByDate,
    year,
    month,
    loading,
    scheduledCount,
    completedCount,
    navigateMonth,
    reload,
    actions,
  } = useVisitCalendar();

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayVisits, setSelectedDayVisits] = useState<VisitSchedule[]>([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [completingVisit, setCompletingVisit] = useState<VisitSchedule | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [draggedVisit, setDraggedVisit] = useState<VisitSchedule | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

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
    setSelectedDate(dateKey);
    setSelectedDayVisits(visits);
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
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">Visit Calendar</h1>
          <p className="text-cult-light-gray mt-1">Schedule and track account visits</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-cult-black bg-cult-white rounded-lg hover:bg-cult-off-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Schedule Visit
          </button>
          <button
            onClick={reload}
            className="p-2 text-cult-silver hover:text-cult-white bg-cult-dark-gray border border-cult-medium-gray rounded-lg hover:bg-cult-charcoal transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatBlock label="Scheduled" value={scheduledCount} icon={CalendarDays} iconColor="text-sky-400" />
        <StatBlock label="Completed" value={completedCount} icon={CheckCircle2} iconColor="text-emerald-400" />
        <StatBlock label="Total" value={scheduledCount + completedCount} icon={MapPin} iconColor="text-cult-silver" />
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

        <div className="grid grid-cols-7">
          {DAY_NAMES.map((name) => (
            <div key={name} className="px-2 py-2 text-center text-[10px] font-medium text-cult-silver uppercase tracking-wider border-b border-cult-charcoal">
              {name}
            </div>
          ))}

          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="min-h-[90px] border-b border-r border-cult-charcoal/30 bg-cult-dark-gray/20" />;
            }

            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayVisits = visitsByDate[dateKey] || [];
            const isToday = dateKey === today;
            const isDragOver = dateKey === dragOverDate;

            return (
              <div
                key={dateKey}
                className={`min-h-[90px] border-b border-r border-cult-charcoal/30 p-1.5 cursor-pointer transition-colors
                  ${isToday ? 'bg-cult-dark-gray/60' : 'hover:bg-cult-dark-gray/30'}
                  ${isDragOver ? 'bg-sky-500/10 ring-1 ring-sky-500/30' : ''}
                `}
                onClick={() => handleDayClick(day)}
                onDragOver={(e) => { e.preventDefault(); setDragOverDate(dateKey); }}
                onDragLeave={() => setDragOverDate(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop(dateKey); }}
              >
                <div className={`text-xs font-medium mb-1 ${isToday ? 'text-sky-400' : 'text-cult-light-gray'}`}>
                  {isToday && <span className="inline-block w-5 h-5 leading-5 text-center bg-sky-500 text-cult-black rounded-full text-[10px] font-bold">{day}</span>}
                  {!isToday && day}
                </div>
                <div className="space-y-0.5">
                  {dayVisits.slice(0, 3).map((visit) => {
                    const colors = visitTypeColors[visit.visit_type];
                    return (
                      <div
                        key={visit.id}
                        draggable
                        onDragStart={(e) => { e.stopPropagation(); setDraggedVisit(visit); }}
                        onDragEnd={() => { setDraggedVisit(null); setDragOverDate(null); }}
                        className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate cursor-grab active:cursor-grabbing ${colors.bg} ${colors.text} ${visit.status === 'completed' ? 'opacity-50 line-through' : ''}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                        <span className="truncate">{visit.customer_name}</span>
                      </div>
                    );
                  })}
                  {dayVisits.length > 3 && (
                    <div className="text-[9px] text-cult-silver text-center">+{dayVisits.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-cult-silver">
        {Object.entries(visitTypeColors).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
            <span>{visitTypeLabels[type as VisitType]}</span>
          </div>
        ))}
      </div>

      {showDayModal && selectedDate && (
        <DayDetailModal
          date={selectedDate}
          visits={selectedDayVisits}
          onClose={() => setShowDayModal(false)}
          onComplete={(visit) => { setCompletingVisit(visit); }}
          onCancel={async (visitId) => { await actions.cancel(visitId); setShowDayModal(false); }}
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
  );
}

function StatBlock({ label, value, icon: Icon, iconColor }: { label: string; value: number; icon: typeof MapPin; iconColor: string }) {
  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-cult-dark-gray ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-cult-silver">{label}</p>
        <p className="text-xl font-bold text-cult-white">{value}</p>
      </div>
    </div>
  );
}

function DayDetailModal({
  date,
  visits,
  onClose,
  onComplete,
  onCancel,
}: {
  date: string;
  visits: VisitSchedule[];
  onClose: () => void;
  onComplete: (visit: VisitSchedule) => void;
  onCancel: (visitId: string) => void;
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
        <div className="divide-y divide-cult-charcoal/50 max-h-[60vh] overflow-y-auto">
          {visits.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-cult-light-gray">
              No visits scheduled for this day.
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
                    <span className={`px-1.5 py-0.5 text-[10px] rounded ${colors.bg} ${colors.text}`}>
                      {visitTypeLabels[visit.visit_type]}
                    </span>
                    {visit.status === 'completed' && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/15 text-emerald-400">Done</span>
                    )}
                  </div>
                  {visit.visit_time_window && (
                    <p className="text-xs text-cult-light-gray mt-0.5">{visit.visit_time_window}</p>
                  )}
                  {visit.location_notes && (
                    <p className="text-xs text-cult-silver mt-0.5">{visit.location_notes}</p>
                  )}
                  {visit.outcome_notes && (
                    <p className="text-xs text-emerald-400/80 mt-1 italic">{visit.outcome_notes}</p>
                  )}
                </div>
                {visit.status === 'scheduled' && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onComplete(visit)}
                      className="p-1.5 text-cult-medium-gray hover:text-emerald-400 transition-colors"
                      title="Complete"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onCancel(visit.id)}
                      className="p-1.5 text-cult-medium-gray hover:text-red-400 transition-colors"
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
      </div>
    </div>
  );
}
