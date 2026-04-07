import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
// useFeedProgramRecipe — Resolves the feed recipe for a room
// based on the active feed program, room stage, and current week.
// ═══════════════════════════════════════════════════════════════

export interface FeedProduct {
  id: string;
  name: string;
  brand: string | null;
  product_type: string;
  unit: string;
  mixing_order_hint: number | null;
}

export interface RecipeEntry {
  product: FeedProduct;
  ml_per_gal: number;
  ml_per_gal_max: number | null;
  mixing_order: number;
  notes: string | null;
}

export interface WeekTargets {
  week_id: string;
  phase: string;
  week_number: number;
  target_ec: number | null;
  target_ppm_500: number | null;
  target_ppm_700: number | null;
  target_ph_min: number | null;
  target_ph_max: number | null;
  notes: string | null;
}

export interface ResolvedRecipe {
  program_id: string;
  program_name: string;
  program_week_id: string;
  phase: string;
  week_number: number;
  targets: WeekTargets;
  entries: RecipeEntry[];
}

export interface RoomFeedOverride {
  target_ec: number | null;
  target_ph_min: number | null;
  target_ph_max: number | null;
  product_overrides: Record<string, number>; // product_id → ml_per_gal
}

interface FeedProgramRow {
  id: string;
  name: string;
  brand: string | null;
  base_unit: string;
  concentrate_ratio: string | null;
  is_active: boolean;
}

interface FeedProgramWeekRow {
  id: string;
  feed_program_id: string;
  phase: string;
  week_number: number;
  target_ec: number | null;
  target_ppm_500: number | null;
  target_ppm_700: number | null;
  target_ph_min: number | null;
  target_ph_max: number | null;
  notes: string | null;
}

interface FeedProgramEntryRow {
  id: string;
  program_week_id: string;
  feed_product_id: string;
  amount_per_unit: number;
  amount_max: number | null;
  mixing_order: number;
  notes: string | null;
  feed_products: FeedProduct;
}

/**
 * Resolve the feed recipe for a given room stage and day-in-stage.
 * Returns the matched program week with all product entries sorted by mixing order.
 * If roomId is provided, loads any room-level overrides from room_feed_overrides.
 */
export function useFeedProgramRecipe(
  roomStage: string | null,
  daysInStage: number | null,
  roomId?: string | null,
) {
  const [recipe, setRecipe] = useState<ResolvedRecipe | null>(null);
  const [allPrograms, setAllPrograms] = useState<FeedProgramRow[]>([]);
  const [roomOverride, setRoomOverride] = useState<RoomFeedOverride | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map room stages to feed chart phases
  const phase = roomStage === 'flowering' || roomStage === 'flower'
    ? 'flower'
    : roomStage === 'vegetation' || roomStage === 'veg' || roomStage === 'vegetative'
      ? 'veg'
      : roomStage === 'clone' || roomStage === 'cloning'
        ? 'clone'
        : roomStage === 'mother'
          ? 'veg' // mothers use veg feed
          : null;

  const weekNumber = daysInStage != null && daysInStage >= 0
    ? Math.max(1, Math.ceil((daysInStage + 1) / 7))
    : null;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get active feed programs
      const { data: programs, error: progErr } = await supabase
        .from('feed_programs')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (progErr) throw progErr;
      setAllPrograms((programs ?? []) as FeedProgramRow[]);

      if (!phase || weekNumber == null || !programs?.length) {
        setRecipe(null);
        return;
      }

      // Use the first active program (typically "Athena Pro with Fade")
      const program = programs[0] as FeedProgramRow;

      // 2. Find the matching week — clamp to max available week for this phase
      const { data: weeks, error: weekErr } = await supabase
        .from('feed_program_weeks')
        .select('*')
        .eq('feed_program_id', program.id)
        .eq('phase', phase)
        .order('week_number', { ascending: true });

      if (weekErr) throw weekErr;
      if (!weeks?.length) {
        setRecipe(null);
        return;
      }

      const typedWeeks = weeks as FeedProgramWeekRow[];
      const maxWeek = typedWeeks[typedWeeks.length - 1].week_number;
      const clampedWeek = Math.min(weekNumber, maxWeek);
      const matchedWeek = typedWeeks.find((w) => w.week_number === clampedWeek)
        ?? typedWeeks[typedWeeks.length - 1];

      // 3. Load entries for that week with product joins
      const { data: entries, error: entryErr } = await supabase
        .from('feed_program_entries')
        .select('*, feed_products(*)')
        .eq('program_week_id', matchedWeek.id)
        .order('mixing_order', { ascending: true });

      if (entryErr) throw entryErr;

      const recipeEntries: RecipeEntry[] = ((entries ?? []) as FeedProgramEntryRow[]).map((e) => ({
        product: e.feed_products,
        ml_per_gal: e.amount_per_unit,
        ml_per_gal_max: e.amount_max,
        mixing_order: e.mixing_order,
        notes: e.notes,
      }));

      setRecipe({
        program_id: program.id,
        program_name: program.name,
        program_week_id: matchedWeek.id,
        phase: matchedWeek.phase,
        week_number: matchedWeek.week_number,
        targets: {
          week_id: matchedWeek.id,
          phase: matchedWeek.phase,
          week_number: matchedWeek.week_number,
          target_ec: matchedWeek.target_ec,
          target_ppm_500: matchedWeek.target_ppm_500,
          target_ppm_700: matchedWeek.target_ppm_700,
          target_ph_min: matchedWeek.target_ph_min,
          target_ph_max: matchedWeek.target_ph_max,
          notes: matchedWeek.notes,
        },
        entries: recipeEntries,
      });

      // 4. Load room override if roomId provided
      if (roomId) {
        const { data: override } = await supabase
          .from('room_feed_overrides')
          .select('target_ec, target_ph_min, target_ph_max, product_overrides')
          .eq('grow_room_id', roomId)
          .eq('program_week_id', matchedWeek.id)
          .maybeSingle();

        setRoomOverride(override ? {
          target_ec: override.target_ec,
          target_ph_min: override.target_ph_min,
          target_ph_max: override.target_ph_max,
          product_overrides: (override.product_overrides ?? {}) as Record<string, number>,
        } : null);
      } else {
        setRoomOverride(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed recipe');
      setRecipe(null);
    } finally {
      setLoading(false);
    }
  }, [phase, weekNumber, roomId]);

  // Save room override — upsert to room_feed_overrides
  const saveRoomOverride = useCallback(async (override: RoomFeedOverride) => {
    if (!roomId || !recipe) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: upsertErr } = await supabase
        .from('room_feed_overrides')
        .upsert({
          grow_room_id: roomId,
          program_week_id: recipe.program_week_id,
          target_ec: override.target_ec,
          target_ph_min: override.target_ph_min,
          target_ph_max: override.target_ph_max,
          product_overrides: override.product_overrides,
          updated_by: user?.id ?? null,
        }, { onConflict: 'grow_room_id,program_week_id' });

      if (upsertErr) throw upsertErr;
      setRoomOverride(override);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save override');
    } finally {
      setSaving(false);
    }
  }, [roomId, recipe]);

  useEffect(() => {
    void load();
  }, [load]);

  return { recipe, roomOverride, allPrograms, loading, saving, error, refetch: load, saveRoomOverride, resolvedPhase: phase, resolvedWeek: weekNumber };
}
