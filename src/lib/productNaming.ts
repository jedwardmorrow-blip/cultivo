/**
 * Product Naming Utility Module
 *
 * Centralizes all product naming standardization logic to ensure consistency
 * between inventory items and the products catalog.
 *
 * Naming Convention:
 * Products table format: "[Stage] - [Strain] - [Type]"
 * Examples:
 *   - "Binned - Blue Pave - Flower"
 *   - "Bulk - Lemondary - Flower"
 *   - "Bulk - Magic Marker - Smalls"
 *   - "Packaged - Z Marker - 3.5g Flower"
 */

export interface ProductNameComponents {
  stage: string;
  strain: string;
  type: string;
}

export interface NamingTransformResult {
  originalName: string;
  standardizedName: string;
  category: string;
  strain: string;
  isValid: boolean;
  reason?: string;
}

/**
 * Parse product name into components
 */
export function parseProductName(productName: string): ProductNameComponents | null {
  const parts = productName.split(' - ').map(p => p.trim());

  if (parts.length >= 3) {
    return {
      stage: parts[0],
      strain: parts[1],
      type: parts.slice(2).join(' - ')
    };
  }

  return null;
}

/**
 * Standardize inventory product name to match products catalog convention
 *
 * Transformation rules based on category:
 * - "Flower - Binned" → "Binned - [Strain] - Flower"
 * - "Flower - Bucked" → "Bucked - [Strain] - Flower" (Note: Bucked isn't in products, keeps as-is)
 * - "Flower - Bulk" → "Bulk - [Strain] - [Flower/Smalls]" (determined from product_name)
 * - "Trim - Bulk" → "Trim - [Strain] - Bulk"
 * - "Flower - Prepack" → "Packaged - [Strain] - [Size]"
 * - "Pre-Rolls - Standard" → Already correct format
 */
export function standardizeProductName(
  productName: string,
  category: string,
  strain: string
): string {
  if (!productName || !category || !strain) {
    return productName;
  }

  // Already standardized format (contains 2 or more dashes)
  if ((productName.match(/-/g) || []).length >= 2) {
    return productName;
  }

  const lowerName = productName.toLowerCase();
  const lowerCategory = category.toLowerCase();

  // Binned items: "Binned - [Strain]" → "Binned - [Strain] - Flower"
  if (lowerCategory.includes('binned')) {
    return `Binned - ${strain} - Flower`;
  }

  // Bucked items: Keep as-is (not in products catalog)
  if (lowerCategory.includes('bucked')) {
    if (lowerName.includes('smalls')) {
      return `Bucked - ${strain} - Smalls`;
    }
    return `Bucked - ${strain} - Flower`;
  }

  // Bulk Flower items
  if (lowerCategory.includes('bulk') && lowerCategory.includes('flower')) {
    // Determine if it's Smalls or Flower based on product_name
    if (lowerName.includes('smalls')) {
      return `Bulk - ${strain} - Smalls`;
    }
    return `Bulk - ${strain} - Flower`;
  }

  // Trim items
  if (lowerCategory.includes('trim')) {
    return `Trim - ${strain} - Bulk`;
  }

  // Packaged/Prepack items
  if (lowerCategory.includes('prepack') || lowerCategory.includes('packaged')) {
    // Extract size from product name
    if (lowerName.includes('3.5g')) {
      return `Packaged - ${strain} - 3.5g Flower`;
    }
    if (lowerName.includes('14g')) {
      return `Packaged - ${strain} - 14g Smalls`;
    }
    return `Packaged - ${strain} - Flower`;
  }

  // Pre-rolls
  if (lowerCategory.includes('pre-roll') || lowerCategory.includes('preroll')) {
    return `Pre-Roll - ${strain} - 1g`;
  }

  // Default: return original if no rule matches
  return productName;
}

/**
 * Validate if a product name matches the standard convention
 */
export function isValidProductName(productName: string): boolean {
  if (!productName) return false;

  const parts = productName.split(' - ');
  return parts.length >= 3;
}

/**
 * Get transformation preview for a batch of inventory items
 */
export function previewTransformations(
  items: Array<{ product_name: string; category: string; strain: string; package_id: string }>
): NamingTransformResult[] {
  return items.map(item => {
    const standardized = standardizeProductName(
      item.product_name,
      item.category,
      item.strain
    );

    const changed = standardized !== item.product_name;

    return {
      originalName: item.product_name,
      standardizedName: standardized,
      category: item.category,
      strain: item.strain,
      isValid: isValidProductName(standardized),
      reason: changed ? 'Standardized to match products catalog' : 'Already in correct format'
    };
  });
}

/**
 * Extract category prefix from product name
 */
export function extractCategoryPrefix(productName: string): string | null {
  const match = productName.match(/^([^-]+)\s*-/);
  return match ? match[1].trim() : null;
}

/**
 * Check if two product names are semantically equivalent
 * (same strain and type, different formatting)
 */
export function areNamesEquivalent(name1: string, name2: string): boolean {
  const parsed1 = parseProductName(name1);
  const parsed2 = parseProductName(name2);

  if (!parsed1 || !parsed2) return false;

  return (
    parsed1.strain.toLowerCase() === parsed2.strain.toLowerCase() &&
    parsed1.type.toLowerCase() === parsed2.type.toLowerCase()
  );
}

/**
 * Map category to expected product type suffix
 */
export function getCategoryTypeSuffix(category: string): string {
  const lowerCategory = category.toLowerCase();

  if (lowerCategory.includes('flower') && !lowerCategory.includes('smalls')) {
    return 'Flower';
  }
  if (lowerCategory.includes('smalls')) {
    return 'Smalls';
  }
  if (lowerCategory.includes('trim')) {
    return 'Bulk';
  }
  if (lowerCategory.includes('prepack') || lowerCategory.includes('packaged')) {
    return 'Flower';
  }
  if (lowerCategory.includes('pre-roll')) {
    return '1g';
  }

  return 'Flower';
}
