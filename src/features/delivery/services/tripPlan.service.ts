import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';
import type {
  TripPlan,
  TripPlanStop,
  TripPlanWithDetails,
  TripPlanCreateInput,
  TripPlanCompleteInput,
  DeliveryDriver,
  DeliveryVehicle,
} from '@/types';

export async function getActiveDrivers(): Promise<DeliveryDriver[]> {
  try {
    const { data, error } = await supabase
      .from('delivery_drivers')
      .select('*')
      .eq('is_active', true)
      .order('last_name');
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    errorService.handle(error, 'Failed to load drivers');
    return [];
  }
}

export async function getActiveVehicles(): Promise<DeliveryVehicle[]> {
  try {
    const { data, error } = await supabase
      .from('delivery_vehicles')
      .select('*')
      .eq('is_active', true)
      .order('license_plate');
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    errorService.handle(error, 'Failed to load vehicles');
    return [];
  }
}

export async function getTripPlans(
  statusFilter?: TripPlan['status']
): Promise<TripPlanWithDetails[]> {
  try {
    let query = supabase
      .from('trip_plans')
      .select(`
        *,
        driver:delivery_drivers(*),
        vehicle:delivery_vehicles(*),
        stops:trip_plan_stops(*)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      ...row,
      stops: (row.stops ?? []).sort(
        (a: TripPlanStop, b: TripPlanStop) => a.stop_order - b.stop_order
      ),
    }));
  } catch (error) {
    errorService.handle(error, 'Failed to load trip plans');
    return [];
  }
}

export async function getTripPlanById(id: string): Promise<TripPlanWithDetails | null> {
  try {
    const { data, error } = await supabase
      .from('trip_plans')
      .select(`
        *,
        driver:delivery_drivers(*),
        vehicle:delivery_vehicles(*),
        stops:trip_plan_stops(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      ...data,
      stops: (data.stops ?? []).sort(
        (a: TripPlanStop, b: TripPlanStop) => a.stop_order - b.stop_order
      ),
    } as TripPlanWithDetails;
  } catch (error) {
    errorService.handle(error, 'Failed to load trip plan');
    return null;
  }
}

export async function createTripPlan(
  input: TripPlanCreateInput
): Promise<{ data: TripPlan | null; error: any }> {
  try {
    const { stops, ...planFields } = input;

    const { data: plan, error: planError } = await supabase
      .from('trip_plans')
      .insert({
        ...planFields,
        product_manifest: planFields.product_manifest ?? [],
        status: 'draft',
      })
      .select()
      .single();

    if (planError) throw planError;

    if (stops.length > 0) {
      const { error: stopsError } = await supabase.from('trip_plan_stops').insert(
        stops.map((s, i) => ({
          ...s,
          trip_plan_id: plan.id,
          stop_order: i + 1,
        }))
      );
      if (stopsError) throw stopsError;
    }

    return { data: plan, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to create trip plan');
    return { data: null, error };
  }
}

export async function dispatchTripPlan(
  id: string
): Promise<{ error: any }> {
  try {
    // R9-18-312: Validate driver, vehicle, stops, and manifest before dispatch
    const { data: plan, error: fetchError } = await supabase
      .from('trip_plans')
      .select(`
        *,
        driver:delivery_drivers(*),
        vehicle:delivery_vehicles(*),
        stops:trip_plan_stops(id)
      `)
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const errors: string[] = [];
    if (!plan.driver || !plan.driver.is_active) errors.push('Active driver is required');
    if (!plan.vehicle || !plan.vehicle.is_active) errors.push('Active vehicle is required');
    if (!plan.stops || plan.stops.length === 0) errors.push('At least one stop is required');
    if (!plan.product_manifest || plan.product_manifest.length === 0) errors.push('Product manifest cannot be empty');

    if (errors.length > 0) {
      throw new Error(`Cannot dispatch: ${errors.join('; ')}`);
    }

    const { error } = await supabase
      .from('trip_plans')
      .update({ status: 'active', departure_time: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'draft');
    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to dispatch trip plan');
    return { error };
  }
}

export async function completeTripPlan(
  id: string,
  input: TripPlanCompleteInput
): Promise<{ error: any }> {
  try {
    // R9-18-312: Only active trip plans can transition to completed
    const { data: updated, error: planError } = await supabase
      .from('trip_plans')
      .update({ status: 'completed', end_time: input.end_time })
      .eq('id', id)
      .eq('status', 'active')
      .select('id')
      .maybeSingle();
    if (planError) throw planError;
    if (!updated) throw new Error('Trip plan must be active before completing');

    if (input.deviations && input.deviations.length > 0) {
      const { error: devError } = await supabase
        .from('trip_plan_deviations')
        .insert(
          input.deviations.map((d) => ({
            trip_plan_id: id,
            deviation_type: d.deviation_type,
            description: d.description,
          }))
        );
      if (devError) throw devError;
    }

    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to complete trip plan');
    return { error };
  }
}
