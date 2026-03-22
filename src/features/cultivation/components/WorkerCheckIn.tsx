import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Users, MapPin } from 'lucide-react';
import type { DailyAttendance, UpsertAttendanceInput } from '../types';

export interface StaffMember {
  id: string;
  first_name: string;
  role: string;
  hourly_rate: number;
}

interface RoomOption {
  id: string;
  room_code: string;
}

interface WorkerCheckInProps {
  staff: StaffMember[];
  rooms: RoomOption[];
  attendance: DailyAttendance[];
  date: string;
  onUpsertAttendance: (input: UpsertAttendanceInput) => Promise<void>;
}

const ROLE_STYLES: Record<string, string> = {
  manager: 'bg-amber-950 text-amber-400 border border-amber-800',
  cultivation_manager: 'bg-amber-950 text-amber-400 border border-amber-800',
  cultivation_lead: 'bg-amber-950 text-amber-400 border border-amber-800',
  cultivator: 'bg-green-950 text-green-400 border border-green-800',
  operations: 'bg-sky-950 text-sky-400 border border-sky-800',
  operations_manager: 'bg-sky-950 text-sky-400 border border-sky-800',
};

export function WorkerCheckIn({ staff, rooms, attendance, date, onUpsertAttendance }: WorkerCheckInProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, DailyAttendance>();
    for (const a of attendance) map.set(a.staff_id, a);
    return map;
  }, [attendance]);

  function getRecord(staffId: string) {
    return attendanceMap.get(staffId);
  }

  const summary = useMemo(() => {
    let present = 0;
    let totalHours = 0;
    let totalCost = 0;
    for (const s of staff) {
      const rec = getRecord(s.id);
      const isPresent = rec?.is_present ?? false;
      if (isPresent) {
        present++;
        const hours = rec?.hours_worked ?? 8;
        totalHours += hours;
        totalCost += hours * s.hourly_rate;
      }
    }
    return { present, totalHours, totalCost };
  }, [staff, attendanceMap]);

  async function togglePresent(staffId: string) {
    const rec = getRecord(staffId);
    setSaving(staffId);
    try {
      await onUpsertAttendance({
        staff_id: staffId,
        attendance_date: date,
        is_present: !(rec?.is_present ?? false),
        hours_worked: rec?.hours_worked ?? 8,
        room_assignments: rec?.room_assignments ?? [],
      });
    } finally {
      setSaving(null);
    }
  }

  async function updateHours(staffId: string, hours: number) {
    const rec = getRecord(staffId);
    setSaving(staffId);
    try {
      await onUpsertAttendance({
        staff_id: staffId,
        attendance_date: date,
        is_present: rec?.is_present ?? true,
        hours_worked: hours,
        room_assignments: rec?.room_assignments ?? [],
      });
    } finally {
      setSaving(null);
    }
  }

  async function toggleRoom(staffId: string, roomId: string) {
    const rec = getRecord(staffId);
    const current = rec?.room_assignments ?? [];
    const next = current.includes(roomId)
      ? current.filter((r) => r !== roomId)
      : [...current, roomId];
    setSaving(staffId);
    try {
      await onUpsertAttendance({
        staff_id: staffId,
        attendance_date: date,
        is_present: rec?.is_present ?? true,
        hours_worked: rec?.hours_worked ?? 8,
        room_assignments: next,
      });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="bg-cult-near-black border border-cult-dark-gray">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-cult-charcoal/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight className="w-4 h-4 text-cult-medium-gray" /> : <ChevronDown className="w-4 h-4 text-cult-medium-gray" />}
          <Users className="w-4 h-4 text-cult-light-gray" />
          <span className="text-xs text-cult-light-gray uppercase tracking-wider font-semibold">Staff Check-In</span>
        </div>
        <span className="text-xs text-cult-light-gray">
          {summary.present} of {staff.length} present
          <span className="text-cult-medium-gray mx-1">&middot;</span>
          {summary.totalHours} hrs
          <span className="text-cult-medium-gray mx-1">&middot;</span>
          Est. ${summary.totalCost.toLocaleString()}
        </span>
      </button>

      {!collapsed && (
        <div className="border-t border-cult-dark-gray">
          <div className="divide-y divide-cult-dark-gray/50">
            {staff.map((s) => {
              const rec = getRecord(s.id);
              const isPresent = rec?.is_present ?? false;
              const hours = rec?.hours_worked ?? 8;
              const assignedRooms = rec?.room_assignments ?? [];
              const isSaving = saving === s.id;

              return (
                <div key={s.id} className={`px-4 py-3 flex flex-col gap-2 ${isSaving ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-cult-charcoal flex items-center justify-center text-xs font-bold text-cult-white flex-shrink-0">
                        {s.first_name.charAt(0)}
                      </span>
                      <span className="text-sm text-cult-white font-medium truncate">{s.first_name}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-sm ${ROLE_STYLES[s.role] ?? 'bg-cult-charcoal text-cult-light-gray'}`}>
                        {s.role.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={24}
                          step={0.5}
                          value={hours}
                          onChange={(e) => updateHours(s.id, parseFloat(e.target.value) || 0)}
                          disabled={isSaving}
                          className="w-14 bg-cult-charcoal border border-cult-medium-gray text-cult-white text-xs text-center py-1 rounded-sm focus:outline-none focus:border-cult-accent"
                        />
                        <span className="text-[10px] text-cult-medium-gray">hrs</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => togglePresent(s.id)}
                        disabled={isSaving}
                        className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors ${
                          isPresent
                            ? 'bg-green-950 text-green-400 border border-green-800 hover:bg-green-900'
                            : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700'
                        }`}
                      >
                        {isPresent ? 'Present' : 'Absent'}
                      </button>
                    </div>
                  </div>

                  {isPresent && (
                    <div className="flex flex-wrap gap-1 pl-9">
                      {rooms.map((r) => {
                        const assigned = assignedRooms.includes(r.id);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => toggleRoom(s.id, r.id)}
                            disabled={isSaving}
                            className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded-sm transition-colors ${
                              assigned
                                ? 'bg-cult-charcoal text-cult-white border border-cult-medium-gray'
                                : 'bg-transparent text-cult-medium-gray border border-cult-dark-gray hover:border-cult-medium-gray'
                            }`}
                          >
                            {r.room_code}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Per-room allocation breakdown */}
          <RoomAllocationBreakdown staff={staff} rooms={rooms} attendance={attendance} />
        </div>
      )}
    </div>
  );
}

/* ── Per-Room Allocation Breakdown ───────────────────────── */

interface RoomAllocation {
  room_code: string;
  workers: { name: string; hours: number; cost: number }[];
  totalHours: number;
  totalCost: number;
}

function RoomAllocationBreakdown({
  staff,
  rooms,
  attendance,
}: {
  staff: StaffMember[];
  rooms: RoomOption[];
  attendance: DailyAttendance[];
}) {
  const [expanded, setExpanded] = useState(false);

  const allocations = useMemo(() => {
    const attendMap = new Map<string, DailyAttendance>();
    for (const a of attendance) attendMap.set(a.staff_id, a);

    const roomMap = new Map<string, RoomAllocation>();

    for (const s of staff) {
      const rec = attendMap.get(s.id);
      if (!rec?.is_present) continue;

      const assignedRoomIds = rec.room_assignments ?? [];
      if (assignedRoomIds.length === 0) continue;

      const hours = rec.hours_worked ?? 8;
      // Split hours evenly across assigned rooms
      const hoursPerRoom = hours / assignedRoomIds.length;
      const costPerRoom = hoursPerRoom * s.hourly_rate;

      for (const roomId of assignedRoomIds) {
        const room = rooms.find((r) => r.id === roomId);
        if (!room) continue;

        const existing = roomMap.get(roomId) ?? {
          room_code: room.room_code,
          workers: [],
          totalHours: 0,
          totalCost: 0,
        };
        existing.workers.push({ name: s.first_name, hours: hoursPerRoom, cost: costPerRoom });
        existing.totalHours += hoursPerRoom;
        existing.totalCost += costPerRoom;
        roomMap.set(roomId, existing);
      }
    }

    return Array.from(roomMap.values()).sort((a, b) => b.totalCost - a.totalCost);
  }, [staff, rooms, attendance]);

  if (allocations.length === 0) return null;

  return (
    <div className="border-t border-cult-dark-gray">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-cult-charcoal/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-cult-medium-gray" />
          <span className="text-[10px] text-cult-medium-gray uppercase tracking-wider font-semibold">
            Room Allocation Breakdown
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-cult-medium-gray transition-transform ${expanded ? '' : '-rotate-90'}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {allocations.map((alloc) => (
            <div key={alloc.room_code} className="bg-cult-charcoal/30 border border-cult-dark-gray p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-xs font-bold text-cult-white">{alloc.room_code}</span>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-cult-light-gray">{alloc.totalHours.toFixed(1)} hrs</span>
                  <span className="text-cult-white font-semibold">${alloc.totalCost.toFixed(0)}</span>
                </div>
              </div>
              <div className="space-y-0.5">
                {alloc.workers.map((w) => (
                  <div key={w.name} className="flex items-center justify-between text-[10px]">
                    <span className="text-cult-light-gray">{w.name}</span>
                    <span className="text-cult-medium-gray font-mono">{w.hours.toFixed(1)}h · ${w.cost.toFixed(0)}</span>
                  </div>
                ))}
              </div>
              {/* Cost bar proportional to max room */}
              <div className="mt-1.5 w-full h-1 bg-cult-dark-gray rounded-full overflow-hidden">
                <div
                  className="h-full bg-cult-green rounded-full"
                  style={{ width: `${Math.min(100, (alloc.totalCost / Math.max(...allocations.map((a) => a.totalCost))) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
