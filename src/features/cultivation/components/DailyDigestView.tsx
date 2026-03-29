import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  CheckCircle, AlertTriangle, Clock, Users, ChevronLeft, ChevronRight,
  FileText, MessageSquare, BarChart3, Building2,
} from 'lucide-react';
import { useDailyTasks, useDailyDigest, useAnnotations, useGrowRooms } from '../hooks';
import { supabase } from '@/lib/supabase';
import { AnnotationInput } from './AnnotationInput';
import { DigestSlackPreview } from './DigestSlackPreview';
import { todayIso } from '../utils/dateUtils';
import { ROOM_TYPE_LEFT_BORDER } from '../constants/stageColors';
import type { DailyTaskInstance, DailyLogAnnotation, CreateAnnotationInput } from '../types';

type DigestTab = 'overview' | 'by-room' | 'labor' | 'slack';

const TABS: { key: DigestTab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
  { key: 'by-room', label: 'By Room', icon: <Building2 className="w-4 h-4" /> },
  { key: 'labor', label: 'Labor', icon: <Users className="w-4 h-4" /> },
  { key: 'slack', label: 'Slack Preview', icon: <MessageSquare className="w-4 h-4" /> },
];

const TASK_TYPE_LABELS: Record<string, string> = {
  ipm_spray: 'IPM Spray',
  defoliation: 'Defoliation',
  transplant: 'Transplant',
  cleaning: 'Cleaning',
  harvest: 'Harvest',
  feeding: 'Feeding',
  scouting: 'Scouting',
  training: 'Training',
  clone_cutting: 'Clone Cutting',
  custom: 'Custom',
};

interface StaffRecord {
  id: string;
  first_name: string;
  role: string | null;
  hourly_rate: number | null;
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function ProgressRing({ completed, total, size = 56 }: { completed: number; total: number; size?: number }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? completed / total : 0;
  const offset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-cult-border"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={pct >= 1 ? 'text-cult-success' : pct >= 0.5 ? 'text-amber-400' : 'text-red-400'}
      />
    </svg>
  );
}

function ScoreCard({ label, value, subtitle, ring, variant }: {
  label: string;
  value: string;
  subtitle?: string;
  ring?: { completed: number; total: number };
  variant?: 'default' | 'amber' | 'success' | 'danger';
}) {
  const borderCls = variant === 'amber' ? 'border-amber-500/40'
    : variant === 'success' ? 'border-cult-success/40'
    : variant === 'danger' ? 'border-red-500/40'
    : 'border-cult-border';

  return (
    <div className={`bg-cult-surface-raised border ${borderCls} rounded-cult p-4 flex items-center gap-4`}>
      {ring && (
        <div className="relative flex-shrink-0">
          <ProgressRing completed={ring.completed} total={ring.total} />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-cult-text-primary">
            {ring.total > 0 ? `${Math.round((ring.completed / ring.total) * 100)}%` : '--'}
          </span>
        </div>
      )}
      <div className="min-w-0">
        <p className="text-caption uppercase tracking-wider text-cult-text-muted">{label}</p>
        <p className="text-h3 text-cult-text-primary font-semibold mt-0.5">{value}</p>
        {subtitle && <p className="text-caption text-cult-text-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function AlertCard({ type, room, message }: { type: 'missed' | 'concern' | 'carry'; room: string; message: string }) {
  const config = type === 'missed'
    ? { bg: 'bg-red-950/40', border: 'border-red-800/40', icon: <AlertTriangle className="w-4 h-4 text-red-400" />, tag: 'Missed', tagCls: 'bg-red-900 text-red-300' }
    : type === 'concern'
    ? { bg: 'bg-amber-950/30', border: 'border-amber-800/40', icon: <AlertTriangle className="w-4 h-4 text-amber-400" />, tag: 'Concern', tagCls: 'bg-amber-900 text-amber-300' }
    : { bg: 'bg-sky-950/30', border: 'border-sky-800/40', icon: <Clock className="w-4 h-4 text-sky-400" />, tag: 'Carry Forward', tagCls: 'bg-sky-900 text-sky-300' };

  return (
    <div className={`${config.bg} border ${config.border} rounded-cult px-4 py-3 flex items-start gap-3`}>
      <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.tagCls}`}>{config.tag}</span>
          {room && <span className="text-xs text-cult-text-muted">{room}</span>}
        </div>
        <p className="text-sm text-cult-text-secondary">{message}</p>
      </div>
    </div>
  );
}

function AnnotationCard({ annotation, roomName }: { annotation: DailyLogAnnotation; roomName: string }) {
  const catBadge = annotation.category === 'concern'
    ? 'bg-amber-900 text-amber-300'
    : annotation.category === 'decision'
    ? 'bg-sky-900 text-sky-300'
    : annotation.category === 'action_taken'
    ? 'bg-green-900 text-green-300'
    : 'bg-cult-border text-cult-text-secondary';

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-cult-border last:border-b-0">
      <FileText className="w-4 h-4 text-cult-text-muted flex-shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catBadge}`}>
            {annotation.category.replace('_', ' ')}
          </span>
          {roomName && <span className="text-xs text-cult-text-muted">{roomName}</span>}
          {annotation.severity === 'critical' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-300 font-medium">critical</span>
          )}
          {annotation.severity === 'warning' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900 text-amber-300 font-medium">warning</span>
          )}
        </div>
        <p className="text-sm text-cult-text-primary mt-1">{annotation.title}</p>
        {annotation.body && <p className="text-xs text-cult-text-muted mt-0.5">{annotation.body}</p>}
      </div>
    </div>
  );
}

