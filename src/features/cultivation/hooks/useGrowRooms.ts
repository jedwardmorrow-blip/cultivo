import { useEffect, useState, useCallback } from 'react';
import { cultivationService } from '../services';
import type { GrowRoom, CreateGrowRoomInput, UpdateGrowRoomInput } from '../types';

export function useGrowRooms() {
  const [rooms, setRooms] = useState<GrowRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cultivationService.listGrowRooms();
      setRooms(data);
    } catch {
      setError('Failed to load grow rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeRooms = rooms.filter((r) => r.is_active);

  async function createRoom(input: CreateGrowRoomInput): Promise<GrowRoom> {
    const room = await cultivationService.createGrowRoom(input);
    await load();
    return room;
  }

  async function updateRoom(id: string, input: UpdateGrowRoomInput): Promise<GrowRoom> {
    const room = await cultivationService.updateGrowRoom(id, input);
    await load();
    return room;
  }

  async function archiveRoom(id: string): Promise<GrowRoom> {
    const room = await cultivationService.archiveGrowRoom(id);
    await load();
    return room;
  }

  return { rooms, activeRooms, loading, error, reload: load, createRoom, updateRoom, archiveRoom };
}
