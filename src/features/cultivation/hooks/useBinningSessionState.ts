import { useReducer, useCallback } from 'react';
import type { HarvestSession, CreateBinningSessionInput } from '../types';

export type TabKey = 'pending' | 'active' | 'completed' | 'cancelled';

export const TAB_LABELS: Record<TabKey, string> = {
  pending: 'Pending',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// ─── State shape ───

interface BinningViewState {
  activeTab: TabKey;
  showNewForm: boolean;
  startingId: string | null;
  startError: string | null;
}

// ─── Actions ───

type BinningViewAction =
  | { type: 'SET_TAB'; tab: TabKey }
  | { type: 'SHOW_NEW_FORM' }
  | { type: 'HIDE_NEW_FORM' }
  | { type: 'START_BINNING'; harvestId: string }
  | { type: 'START_BINNING_ERROR'; error: string }
  | { type: 'START_BINNING_DONE' }
  | { type: 'CLEAR_START_ERROR' }
  | { type: 'FORM_SUCCESS' };

// ─── Reducer ───

const initialState: BinningViewState = {
  activeTab: 'pending',
  showNewForm: false,
  startingId: null,
  startError: null,
};

function binningViewReducer(state: BinningViewState, action: BinningViewAction): BinningViewState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };
    case 'SHOW_NEW_FORM':
      return { ...state, showNewForm: true };
    case 'HIDE_NEW_FORM':
      return { ...state, showNewForm: false };
    case 'START_BINNING':
      return { ...state, startingId: action.harvestId, startError: null };
    case 'START_BINNING_ERROR':
      return { ...state, startError: action.error };
    case 'START_BINNING_DONE':
      return { ...state, startingId: state.startError ? state.startingId : null };
    case 'CLEAR_START_ERROR':
      return { ...state, startError: null, startingId: null };
    case 'FORM_SUCCESS':
      return { ...state, showNewForm: false, activeTab: 'active' };
    default:
      return state;
  }
}

// ─── Hook ───

export function useBinningSessionState(
  createSession: (input: CreateBinningSessionInput) => Promise<unknown>,
  reload: () => void,
) {
  const [state, dispatch] = useReducer(binningViewReducer, initialState);

  const setActiveTab = useCallback((tab: TabKey) => {
    dispatch({ type: 'SET_TAB', tab });
  }, []);

  const showNewForm = useCallback(() => {
    dispatch({ type: 'SHOW_NEW_FORM' });
  }, []);

  const hideNewForm = useCallback(() => {
    dispatch({ type: 'HIDE_NEW_FORM' });
  }, []);

  const handleFormSuccess = useCallback(() => {
    dispatch({ type: 'FORM_SUCCESS' });
    reload();
  }, [reload]);

  const handleStartBinning = useCallback(async (harvest: HarvestSession, dryRoomId?: string) => {
    if (!dryRoomId || !harvest.batch_registry_id) return;
    dispatch({ type: 'START_BINNING', harvestId: harvest.id });
    try {
      const input: CreateBinningSessionInput = {
        harvest_session_id: harvest.id,
        dry_room_id: dryRoomId,
        batch_registry_id: harvest.batch_registry_id,
        bin_date: new Date().toISOString().slice(0, 10),
      };
      await createSession(input);
      dispatch({ type: 'SET_TAB', tab: 'active' });
    } catch (e: unknown) {
      dispatch({
        type: 'START_BINNING_ERROR',
        error: e instanceof Error ? e.message : 'Failed to start binning session',
      });
    } finally {
      dispatch({ type: 'START_BINNING_DONE' });
    }
  }, [createSession]);

  return {
    state,
    setActiveTab,
    showNewForm,
    hideNewForm,
    handleFormSuccess,
    handleStartBinning,
  };
}
