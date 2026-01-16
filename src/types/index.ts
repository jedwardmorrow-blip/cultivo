/**
 * Central Type Exports
 *
 * This file exports all canonical domain types from /src/types/
 *
 * Phase 1: Type System Consolidation (2025-10-27)
 * - Domain types (Customer, Product, Order, etc.) are defined here as single source of truth
 * - All domain types derive from database-generated types (database.types.ts)
 * - Features should import from this central location or re-export with aliases
 * - Feature-specific types remain in feature /types/ directories
 *
 * Canonical Types (source of truth):
 * - Customer, CustomerInsert, CustomerUpdate (customer.types.ts)
 * - Product, ProductInsert, ProductUpdate, OrderableProduct (product.types.ts)
 * - Order, OrderInsert, OrderUpdate, OrderItem (order.types.ts)
 * - Batch types (batch.types.ts)
 * - COA types (coa.types.ts)
 * - Coversheet types (coversheet.types.ts)
 * - User types (user.types.ts)
 *
 * Feature-Specific Types (not canonical, stay in features):
 * - UI state types
 * - Component prop interfaces
 * - Workflow-specific types
 * - Feature-specific extensions
 */

// Canonical domain types
export * from './order.types';
export * from './product.types';
export * from './customer.types';
export * from './batch.types';
export * from './coa.types';
export * from './coversheet.types';
export * from './user.types';
export * from './movement.types';

// Feature-specific types that are widely used
export * from '../features/settings/types';
export * from '../features/inventory/types/conversions.types';
