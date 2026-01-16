import { describe, it, expect } from 'vitest';
import { formatCurrency, validateDate, getDateInputConstraints } from '@/lib/utils';

describe('formatCurrency', () => {
  it('should format positive numbers with two decimal places', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
    expect(formatCurrency(100)).toBe('$100.00');
    expect(formatCurrency(0.99)).toBe('$0.99');
  });

  it('should format zero correctly', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should handle large numbers', () => {
    expect(formatCurrency(1000000.50)).toBe('$1,000,000.50');
  });

  it('should round to two decimal places', () => {
    expect(formatCurrency(1234.567)).toBe('$1,234.57');
    expect(formatCurrency(1234.564)).toBe('$1,234.56');
  });
});

describe('validateDate', () => {
  const currentYear = new Date().getFullYear();

  it('should accept empty date strings', () => {
    const result = validateDate('');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept valid dates within range', () => {
    expect(validateDate('2024-01-15').isValid).toBe(true);
    expect(validateDate('2020-12-31').isValid).toBe(true);
    expect(validateDate(`${currentYear}-06-15`).isValid).toBe(true);
  });

  it('should reject invalid date formats', () => {
    const result = validateDate('not-a-date');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid date format');
  });

  it('should reject dates before 2020', () => {
    const result = validateDate('2019-12-31');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Year must be between 2020');
  });

  it('should reject dates more than 10 years in future', () => {
    const futureYear = currentYear + 11;
    const result = validateDate(`${futureYear}-01-01`);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Year must be between 2020');
  });

  it('should accept dates exactly at boundaries', () => {
    expect(validateDate('2020-01-01').isValid).toBe(true);
    expect(validateDate(`${currentYear + 10}-12-31`).isValid).toBe(true);
  });
});

describe('getDateInputConstraints', () => {
  const currentYear = new Date().getFullYear();

  it('should return correct min date', () => {
    const constraints = getDateInputConstraints();
    expect(constraints.min).toBe('2020-01-01');
  });

  it('should return correct max date based on current year', () => {
    const constraints = getDateInputConstraints();
    expect(constraints.max).toBe(`${currentYear + 10}-12-31`);
  });

  it('should return an object with min and max properties', () => {
    const constraints = getDateInputConstraints();
    expect(constraints).toHaveProperty('min');
    expect(constraints).toHaveProperty('max');
  });
});
