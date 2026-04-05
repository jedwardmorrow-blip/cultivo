export interface DeliveryDriver {
  id: string;
  first_name: string;
  last_name: string;
  fa_number: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryVehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  license_plate: string | null;
  vin: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TripPlanManifestItem {
  order_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit: string;
}

export interface TripPlan {
  id: string;
  driver_id: string;
  vehicle_id: string;
  departure_time: string | null;
  end_time: string | null;
  status: 'draft' | 'active' | 'completed';
  product_manifest: TripPlanManifestItem[];
  anticipated_route: string | null;
  pdf_path: string | null;
  notes: string | null;
  retention_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripPlanStop {
  id: string;
  trip_plan_id: string;
  stop_order: number;
  location_name: string;
  address: string;
  estimated_arrival: string | null;
  estimated_departure: string | null;
  actual_arrival: string | null;
  actual_departure: string | null;
  order_ids: string[];
  created_at: string;
}

export interface TripPlanDeviation {
  id: string;
  trip_plan_id: string;
  deviation_type: string;
  description: string;
  recorded_at: string;
}

export interface TripPlanWithDetails extends TripPlan {
  driver: DeliveryDriver;
  vehicle: DeliveryVehicle;
  stops: TripPlanStop[];
}

export interface TripPlanCreateInput {
  driver_id: string;
  vehicle_id: string;
  departure_time?: string | null;
  anticipated_route?: string | null;
  notes?: string | null;
  product_manifest?: TripPlanManifestItem[];
  stops: Omit<TripPlanStop, 'id' | 'trip_plan_id' | 'created_at'>[];
}

export interface TripPlanCompleteInput {
  end_time: string;
  deviations?: { deviation_type: string; description: string }[];
}