interface RoomDigest {
  roomId: string;
  roomName: string;
  roomType: string;
  tasks: DailyTaskInstance[];
  tasksDone: number;
  tasksTotal: number;
  taskTypes: string[];
  laborHours: number;
  laborCost: number;
}

function useStaff() {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('staff')
        .select('id, first_name, role, hourly_rate')
        .eq('is_active', true)
        .order('first_name');
      setStaff((data ?? []) as StaffRecord[]);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { staff, loading };
}

export function DailyDigestView() {
  const [date, setDate] = useState(todayIso);
  const [activeTab, setActiveTab] = useState<DigestTab>('overview');
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);

  const { tasks, loading: tasksLoading } = useDailyTasks(date);
  const { digest, loading: digestLoading } = useDailyDigest(date);
  const { annotations, createAnnotation } = useAnnotations(date);
  const { rooms } = useGrowRooms();
  const { staff } = useStaff();

  const loading = tasksLoading || digestLoading;

  const roomLookup = useMemo(() => {
    const map: Record<string, string> = {};
    rooms.forEach((r) => { map[r.id] = r.room_code || r.name; });
    return map;
  }, [rooms]);

  const roomTypeLookup = useMemo(() => {
    const map: Record<string, string> = {};
    rooms.forEach((r) => { map[r.id] = r.room_type; });
    return map;
  }, [rooms]);

  const staffLookup = useMemo(() => {
    const map: Record<string, StaffRecord> = {};
    staff.forEach((s) => { map[s.id] = s; });
    return map;
  }, [staff]);

  const completed = tasks.filter((t) => t.status === 'completed').length;
  const total = tasks.length;
  const carryForwardTasks = tasks.filter((t) => t.status === 'carry_forward');
  const skippedTasks = tasks.filter((t) => t.status === 'skipped');

  const attendance = digest?.attendance ?? [];
  const sprayLogs = digest?.sprayLogs ?? [];
  const mortalityLogs = digest?.mortalityLogs ?? [];
  const scoutingConcerns = useMemo(() =>
    annotations.filter((a) => a.category === 'concern' && (a.severity === 'warning' || a.severity === 'critical')),
    [annotations]
  );

  const totalLaborHours = attendance.reduce((sum, a) => sum + (a.hours_worked ?? 0), 0);

  const laborCostByWorker = useMemo(() => {
    return attendance.map((a) => {
      const s = staffLookup[a.staff_id];
      const hours = a.hours_worked ?? 0;
      const rate = s?.hourly_rate ?? 0;
      return { staffId: a.staff_id, name: s?.first_name ?? 'Unknown', role: s?.role ?? '', hours, rate, cost: hours * rate, roomAssignments: a.room_assignments ?? [] };
    });
  }, [attendance, staffLookup]);

  const totalLaborCost = laborCostByWorker.reduce((sum, w) => sum + w.cost, 0);

  const roomDigests = useMemo(() => {
    const byRoom = new Map<string, RoomDigest>();

    tasks.forEach((t) => {
      if (!byRoom.has(t.room_id)) {
        byRoom.set(t.room_id, {
          roomId: t.room_id,
          roomName: roomLookup[t.room_id] ?? t.room_id,
          roomType: roomTypeLookup[t.room_id] ?? 'mixed',
          tasks: [],
          tasksDone: 0,
          tasksTotal: 0,
          taskTypes: [],
          laborHours: 0,
          laborCost: 0,
        });
      }
      const rd = byRoom.get(t.room_id)!;
      rd.tasks.push(t);
      rd.tasksTotal++;
      if (t.status === 'completed') rd.tasksDone++;
      if (!rd.taskTypes.includes(t.task_type)) rd.taskTypes.push(t.task_type);
    });

    laborCostByWorker.forEach((w) => {
      const assignedRooms = w.roomAssignments;
      const perRoomHours = assignedRooms.length > 0 ? w.hours / assignedRooms.length : 0;
      const perRoomCost = assignedRooms.length > 0 ? w.cost / assignedRooms.length : 0;

      assignedRooms.forEach((roomIdOrCode) => {
        const roomId = rooms.find((r) => r.room_code === roomIdOrCode || r.id === roomIdOrCode)?.id ?? roomIdOrCode;
        if (byRoom.has(roomId)) {
          byRoom.get(roomId)!.laborHours += perRoomHours;
          byRoom.get(roomId)!.laborCost += perRoomCost;
        }
      });
    });

    return Array.from(byRoom.values()).sort((a, b) => a.roomName.localeCompare(b.roomName));
  }, [tasks, laborCostByWorker, roomLookup, roomTypeLookup, rooms]);

  const laborByRoom = useMemo(() => {
    const map = new Map<string, { room: string; workers: string[]; hours: number; cost: number }>();

    laborCostByWorker.forEach((w) => {
      const assignedRooms = w.roomAssignments;
      const perRoomHours = assignedRooms.length > 0 ? w.hours / assignedRooms.length : 0;
      const perRoomCost = assignedRooms.length > 0 ? w.cost / assignedRooms.length : 0;

      assignedRooms.forEach((rc) => {
        const entry = map.get(rc) ?? { room: rc, workers: [], hours: 0, cost: 0 };
        entry.workers.push(w.name);
        entry.hours += perRoomHours;
        entry.cost += perRoomCost;
        map.set(rc, entry);
      });
    });

    return Array.from(map.values()).sort((a, b) => a.room.localeCompare(b.room));
  }, [laborCostByWorker]);

  const costByTaskType = useMemo(() => {
    const map = new Map<string, { type: string; tasks: number; hours: number; cost: number }>();

    tasks.filter((t) => t.status === 'completed').forEach((t) => {
      const entry = map.get(t.task_type) ?? { type: t.task_type, tasks: 0, hours: 0, cost: 0 };
      entry.tasks++;

      const dur = t.estimated_duration;
      if (dur) {
        const hMatch = dur.match(/(\d+(?:\.\d+)?)h/);
        const mMatch = dur.match(/(\d+)m/);
        entry.hours += (hMatch ? parseFloat(hMatch[1]) : 0) + (mMatch ? parseInt(mMatch[1], 10) / 60 : 0);
      }

      map.set(t.task_type, entry);
    });

    if (totalLaborHours > 0) {
      const totalEstHours = Array.from(map.values()).reduce((s, e) => s + e.hours, 0);
      if (totalEstHours > 0) {
        const ratio = totalLaborCost / totalEstHours;
        map.forEach((e) => { e.cost = e.hours * ratio; });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.tasks - a.tasks);
  }, [tasks, totalLaborHours, totalLaborCost]);

  const alertCount = scoutingConcerns.length + mortalityLogs.length + carryForwardTasks.length + skippedTasks.length;

  async function handleAddAnnotation(input: CreateAnnotationInput) {
    await createAnnotation(input);
    setShowAnnotationForm(false);
  }

  const roomOptions = rooms.map((r) => ({ id: r.id, name: r.room_code || r.name }));

  if (loading && !digest) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <div className="w-5 h-5 border-2 border-cult-text-muted border-t-cult-text-primary rounded-full animate-spin" />
        <span className="text-cult-text-muted text-sm">Loading digest...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setDate(shiftDate(date, -1))} className="p-1.5 rounded-cult hover:bg-cult-surface-overlay text-cult-text-muted hover:text-cult-text-primary transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayIso()}
            className="rounded-md bg-cult-surface border border-cult-border text-cult-text-primary text-sm px-3 py-1.5 focus:outline-none focus:border-cult-text-secondary"
          />
          <button
            onClick={() => setDate(shiftDate(date, 1))}
            disabled={date >= todayIso()}
            className="p-1.5 rounded-cult hover:bg-cult-surface-overlay text-cult-text-muted hover:text-cult-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="text-sm text-cult-text-muted ml-2">{formatDisplayDate(date)}</span>
        </div>
      </div>

      <div className="flex gap-1 border-b border-cult-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'text-cult-text-primary border-cult-accent'
                : 'text-cult-text-muted border-transparent hover:text-cult-text-secondary'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab
          completed={completed}
          total={total}
          carryForwardTasks={carryForwardTasks}
          skippedTasks={skippedTasks}
          totalLaborHours={totalLaborHours}
          totalLaborCost={totalLaborCost}
          alertCount={alertCount}
          scoutingConcerns={scoutingConcerns}
          mortalityLogs={mortalityLogs}
          annotations={annotations}
          roomLookup={roomLookup}
          showAnnotationForm={showAnnotationForm}
          onToggleForm={() => setShowAnnotationForm(!showAnnotationForm)}
          onAddAnnotation={handleAddAnnotation}
          roomOptions={roomOptions}
          date={date}
        />
      )}

      {activeTab === 'by-room' && (
        <ByRoomTab roomDigests={roomDigests} />
      )}

      {activeTab === 'labor' && (
        <LaborTab
          laborCostByWorker={laborCostByWorker}
          laborByRoom={laborByRoom}
          costByTaskType={costByTaskType}
          totalLaborHours={totalLaborHours}
          totalLaborCost={totalLaborCost}
          tasksCompleted={completed}
          tasksTotal={total}
        />
      )}

      {activeTab === 'slack' && (
        <DigestSlackPreview
          date={date}
          tasks={tasks}
          annotations={annotations}
          attendance={attendance}
          sprayLogs={sprayLogs}
          mortalityLogs={mortalityLogs}
          roomActivity={roomDigests.map((r) => ({
            roomName: r.roomName,
            tasksDone: r.tasksDone,
            tasksTotal: r.tasksTotal,
            taskTypes: r.taskTypes,
            laborHours: r.laborHours,
            laborCost: r.laborCost,
          }))}
          roomLookup={roomLookup}
          totalLaborCost={totalLaborCost}
        />
      )}
    </div>
  );
}

