import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
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
  cultivator: 'bg-green-950 text-green-400 border border-green-800',
  operations: 'bg-sky-950 text-sky-400 border border-sky-800',
};

export function WorkerCheckIn({ staff, rooms, attendance, date, onUpsertAttendance }: WorkerCheckInProps) {
  const [collapsed, setCollapsed] = useState(false);
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
                        {s.role}
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
        </div>
      )}
    </div>
  );
}
