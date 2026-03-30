import { useEffect, useState, useCallback } from 'react';
import { cultivationService } from '../services';
import type {
  PlantGroup,
  PlantGroupStageHistory,
  PlantGroupRoomHistory,
  GrowthStage,
  CreatePlantGroupInput,
  SplitAndMoveInput,
} from '../types';

export function usePlantGroups(filter?: { stage?: GrowthStage | 'active' }) {
  const [groups, setGroups] = useState<PlantGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cultivationService.listPlantGroups(filter);
      setGroups(data);
    } catch {
      setError('Failed to load plant groups');
    } finally {
      setLoading(false);
    }
  }, [filter?.stage]);

  useEffect(() => {
    load();
  }, [load]);

  async function createGroup(input: CreatePlantGroupInput): Promise<PlantGroup> {
    const group = await cultivationService.createPlantGroup(input);
    await load();
    return group;
  }

  async function advanceStage(id: string, toStage: GrowthStage): Promise<PlantGroup> {
    const group = await cultivationService.advanceStage(id, toStage);
    await load();
    return group;
  }

  async function moveToRoom(id: string, toRoomId: string): Promise<PlantGroup> {
    const group = await cultivationService.moveToRoom(id, toRoomId);
    await load();
    return group;
  }

  async function splitAndMoveToRoom(input: SplitAndMoveInput): Promise<PlantGroup[]> {
    const newGroups = await cultivationService.splitAndMoveToRoom(input);
    await load();
    return newGroups;
  }

  async function setMotherStatus(id: string, isMother: boolean): Promise<PlantGroup> {
    const group = await cultivationService.setMotherStatus(id, isMother);
    await load();
    return group;
  }

  async function getStageHistory(plantGroupId: string): Promise<PlantGroupStageHistory[]> {
    return cultivationService.getStageHistory(plantGroupId);
  }

  async function getRoomHistory(plantGroupId: string): Promise<PlantGroupRoomHistory[]> {
    return cultivationService.getRoomHistory(plantGroupId);
  }

  return {
    groups,
    loading,
    error,
    reload: load,
    createGroup,
    advanceStage,
    moveToRoom,
    splitAndMoveToRoom,
    setMotherStatus,
    getStageHistory,
    getRoomHistory,
  };
}
