import { describe, it, expect } from 'vitest';
import {
  parseProductName,
  standardizeProductName,
  isValidProductName,
  extractCategoryPrefix,
  areNamesEquivalent,
  getCategoryTypeSuffix,
  previewTransformations,
} from '@/lib/productNaming';

describe('parseProductName', () => {
  it('should parse standard format product names', () => {
    const result = parseProductName('Bulk - Blue Pave - Flower');
    expect(result).toEqual({
      stage: 'Bulk',
      strain: 'Blue Pave',
      type: 'Flower',
    });
  });

  it('should handle names with multiple dashes in type', () => {
    const result = parseProductName('Packaged - Z Marker - 3.5g Flower');
    expect(result).toEqual({
      stage: 'Packaged',
      strain: 'Z Marker',
      type: '3.5g Flower',
    });
  });

  it('should return null for invalid formats', () => {
    expect(parseProductName('Invalid Format')).toBeNull();
    expect(parseProductName('Only-One-Dash')).toBeNull();
    expect(parseProductName('')).toBeNull();
  });

  it('should handle extra whitespace', () => {
    const result = parseProductName('Bulk  -  Blue Pave  -  Flower');
    expect(result).toEqual({
      stage: 'Bulk',
      strain: 'Blue Pave',
      type: 'Flower',
    });
  });
});

describe('standardizeProductName', () => {
  describe('Binned items', () => {
    it('should standardize binned flower', () => {
      const result = standardizeProductName('Binned Blue Pave', 'Flower - Binned', 'Blue Pave');
      expect(result).toBe('Binned - Blue Pave - Flower');
    });

    it('should handle case insensitivity', () => {
      const result = standardizeProductName('binned test', 'flower - binned', 'Test Strain');
      expect(result).toBe('Binned - Test Strain - Flower');
    });
  });

  describe('Bucked items', () => {
    it('should standardize bucked flower', () => {
      const result = standardizeProductName('Bucked Flower', 'Flower - Bucked', 'Test Strain');
      expect(result).toBe('Bucked - Test Strain - Flower');
    });

    it('should standardize bucked smalls', () => {
      const result = standardizeProductName('Bucked Smalls', 'Flower - Bucked', 'Test Strain');
      expect(result).toBe('Bucked - Test Strain - Smalls');
    });
  });

  describe('Bulk items', () => {
    it('should standardize bulk flower', () => {
      const result = standardizeProductName('Bulk Flower', 'Flower - Bulk', 'Lemondary');
      expect(result).toBe('Bulk - Lemondary - Flower');
    });

    it('should standardize bulk smalls', () => {
      const result = standardizeProductName('Bulk Smalls', 'Flower - Bulk', 'Lemondary');
      expect(result).toBe('Bulk - Lemondary - Smalls');
    });
  });

  describe('Trim items', () => {
    it('should standardize trim', () => {
      const result = standardizeProductName('Trim', 'Trim - Bulk', 'Magic Marker');
      expect(result).toBe('Trim - Magic Marker - Bulk');
    });
  });

  describe('Packaged items', () => {
    it('should standardize 3.5g prepack', () => {
      const result = standardizeProductName('3.5g Prepack', 'Flower - Prepack', 'Z Marker');
      expect(result).toBe('Packaged - Z Marker - 3.5g Flower');
    });

    it('should standardize 14g smalls', () => {
      const result = standardizeProductName('14g Smalls', 'Flower - Prepack', 'Blue Pave');
      expect(result).toBe('Packaged - Blue Pave - 14g Smalls');
    });

    it('should handle generic packaged items', () => {
      const result = standardizeProductName('Packaged', 'Flower - Packaged', 'Test Strain');
      expect(result).toBe('Packaged - Test Strain - Flower');
    });
  });

  describe('Pre-roll items', () => {
    it('should standardize pre-rolls', () => {
      const result = standardizeProductName('Pre-Roll', 'Pre-Rolls - Standard', 'Blue Pave');
      expect(result).toBe('Pre-Roll - Blue Pave - 1g');
    });
  });

  describe('Already standardized names', () => {
    it('should not modify names that are already standardized', () => {
      const name = 'Bulk - Blue Pave - Flower';
      const result = standardizeProductName(name, 'Flower - Bulk', 'Blue Pave');
      expect(result).toBe(name);
    });

    it('should detect multiple dashes', () => {
      const name = 'Packaged - Z Marker - 3.5g Flower';
      const result = standardizeProductName(name, 'Flower - Prepack', 'Z Marker');
      expect(result).toBe(name);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty inputs gracefully', () => {
      expect(standardizeProductName('', '', '')).toBe('');
      expect(standardizeProductName('test', '', '')).toBe('test');
    });

    it('should return original if no rule matches', () => {
      const original = 'Unknown Format';
      const result = standardizeProductName(original, 'Unknown Category', 'Test');
      expect(result).toBe(original);
    });
  });
});