function OverviewTab({
  completed, total, carryForwardTasks, skippedTasks,
  totalLaborHours, totalLaborCost, alertCount, scoutingConcerns, mortalityLogs,
  annotations, roomLookup, showAnnotationForm, onToggleForm, onAddAnnotation,
  roomOptions, date,
}: {
  completed: number;
  total: number;
  carryForwardTasks: DailyTaskInstance[];
  skippedTasks: DailyTaskInstance[];
  totalLaborHours: number;
  totalLaborCost: number;
  alertCount: number;
  scoutingConcerns: DailyLogAnnotation[];
  mortalityLogs: { room_id: string; quantity: number; cause: string | null }[];
  annotations: DailyLogAnnotation[];
  roomLookup: Record<string, string>;
  showAnnotationForm: boolean;
  onToggleForm: () => void;
  onAddAnnotation: (input: CreateAnnotationInput) => Promise<void>;
  roomOptions: { id: string; name: string }[];
  date: string;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ScoreCard
          label="Tasks Done"
          value={`${completed} of ${total}`}
          ring={{ completed, total }}
          variant={total > 0 && completed === total ? 'success' : 'default'}
        />
        <ScoreCard
          label="Carry Forward"
          value={String(carryForwardTasks.length)}
          subtitle={skippedTasks.length > 0 ? `${skippedTasks.length} skipped` : undefined}
          variant={carryForwardTasks.length > 0 ? 'amber' : 'default'}
        />
        <ScoreCard
          label="Labor Hours"
          value={totalLaborHours.toFixed(1)}
          subtitle={`$${totalLaborCost.toFixed(0)} est. cost`}
          variant="success"
        />
        <ScoreCard
          label="Alerts"
          value={String(alertCount)}
          variant={alertCount > 0 ? 'danger' : 'default'}
        />
      </div>

      {(carryForwardTasks.length > 0 || skippedTasks.length > 0 || scoutingConcerns.length > 0 || mortalityLogs.length > 0) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-cult-text-primary">Alerts</h3>
          <div className="space-y-2">
            {mortalityLogs.map((m, i) => (
              <AlertCard
                key={`mort-${i}`}
                type="concern"
                room={roomLookup[m.room_id] ?? ''}
                message={`${m.quantity} plant mortality${m.cause ? ` — ${m.cause}` : ''}`}
              />
            ))}
            {scoutingConcerns.map((a) => (
              <AlertCard
                key={a.id}
                type="concern"
                room={roomLookup[a.room_id] ?? ''}
                message={a.title}
              />
            ))}
            {skippedTasks.map((t) => (
              <AlertCard
                key={t.id}
                type="missed"
                room={roomLookup[t.room_id] ?? ''}
                message={`${TASK_TYPE_LABELS[t.task_type] ?? t.task_type} not completed`}
              />
            ))}
            {carryForwardTasks.map((t) => (
              <AlertCard
                key={t.id}
                type="carry"
                room={roomLookup[t.room_id] ?? ''}
                message={`${TASK_TYPE_LABELS[t.task_type] ?? t.task_type} carried forward`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-cult-text-primary">Manager Notes</h3>
          <button
            onClick={onToggleForm}
            className="text-xs px-3 py-1.5 rounded-cult border border-cult-border text-cult-text-secondary hover:text-cult-text-primary hover:border-cult-border-strong transition-colors"
          >
            {showAnnotationForm ? 'Cancel' : '+ Add Note'}
          </button>
        </div>

        {showAnnotationForm && (
          <AnnotationInput date={date} rooms={roomOptions} onSubmit={onAddAnnotation} />
        )}

        {annotations.length > 0 ? (
          <div className="rounded-lg border border-cult-border bg-cult-surface-raised divide-y divide-cult-border">
            {annotations.map((a) => (
              <AnnotationCard key={a.id} annotation={a} roomName={roomLookup[a.room_id] ?? ''} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-cult-text-muted py-4 text-center">No annotations for this date.</p>
        )}
      </div>
    </div>
  );
}

function ByRoomTab({ roomDigests }: { roomDigests: RoomDigest[] }) {
  if (roomDigests.length === 0) {
    return <p className="text-sm text-cult-text-muted py-8 text-center">No room activity for this date.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {roomDigests.map((rd) => {
        const borderCls = ROOM_TYPE_LEFT_BORDER[rd.roomType] ?? ROOM_TYPE_LEFT_BORDER.mixed;
        return (
          <div key={rd.roomId} className={`bg-cult-surface-raised border border-cult-border border-l-4 ${borderCls} rounded-cult p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-cult-text-primary">{rd.roomName}</h4>
              <span className="text-xs text-cult-text-muted">{rd.tasksDone}/{rd.tasksTotal} tasks</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {rd.tasks.map((t) => {
                const dotCls = t.status === 'completed' ? 'bg-cult-success'
                  : t.status === 'carry_forward' ? 'bg-amber-400'
                  : t.status === 'skipped' ? 'bg-red-400'
                  : 'bg-cult-text-muted';
                return (
                  <div key={t.id} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${dotCls}`} />
                    <span className="text-xs text-cult-text-secondary">
                      {TASK_TYPE_LABELS[t.task_type] ?? t.task_type}
                    </span>
                    {t.estimated_duration && (
                      <span className="text-xs text-cult-text-faint">{t.estimated_duration}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 text-xs text-cult-text-muted pt-2 border-t border-cult-border">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {rd.laborHours.toFixed(1)}h
              </span>
              <span>${rd.laborCost.toFixed(0)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LaborTab({
  laborCostByWorker, laborByRoom, costByTaskType, totalLaborHours, totalLaborCost, tasksCompleted, tasksTotal,
}: {
  laborCostByWorker: { name: string; hours: number; rate: number; cost: number; role: string }[];
  laborByRoom: { room: string; workers: string[]; hours: number; cost: number }[];
  costByTaskType: { type: string; tasks: number; hours: number; cost: number }[];
  totalLaborHours: number;
  totalLaborCost: number;
  tasksCompleted: number;
  tasksTotal: number;
}) {
  const completionPct = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;
  const maxCost = Math.max(...costByTaskType.map((c) => c.cost), 1);

  return (
    <div className="space-y-6">
      {/* Completion + Cost summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-cult-surface-overlay rounded-lg p-3 border border-cult-border">
          <span className="text-xs text-cult-text-muted uppercase tracking-wider">Tasks Done</span>
          <div className="mt-1 text-lg font-bold text-cult-text-primary">{tasksCompleted}/{tasksTotal}</div>
          <div className="mt-1.5 w-full h-1.5 bg-cult-charcoal rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${completionPct}%` }} />
          </div>
        </div>
        <div className="bg-cult-surface-overlay rounded-lg p-3 border border-cult-border">
          <span className="text-xs text-cult-text-muted uppercase tracking-wider">Completion</span>
          <div className={`mt-1 text-lg font-bold ${completionPct >= 80 ? 'text-green-400' : completionPct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{completionPct}%</div>
        </div>
        <div className="bg-cult-surface-overlay rounded-lg p-3 border border-cult-border">
          <span className="text-xs text-cult-text-muted uppercase tracking-wider">Labor Hours</span>
          <div className="mt-1 text-lg font-bold text-cult-text-primary">{totalLaborHours.toFixed(1)}</div>
        </div>
        <div className="bg-cult-surface-overlay rounded-lg p-3 border border-cult-border">
          <span className="text-xs text-cult-text-muted uppercase tracking-wider">Labor Cost</span>
          <div className="mt-1 text-lg font-bold text-cult-text-primary">${totalLaborCost.toFixed(0)}</div>
        </div>
      </div>

      {/* Cost by task type — visual bar chart */}
      {costByTaskType.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-cult-text-primary mb-3">Cost by Task Type</h3>
          <div className="space-y-2">
            {costByTaskType.map((c) => (
              <div key={c.type} className="flex items-center gap-3">
                <span className="w-24 text-xs text-cult-text-secondary truncate">{TASK_TYPE_LABELS[c.type] ?? c.type}</span>
                <div className="flex-1 h-5 bg-cult-surface-overlay rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-green-700/60 rounded-sm transition-all flex items-center px-2"
                    style={{ width: `${Math.max(5, (c.cost / maxCost) * 100)}%` }}
                  >
                    <span className="text-[10px] text-green-200 font-semibold whitespace-nowrap">${c.cost.toFixed(0)}</span>
                  </div>
                </div>
                <span className="text-xs text-cult-text-muted w-16 text-right">{c.tasks} task{c.tasks !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-cult-text-primary mb-3">Worker Summary</h3>
        <div className="rounded-lg border border-cult-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cult-surface-overlay text-cult-text-muted text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-2.5 font-medium">Name</th>
                <th className="text-right px-4 py-2.5 font-medium">Hours</th>
                <th className="text-right px-4 py-2.5 font-medium">Rate</th>
                <th className="text-right px-4 py-2.5 font-medium">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cult-border">
              {laborCostByWorker.filter((w) => w.hours > 0).map((w) => (
                <tr key={w.name} className="text-cult-text-secondary hover:bg-cult-surface-overlay/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="text-cult-text-primary">{w.name}</span>
                    {w.role && <span className="text-xs text-cult-text-muted ml-2">{w.role}</span>}
                  </td>
                  <td className="text-right px-4 py-2.5">{w.hours.toFixed(1)}</td>
                  <td className="text-right px-4 py-2.5">${w.rate.toFixed(0)}/hr</td>
                  <td className="text-right px-4 py-2.5 font-medium text-cult-text-primary">${w.cost.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-cult-surface-overlay text-cult-text-primary font-medium">
                <td className="px-4 py-2.5">Total</td>
                <td className="text-right px-4 py-2.5">{totalLaborHours.toFixed(1)}</td>
                <td className="text-right px-4 py-2.5" />
                <td className="text-right px-4 py-2.5">${totalLaborCost.toFixed(0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-cult-text-primary mb-3">Labor by Room</h3>
        {laborByRoom.length > 0 ? (
          <div className="rounded-lg border border-cult-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cult-surface-overlay text-cult-text-muted text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 font-medium">Room</th>
                  <th className="text-left px-4 py-2.5 font-medium">Workers</th>
                  <th className="text-right px-4 py-2.5 font-medium">Hours</th>
                  <th className="text-right px-4 py-2.5 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cult-border">
                {laborByRoom.map((r) => (
                  <tr key={r.room} className="text-cult-text-secondary hover:bg-cult-surface-overlay/50 transition-colors">
                    <td className="px-4 py-2.5 text-cult-text-primary">{r.room}</td>
                    <td className="px-4 py-2.5 text-xs">{[...new Set(r.workers)].join(', ')}</td>
                    <td className="text-right px-4 py-2.5">{r.hours.toFixed(1)}</td>
                    <td className="text-right px-4 py-2.5 font-medium text-cult-text-primary">${r.cost.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-cult-text-muted text-center py-4">No room labor data for this date.</p>
        )}
      </div>

    </div>
  );
}
