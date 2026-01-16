export {
  fetchOrderableProducts,
  isProductOrderable,
  getCategoryBadge,
  formatProductPrice,
  groupProductsByCategory
} from '@/services/products.service';

export type { OrderableProduct } from '@/types';

export function getStageBadge(stageName: string | undefined): string {
  switch (stageName) {
    case 'Packaged':
      return '📦';
    case 'Bulk':
      return '🔲';
    case 'Bucked':
      return '🌿';
    case 'Binned':
      return '🗂️';
    default:
      return '❓';
  }
}

export function getStageDescription(stageName: string | undefined): string {
  switch (stageName) {
    case 'Packaged':
      return 'Customer-orderable packaged products with unit pricing';
    case 'Bulk':
      return 'Backend processing stage - variable grams, no customer pricing';
    case 'Bucked':
      return 'Backend processing stage - bucked material ready for trimming';
    case 'Binned':
      return 'Backend processing stage - material separated into bins';
    default:
      return 'Unknown stage';
  }
}

export function formatProductNameWithStage(product: { name: string; stage?: { name: string } }): string {
  const stageBadge = getStageBadge(product.stage?.name);
  return `${stageBadge} ${product.name}`;
}