describe('isValidProductName', () => {
  it('should validate correct format names', () => {
    expect(isValidProductName('Bulk - Blue Pave - Flower')).toBe(true);
    expect(isValidProductName('Packaged - Z Marker - 3.5g Flower')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(isValidProductName('Invalid Format')).toBe(false);
    expect(isValidProductName('Only - One')).toBe(false);
    expect(isValidProductName('')).toBe(false);
  });

  it('should require at least three parts', () => {
    expect(isValidProductName('Part1 - Part2')).toBe(false);
    expect(isValidProductName('Part1 - Part2 - Part3')).toBe(true);
    expect(isValidProductName('Part1 - Part2 - Part3 - Part4')).toBe(true);
  });
});

describe('extractCategoryPrefix', () => {
  it('should extract the first part before dash', () => {
    expect(extractCategoryPrefix('Bulk - Blue Pave - Flower')).toBe('Bulk');
    expect(extractCategoryPrefix('Packaged - Z Marker - 3.5g')).toBe('Packaged');
  });

  it('should return null for names without dashes', () => {
    expect(extractCategoryPrefix('No Dashes Here')).toBeNull();
  });

  it('should handle whitespace', () => {
    expect(extractCategoryPrefix('  Bulk  - Test')).toBe('Bulk');
  });
});

describe('areNamesEquivalent', () => {
  it('should match names with same strain and type', () => {
    const name1 = 'Bulk - Blue Pave - Flower';
    const name2 = 'Binned - Blue Pave - Flower';
    expect(areNamesEquivalent(name1, name2)).toBe(true);
  });

  it('should not match names with different strains', () => {
    const name1 = 'Bulk - Blue Pave - Flower';
    const name2 = 'Bulk - Lemondary - Flower';
    expect(areNamesEquivalent(name1, name2)).toBe(false);
  });

  it('should not match names with different types', () => {
    const name1 = 'Bulk - Blue Pave - Flower';
    const name2 = 'Bulk - Blue Pave - Smalls';
    expect(areNamesEquivalent(name1, name2)).toBe(false);
  });

  it('should be case insensitive', () => {
    const name1 = 'Bulk - Blue Pave - Flower';
    const name2 = 'Bulk - blue pave - flower';
    expect(areNamesEquivalent(name1, name2)).toBe(true);
  });

  it('should return false for invalid formats', () => {
    expect(areNamesEquivalent('Invalid', 'Also Invalid')).toBe(false);
  });
});

describe('getCategoryTypeSuffix', () => {
  it('should return Flower for flower categories', () => {
    expect(getCategoryTypeSuffix('Flower - Bulk')).toBe('Flower');
    expect(getCategoryTypeSuffix('Flower - Binned')).toBe('Flower');
  });

  it('should return Smalls for smalls categories', () => {
    expect(getCategoryTypeSuffix('Flower - Smalls')).toBe('Smalls');
    expect(getCategoryTypeSuffix('Bulk - Smalls')).toBe('Smalls');
  });

  it('should return Bulk for trim categories', () => {
    expect(getCategoryTypeSuffix('Trim - Bulk')).toBe('Bulk');
  });

  it('should return Flower for prepack', () => {
    expect(getCategoryTypeSuffix('Flower - Prepack')).toBe('Flower');
    expect(getCategoryTypeSuffix('Flower - Packaged')).toBe('Flower');
  });

  it('should return 1g for pre-rolls', () => {
    expect(getCategoryTypeSuffix('Pre-Rolls - Standard')).toBe('1g');
    expect(getCategoryTypeSuffix('Pre-Roll')).toBe('1g');
  });

  it('should default to Flower for unknown categories', () => {
    expect(getCategoryTypeSuffix('Unknown Category')).toBe('Flower');
  });
});

describe('previewTransformations', () => {
  it('should generate transformation preview for items', () => {
    const items = [
      {
        product_name: 'Binned Flower',
        category: 'Flower - Binned',
        strain: 'Blue Pave',
        package_id: 'PKG-001',
      },
      {
        product_name: 'Bulk - Lemondary - Flower',
        category: 'Flower - Bulk',
        strain: 'Lemondary',
        package_id: 'PKG-002',
      },
    ];

    const results = previewTransformations(items);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      originalName: 'Binned Flower',
      standardizedName: 'Binned - Blue Pave - Flower',
      category: 'Flower - Binned',
      strain: 'Blue Pave',
      isValid: true,
      reason: 'Standardized to match products catalog',
    });

    expect(results[1]).toMatchObject({
      originalName: 'Bulk - Lemondary - Flower',
      standardizedName: 'Bulk - Lemondary - Flower',
      isValid: true,
      reason: 'Already in correct format',
    });
  });

  it('should handle empty array', () => {
    const results = previewTransformations([]);
    expect(results).toHaveLength(0);
  });
});
