import { supabase } from '../lib/supabase';
import type { OrderableProduct } from '../types';

export async function fetchOrderableProducts(): Promise<OrderableProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      stage:product_stages!inner(
        id,
        name,
        sort_order,
        default_pricing_unit,
        allows_fractional_quantity,
        description,
        is_active
      ),
      type:product_types(id, name),
      strain:strains(id, name, abbreviation)
    `)
    .eq('product_stages.name', 'Packaged')
    .eq('is_active', true)
    .eq('is_archived', false)
    .in('product_category', ['packaged', 'preroll'])
    .order('product_category')
    .order('name');

  if (error) {
    console.error('Error fetching orderable products:', error);
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return (data || []) as OrderableProduct[];
}

export function isProductOrderable(product: OrderableProduct): boolean {
  return (
    product.stage?.name === 'Packaged' &&
    product.is_active === true &&
    ['packaged', 'preroll'].includes(product.product_category)
  );
}

export function getCategoryBadge(category: string): string {
  switch (category) {
    case 'packaged':
      return '📦';
    case 'preroll':
      return '🚬';
    case 'bulk':
      return '🔲';
    default:
      return '❓';
  }
}

export function formatProductPrice(product: OrderableProduct): string {
  const unit = product.pricing_unit || 'unit';
  const price = product.price_per_unit || 0;

  switch (unit) {
    case 'lb':
      return `$${price.toFixed(2)}/lb`;
    case 'unit':
      return `$${price.toFixed(2)}/unit`;
    case 'g':
      return `$${price.toFixed(2)}/g`;
    default:
      return `$${price.toFixed(2)}`;
  }
}

export function groupProductsByCategory(
  products: OrderableProduct[]
): Record<string, OrderableProduct[]> {
  return products.reduce((acc, product) => {
    const category = product.product_category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, OrderableProduct[]>);
}
