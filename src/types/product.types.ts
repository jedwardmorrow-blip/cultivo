import type { Database } from '../lib/database/database.types';

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];

export interface ProductStage {
  id: string;
  name: string;
  sort_order: number;
  default_pricing_unit: string;
  allows_fractional_quantity: boolean;
  description: string | null;
  is_active: boolean;
}

export interface Strain {
  id: string;
  name: string;
  abbreviation: string | null;
  dominance_type: string | null;
  genetics_description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductType {
  id: string;
  name: string;
  abbreviation: string | null;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Stage {
  id: string;
  name: string;
  display_name: string;
  stage_order: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderableProduct extends Omit<Product, 'type' | 'strain'> {
  type: string;
  product_type?: {
    id: string;
    name: string;
  };
  product_stage: ProductStage;
  product_category?: string;
  pricing_unit?: string;
  strain_info?: {
    id: string;
    name: string;
    abbreviation: string | null;
  };
}
