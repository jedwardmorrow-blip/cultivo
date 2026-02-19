import { useEffect, useState, useCallback } from 'react';
import { cultivationService } from '../services';
import type { RoomTable, UpdateRoomSectionInput } from '../types';

export function useRoomSections(growRoomId: string | null) {
  const [tables, setTables] = useState<RoomTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!growRoomId) {
      setTables([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await cultivationService.listRoomTables(growRoomId);
      setTables(data);
    } catch {
      setError('Failed to load room layout');
    } finally {
      setLoading(false);
    }
  }, [growRoomId]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateSection(id: string, input: UpdateRoomSectionInput): Promise<void> {
    await cultivationService.updateRoomSection(id, input);
    await load();
  }

  const hasSections = tables.some((t) => t.sections.length > 0);

  return { tables, loading, error, hasSections, reload: load, updateSection };
}
