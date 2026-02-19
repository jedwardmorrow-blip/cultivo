import { useEffect, useState, useCallback } from 'react';
import { cultivationService } from '../services';
import type {
  RoomTable,
  RoomSection,
  UpdateRoomSectionInput,
  CreateRoomTableInput,
  UpdateRoomTableInput,
  CreateRoomSectionInput,
} from '../types';

export function useRoomSections(growRoomId: string | null, opts?: { includeArchived?: boolean }) {
  const [tables, setTables] = useState<RoomTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const includeArchived = opts?.includeArchived ?? false;

  const load = useCallback(async () => {
    if (!growRoomId) {
      setTables([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await cultivationService.listRoomTables(growRoomId, { includeArchived });
      setTables(data);
    } catch {
      setError('Failed to load room layout');
    } finally {
      setLoading(false);
    }
  }, [growRoomId, includeArchived]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateSection(id: string, input: UpdateRoomSectionInput): Promise<void> {
    await cultivationService.updateRoomSection(id, input);
    await load();
  }

  async function createTable(input: CreateRoomTableInput): Promise<void> {
    await cultivationService.createRoomTable(input);
    await load();
  }

  async function updateTable(id: string, input: UpdateRoomTableInput): Promise<void> {
    await cultivationService.updateRoomTable(id, input);
    await load();
  }

  async function archiveTable(id: string): Promise<void> {
    await cultivationService.archiveRoomTable(id);
    await load();
  }

  async function createSection(input: CreateRoomSectionInput): Promise<void> {
    await cultivationService.createRoomSection(input);
    await load();
  }

  async function archiveSection(id: string): Promise<void> {
    await cultivationService.archiveRoomSection(id);
    await load();
  }

  const hasSections = tables.some((t) => t.sections.length > 0);
  const allSections: RoomSection[] = tables.flatMap((t) => t.sections);

  return {
    tables,
    allSections,
    loading,
    error,
    hasSections,
    reload: load,
    updateSection,
    createTable,
    updateTable,
    archiveTable,
    createSection,
    archiveSection,
  };
}
