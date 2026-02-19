import { useEffect, useState, useCallback } from 'react';
import { cultivationService } from '../services';
import type { DryRoom, CreateDryRoomInput, UpdateDryRoomInput } from '../types';

export function useDryRooms() {
  const [rooms, setRooms] = useState<DryRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cultivationService.listDryRooms();
      setRooms(data);
    } catch {
      setError('Failed to load dry rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeRooms = rooms.filter((r) => r.is_active);

  async function createRoom(input: CreateDryRoomInput): Promise<DryRoom> {
    const room = await cultivationService.createDryRoom(input);
    await load();
    return room;
  }

  async function updateRoom(id: string, input: UpdateDryRoomInput): Promise<DryRoom> {
    const room = await cultivationService.updateDryRoom(id, input);
    await load();
    return room;
  }

  async function archiveRoom(id: string): Promise<DryRoom> {
    const room = await cultivationService.archiveDryRoom(id);
    await load();
    return room;
  }

  return { rooms, activeRooms, loading, error, reload: load, createRoom, updateRoom, archiveRoom };
}
