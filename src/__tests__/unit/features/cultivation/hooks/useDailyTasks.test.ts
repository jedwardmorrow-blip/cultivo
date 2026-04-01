import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDailyTasks } from '@/features/cultivation/hooks/useDailyTasks';
import { supabase } from '@/lib/supabase';
import type { DailyTaskInstance } from '@/features/cultivation/types/cultivation.types';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

// Suppress realtime subscription side-effects in unit tests
vi.mock('@/shared/hooks/useTableSubscription', () => ({
  useTableSubscription: vi.fn(),
}));

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

// ── helpers ────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<DailyTaskInstance> = {}): DailyTaskInstance {
  return {
    id: 'task-001',
    schedule_id: null,
    room_id: 'room-001',
    task_date: '2026-04-01',
    task_type: 'irrigation',
    assigned_to: null,
    assigned_by: null,
    status: 'pending',
    scope: 'single_day',
    progress_data: {},
    completion_ref_table: null,
    completion_ref_id: null,
    estimated_duration: null,
    task_config: {},
    notes: null,
    completed_at: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

/** Build a mock chain for the SELECT load path:
 *  .from().select('*').eq('task_date', date).order(...) → Promise */
function makeLoadChain(tasks: DailyTaskInstance[]) {
  const order = vi.fn().mockResolvedValue({ data: tasks, error: null });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  return { select, eq, order };
}

/** Build a mock chain for the UPDATE mutation path:
 *  .from().update().eq().select().single() → Promise */
function makeUpdateChain(result: DailyTaskInstance) {
  const single = vi.fn().mockResolvedValue({ data: result, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const eq = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });
  return { update, eq, select, single };
}

/** Build a mock chain for the INSERT path:
 *  .from().insert().select().single() → Promise */
function makeInsertChain(result: DailyTaskInstance) {
  const single = vi.fn().mockResolvedValue({ data: result, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  return { insert, select, single };
}

/** Build a mock chain for the DELETE path:
 *  .from().delete().eq() → Promise */
function makeDeleteChain() {
  const eq = vi.fn().mockResolvedValue({ data: null, error: null });
  const del = vi.fn().mockReturnValue({ eq });
  return { delete: del, eq };
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('useDailyTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── load ─────────────────────────────────────────────────────────────────

  it('loads tasks for the given date on mount', async () => {
    const tasks = [makeTask()];
    const load = makeLoadChain(tasks);
    mockFrom.mockReturnValue({ select: load.select });

    const { result } = renderHook(() => useDailyTasks('2026-04-01'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFrom).toHaveBeenCalledWith('daily_task_instances');
    expect(load.eq).toHaveBeenCalledWith('task_date', '2026-04-01');
    expect(result.current.tasks).toEqual(tasks);
    expect(result.current.error).toBeNull();
  });

  it('returns empty tasks list when no tasks exist for that date', async () => {
    const load = makeLoadChain([]);
    mockFrom.mockReturnValue({ select: load.select });

    const { result } = renderHook(() => useDailyTasks('2026-04-01'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tasks).toEqual([]);
  });

  it('sets error message when load fails', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: new Error('DB down') });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    const { result } = renderHook(() => useDailyTasks('2026-04-01'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load daily tasks');
    expect(result.current.tasks).toEqual([]);
  });

  it('reloads when taskDate changes', async () => {
    const load1 = makeLoadChain([makeTask({ task_date: '2026-04-01' })]);
    const load2 = makeLoadChain([makeTask({ task_date: '2026-04-02' })]);
    mockFrom
      .mockReturnValueOnce({ select: load1.select })
      .mockReturnValueOnce({ select: load2.select });

    const { result, rerender } = renderHook(
      ({ date }: { date: string }) => useDailyTasks(date),
      { initialProps: { date: '2026-04-01' } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFrom).toHaveBeenCalledTimes(1);

    rerender({ date: '2026-04-02' });
    await waitFor(() => expect(mockFrom).toHaveBeenCalledTimes(2));
    expect(load2.eq).toHaveBeenCalledWith('task_date', '2026-04-02');
  });

  // ── updateStatus ─────────────────────────────────────────────────────────

  it('updateStatus(pending): updates status without setting completed_at', async () => {
    const task = makeTask();
    const updated = makeTask({ status: 'in_progress' });

    const initialLoad = makeLoadChain([task]);
    const mutation = makeUpdateChain(updated);
    const reload = makeLoadChain([updated]);

    mockFrom
      .mockReturnValueOnce({ select: initialLoad.select })
      .mockReturnValueOnce({ update: mutation.update })
      .mockReturnValueOnce({ select: reload.select });

    const { result } = renderHook(() => useDailyTasks('2026-04-01'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateStatus('task-001', 'in_progress');
    });

    expect(mutation.update).toHaveBeenCalledWith({ status: 'in_progress' });
    // completed_at must NOT be included for non-completed transitions
    expect(mutation.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ completed_at: expect.anything() }),
    );
  });

  it('updateStatus(completed): sets completed_at timestamp', async () => {
    const task = makeTask();
    const updated = makeTask({ status: 'completed', completed_at: '2026-04-01T10:00:00.000Z' });

    const initialLoad = makeLoadChain([task]);
    const mutation = makeUpdateChain(updated);
    const reload = makeLoadChain([updated]);

    mockFrom
      .mockReturnValueOnce({ select: initialLoad.select })
      .mockReturnValueOnce({ update: mutation.update })
      .mockReturnValueOnce({ select: reload.select });

    const { result } = renderHook(() => useDailyTasks('2026-04-01'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateStatus('task-001', 'completed');
    });

    expect(mutation.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', completed_at: expect.any(String) }),
    );
  });

  // ── assignWorker ─────────────────────────────────────────────────────────

  it('assignWorker updates assigned_to with the given staff ID', async () => {
    const task = makeTask();
    const updated = makeTask({ assigned_to: 'staff-007' });

    const initialLoad = makeLoadChain([task]);
    const mutation = makeUpdateChain(updated);
    const reload = makeLoadChain([updated]);

    mockFrom
      .mockReturnValueOnce({ select: initialLoad.select })
      .mockReturnValueOnce({ update: mutation.update })
      .mockReturnValueOnce({ select: reload.select });

    const { result } = renderHook(() => useDailyTasks('2026-04-01'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.assignWorker('task-001', 'staff-007');
    });

    expect(mutation.update).toHaveBeenCalledWith({ assigned_to: 'staff-007' });
    expect(mutation.eq).toHaveBeenCalledWith('id', 'task-001');
  });

  // ── completeWithLog ───────────────────────────────────────────────────────

  it('completeWithLog sets completed status, timestamps, and completion reference', async () => {
    const task = makeTask();
    const updated = makeTask({
      status: 'completed',
      completed_at: '2026-04-01T10:00:00.000Z',
      completion_ref_table: 'irrigation_logs',
      completion_ref_id: 'log-001',
      estimated_duration: '30 minutes',
    });

    const initialLoad = makeLoadChain([task]);
    const mutation = makeUpdateChain(updated);
    const reload = makeLoadChain([updated]);

    mockFrom
      .mockReturnValueOnce({ select: initialLoad.select })
      .mockReturnValueOnce({ update: mutation.update })
      .mockReturnValueOnce({ select: reload.select });

    const { result } = renderHook(() => useDailyTasks('2026-04-01'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned: DailyTaskInstance | undefined;
    await act(async () => {
      returned = await result.current.completeWithLog('task-001', 'irrigation_logs', 'log-001', '30 minutes');
    });

    expect(mutation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        completed_at: expect.any(String),
        completion_ref_table: 'irrigation_logs',
        completion_ref_id: 'log-001',
        estimated_duration: '30 minutes',
      }),
    );
    expect(returned).toEqual(updated);
  });

  it('completeWithLog omits estimated_duration when not provided', async () => {
    const task = makeTask();
    const updated = makeTask({ status: 'completed', completion_ref_table: 'harvest_sessions', completion_ref_id: 'h-001' });

    const initialLoad = makeLoadChain([task]);
    const mutation = makeUpdateChain(updated);
    const reload = makeLoadChain([updated]);

    mockFrom
      .mockReturnValueOnce({ select: initialLoad.select })
      .mockReturnValueOnce({ update: mutation.update })
      .mockReturnValueOnce({ select: reload.select });

    const { result } = renderHook(() => useDailyTasks('2026-04-01'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.completeWithLog('task-001', 'harvest_sessions', 'h-001');
    });

    expect(mutation.update).toHaveBeenCalledWith(
      expect.objectContaining({ estimated_duration: null }),
    );
  });

  // ── createTask ───────────────────────────────────────────────────────────

  it('createTask inserts with status pending and single_day scope', async () => {
    const newTask = makeTask({ id: 'task-002', task_type: 'scouting' });

    const initialLoad = makeLoadChain([]);
    const insert = makeInsertChain(newTask);
    const reload = makeLoadChain([newTask]);

    mockFrom
      .mockReturnValueOnce({ select: initialLoad.select })
      .mockReturnValueOnce({ insert: insert.insert })
      .mockReturnValueOnce({ select: reload.select });

    const { result } = renderHook(() => useDailyTasks('2026-04-01'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: DailyTaskInstance | undefined;
    await act(async () => {
      created = await result.current.createTask({
        room_id: 'room-001',
        task_type: 'scouting',
        task_date: '2026-04-01',
      });
    });

    expect(insert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        scope: 'single_day',
        room_id: 'room-001',
        task_type: 'scouting',
        task_date: '2026-04-01',
      }),
    );
    expect(created).toEqual(newTask);
  });

  // ── deleteTask ───────────────────────────────────────────────────────────

  it('deleteTask removes the task by id', async () => {
    const task = makeTask();

    const initialLoad = makeLoadChain([task]);
    const del = makeDeleteChain();
    const reload = makeLoadChain([]);

    mockFrom
      .mockReturnValueOnce({ select: initialLoad.select })
      .mockReturnValueOnce({ delete: del.delete })
      .mockReturnValueOnce({ select: reload.select });

    const { result } = renderHook(() => useDailyTasks('2026-04-01'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteTask('task-001');
    });

    expect(del.eq).toHaveBeenCalledWith('id', 'task-001');
  });
});
