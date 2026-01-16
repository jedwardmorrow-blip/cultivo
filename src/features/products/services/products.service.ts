import { supabase } from '@/lib/supabase';
import type { Product, Strain, ProductType, Stage } from '@/types';

/**
 * Products Service
 *
 * Comprehensive service for managing products, strains, product types, and stages.
 * Handles the product catalog that drives ordering and inventory.
 *
 * @module productsService
 */

export const productsService = {
  /**
   * Fetches all active products
   *
   * @returns Promise<Product[]> - Non-archived products ordered by name
   * @description Returns products available for ordering
   */
  async fetchProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_archived', false)
      .order('name');

    if (error) throw error;
    return (data as Product[]) || [];
  },

  /**
   * Fetches a single product by UUID
   *
   * @param id - Product UUID
   * @returns Promise<Product | null> - Product or null if not found
   */
  async fetchProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Product | null;
  },

  /**
   * Creates a new product
   *
   * @param product - Product data (without id)
   * @returns Promise<Product> - Created product with generated id
   */
  async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  /**
   * Updates an existing product
   *
   * @param id - Product UUID
   * @param updates - Fields to update
   * @returns Promise<void>
   */
  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Deletes a product
   *
   * @param id - Product UUID
   * @returns Promise<void>
   */
  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Fetches all strains
   *
   * @returns Promise<Strain[]> - All strains ordered by name
   */
  async fetchStrains(): Promise<Strain[]> {
    const { data, error } = await supabase
      .from('strains')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data as Strain[]) || [];
  },

  /**
   * Creates a new strain
   *
   * @param strain - Strain data (without id, created_at)
   * @returns Promise<Strain> - Created strain
   */
  async createStrain(strain: Omit<Strain, 'id' | 'created_at'>): Promise<Strain> {
    const { data, error } = await supabase
      .from('strains')
      .insert(strain)
      .select()
      .single();

    if (error) throw error;
    return data as Strain;
  },

  async updateStrain(id: string, updates: Partial<Strain>): Promise<void> {
    const { error } = await supabase
      .from('strains')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteStrain(id: string): Promise<void> {
    const { error } = await supabase
      .from('strains')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async fetchProductTypes(): Promise<ProductType[]> {
    const { data, error } = await supabase
      .from('product_types')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data as ProductType[]) || [];
  },

  async createProductType(productType: Omit<ProductType, 'id' | 'created_at'>): Promise<ProductType> {
    const { data, error } = await supabase
      .from('product_types')
      .insert(productType)
      .select()
      .single();

    if (error) throw error;
    return data as ProductType;
  },

  async updateProductType(id: string, updates: Partial<ProductType>): Promise<void> {
    const { error } = await supabase
      .from('product_types')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteProductType(id: string): Promise<void> {
    const { error } = await supabase
      .from('product_types')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async fetchStages(): Promise<Stage[]> {
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .order('order_index');

    if (error) throw error;
    return (data as Stage[]) || [];
  },

  async createStage(stage: Omit<Stage, 'id' | 'created_at'>): Promise<Stage> {
    const { data, error } = await supabase
      .from('stages')
      .insert(stage)
      .select()
      .single();

    if (error) throw error;
    return data as Stage;
  },

  async updateStage(id: string, updates: Partial<Stage>): Promise<void> {
    const { error } = await supabase
      .from('stages')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteStage(id: string): Promise<void> {
    const { error } = await supabase
      .from('stages')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async syncProductsForStrain(strainId: string): Promise<{ products_created: number; strain_name: string }> {
    const { data, error } = await supabase.rpc('sync_products_for_strain', {
      p_strain_id: strainId,
      p_is_active: true,
    });

    if (error) throw error;
    return data?.[0] || { products_created: 0, strain_name: '' };
  },

  async syncProductsForAllStrains(): Promise<{
    total_strains_processed: number;
    total_products_created: number;
    strains_processed: string[];
  }> {
    const { data, error } = await supabase.rpc('sync_products_for_all_strains');

    if (error) throw error;
    return data?.[0] || { total_strains_processed: 0, total_products_created: 0, strains_processed: [] };
  },

  async getProductCoverageReport(): Promise<
    Array<{
      strain_name: string;
      total_applicable_products: number;
      existing_products: number;
      missing_products: number;
      coverage_percentage: number;
    }>
  > {
    const { data, error } = await supabase.rpc('get_product_coverage_report');

    if (error) throw error;
    return data || [];
  },

  async syncProductCatalog(): Promise<{
    total_strains_processed: number;
    total_products_created: number;
    strains_processed: string[];
  }> {
    return this.syncProductsForAllStrains();
  },

  // Conversion methods
  async fetchConversionStats(strainFilter?: string): Promise<any[]> {
    let query = supabase
      .from('packaging_yield_statistics')
      .select('*')
      .order('strain')
      .order('source_type')
      .order('target_type');

    if (strainFilter && strainFilter !== 'all') {
      query = query.eq('strain', strainFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async fetchConversionHistory(strainFilter?: string): Promise<any[]> {
    let query = supabase
      .from('conversion_rate_history')
      .select('*')
      .order('date_range_end', { ascending: false });

    if (strainFilter && strainFilter !== 'all') {
      query = query.eq('strain', strainFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async fetchStrainNames(): Promise<string[]> {
    const { data, error } = await supabase
      .from('strains')
      .select('name')
      .order('name');

    if (error) throw error;
    return data?.map(s => s.name) || [];
  },

  // Product Stages methods
  async fetchProductStages(): Promise<any[]> {
    const { data, error } = await supabase
      .from('product_stages')
      .select('*')
      .order('sort_order');

    if (error) throw error;
    return data || [];
  },

  async updateProductStage(id: string, updates: any): Promise<void> {
    const { error } = await supabase
      .from('product_stages')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },
};
