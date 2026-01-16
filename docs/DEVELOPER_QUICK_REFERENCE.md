---
title: DEVELOPER_QUICK_REFERENCE
category: Developer Experience
version: 1.0
updated: 2025-11-10
---

# Developer Quick Reference Guide

> **Purpose:** Fast lookup for common development tasks, patterns, and procedures
> **Audience:** Developers working on the CULT Seed-to-Sale system
> **Keep This Handy:** Bookmark this page for quick answers during development

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Development Environment](#development-environment)
3. [Database & Type Generation](#database--type-generation)
4. [Common Tasks](#common-tasks)
5. [Code Patterns](#code-patterns)
6. [Naming Conventions](#naming-conventions)
7. [Testing](#testing)
8. [Debugging](#debugging)
9. [Common Errors & Fixes](#common-errors--fixes)
10. [Useful Commands](#useful-commands)

---

## Quick Start

### First Time Setup

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# 3. Generate database types
export SUPABASE_ACCESS_TOKEN='your-token-here'
npm run types:generate

# 4. Start development server
npm run dev
```

### Daily Development

```bash
# Start dev server (auto-reload enabled)
npm run dev

# Run type checking (before committing)
npm run typecheck

# Build for production (verify no errors)
npm run build
```

---

## Development Environment

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| npm | 9+ | Package manager |
| Supabase CLI | Latest | Database type generation |
| Git | Any | Version control |

### Environment Variables

**Location:** `.env` file in project root

**Required Variables:**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# For type generation only (not in .env)
SUPABASE_ACCESS_TOKEN=your-personal-access-token
```

**Getting Your Access Token:**
1. Visit [Supabase Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens)
2. Generate new token
3. `export SUPABASE_ACCESS_TOKEN='token-here'`

---

## Database & Type Generation

### When to Regenerate Types

**MUST regenerate after:**
- Database migrations applied
- Schema changes deployed
- Pulling changes with new migrations
- TypeScript errors mentioning missing types

**How to Generate:**
```bash
# 1. Set token (one-time per shell session)
export SUPABASE_ACCESS_TOKEN='your-token-here'

# 2. Generate types
npm run types:generate

# 3. Verify success
git status  # Should show modified: src/lib/database/database.types.ts
```

### Type Import Pattern

```typescript
import type { Database } from '@/lib/database/database.types';

// Extract table types
type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

// Extract view types
type BatchSelection = Database['public']['Views']['vw_batch_selection']['Row'];
```

### Common Type Issues

| Error | Cause | Fix |
|-------|-------|-----|
| `Module has no exported member 'X'` | Types outdated | Regenerate types |
| `Property 'batch_id' does not exist` | Types outdated | Regenerate types |
| Types don't match runtime data | Types cached | Restart dev server, clear `node_modules/.vite` |

**See:** [TESTING-&-MIGRATION.md](./TESTING-&-MIGRATION.md) for complete troubleshooting

---

## Common Tasks

### Creating a New Feature Module

```bash
# 1. Create feature directory structure
src/features/my-feature/
  ├── components/
  ├── hooks/
  ├── services/
  ├── types/
  └── index.ts

# 2. Follow existing patterns
# See: src/features/products/ for reference
```

### Adding a New Database Table

```bash
# 1. Create migration file
supabase/migrations/YYYYMMDDHHMMSS_descriptive_name.sql

# 2. Write SQL with:
#    - CREATE TABLE IF NOT EXISTS
#    - RLS policies (ALWAYS)
#    - Indexes
#    - Comments

# 3. Apply migration (via Supabase dashboard or CLI)

# 4. Regenerate types
npm run types:generate
```

### Adding a New Component

```typescript
// src/features/my-feature/components/MyComponent.tsx
import { useState } from 'react';
import { Database } from '@/lib/database/database.types';

type MyData = Database['public']['Tables']['my_table']['Row'];

export function MyComponent() {
  const [data, setData] = useState<MyData[]>([]);

  // Component logic...

  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### Adding a New Service

```typescript
// src/features/my-feature/services/myFeature.service.ts
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database/database.types';

type MyData = Database['public']['Tables']['my_table']['Row'];

export const myFeatureService = {
  async getAll(): Promise<{ data: MyData[] | null; error: any }> {
    return supabase
      .from('my_table')
      .select('*')
      .order('created_at', { ascending: false });
  },

  async create(input: Partial<MyData>): Promise<{ data: MyData | null; error: any }> {
    return supabase
      .from('my_table')
      .insert(input)
      .select()
      .single();
  },
};
```

---

## Code Patterns

### Supabase Query Pattern

```typescript
// Standard query pattern
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value)
  .order('created_at', { ascending: false });

if (error) {
  console.error('Error:', error);
  // Handle error
}

// data is now typed based on database.types.ts
```

### Query with Joins

```typescript
// Join related tables
const { data, error } = await supabase
  .from('products')
  .select(`
    *,
    strain:strains(id, name, abbreviation),
    type:product_types(id, name),
    stage:product_stages(id, name)
  `)
  .eq('is_archived', false);
```

### Using maybeSingle() vs single()

```typescript
// Use maybeSingle() when row might not exist
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .eq('id', customerId)
  .maybeSingle();  // Returns null if not found (no error)

// Use single() only when you're sure row exists
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .eq('id', customerId)
  .single();  // Throws error if not found
```

### React Hook Pattern

```typescript
// Custom hook for data fetching
export function useMyData() {
  const [data, setData] = useState<MyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: result, error: err } = await myService.getAll();

    if (err) {
      setError(err.message);
    } else {
      setData(result || []);
    }
    setLoading(false);
  }

  return { data, loading, error, refetch: fetchData };
}
```

### Error Handling Pattern

```typescript
// Service layer - return error object
export async function createOrder(input: OrderInput) {
  const { data, error } = await supabase
    .from('orders')
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error('Failed to create order:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

// Component layer - handle error
async function handleSubmit() {
  const { data, error } = await createOrder(formData);

  if (error) {
    alert(`Failed to create order: ${error.message}`);
    return;
  }

  // Success handling
  navigate('/orders');
}
```

---

## Naming Conventions

### File Names

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `CustomerForm.tsx` |
| Services | camelCase | `customers.service.ts` |
| Hooks | camelCase | `useCustomers.ts` |
| Types | camelCase | `customer.types.ts` |
| Utilities | camelCase | `dateUtils.ts` |

### Variable Names

```typescript
// Components - PascalCase
const MyComponent = () => { };

// Functions/variables - camelCase
const fetchCustomers = async () => { };
const customerList = [];

// Constants - UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_TIMEOUT_MS = 5000;

// Types/Interfaces - PascalCase
type Customer = { };
interface CustomerFormProps { }
```

### Database Conventions

```sql
-- Tables - snake_case (plural)
CREATE TABLE customers ( );
CREATE TABLE order_items ( );

-- Columns - snake_case
customer_id uuid
created_at timestamptz
is_archived boolean

-- Foreign keys - {table}_id
customer_id REFERENCES customers(id)
batch_id REFERENCES batch_registry(id)
```

### ID Formats

```
Batch Number:    YYMMDD-STRAIN
                 └─ Example: 251110-GSC

Package ID:      YYMMDD-STRAIN-PKG
                 └─ Example: 251110-GSC-BF-001

Order Number:    YYMMDD-CODE-NN
                 └─ Example: 251110-TDH-01
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test src/features/products/__tests__/products.test.ts

# Run with coverage
npm run test:coverage
```

### Writing Tests

```typescript
// src/features/my-feature/__tests__/myFeature.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '../myFeature';

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });

  it('should handle edge case', () => {
    const result = myFunction('');
    expect(result).toBe(null);
  });
});
```

### Test Patterns

**Unit Test Example:**
```typescript
describe('productNaming', () => {
  it('generates correct product name', () => {
    const name = generateProductName({
      strain: 'GSC',
      type: 'Bulk Flower',
      stage: 'Bulk Available'
    });
    expect(name).toBe('GSC - Bulk Flower');
  });
});
```

**Component Test Example:**
```typescript
import { render, screen } from '@testing-library/react';
import { CustomerForm } from './CustomerForm';

describe('CustomerForm', () => {
  it('renders form fields', () => {
    render(<CustomerForm isOpen={true} onClose={() => {}} onSave={async () => {}} />);
    expect(screen.getByLabelText('Customer Name')).toBeInTheDocument();
  });
});
```

---

## Debugging

### Common Debug Points

**1. Check Supabase Connection:**
```typescript
// In browser console
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Has Anon Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
```

**2. Check RLS Policies:**
```sql
-- In Supabase SQL Editor
SELECT * FROM customers WHERE id = 'some-uuid';
-- If returns nothing, check RLS policies
```

**3. Inspect Query:**
```typescript
// Log the query
const query = supabase.from('customers').select('*');
console.log('Query:', query);

// Log the result
const { data, error } = await query;
console.log('Data:', data);
console.log('Error:', error);
```

**4. Check Network Tab:**
- Open DevTools → Network
- Filter by "supabase"
- Check request/response
- Look for 401/403 (auth issues) or 404 (table not found)

### React DevTools

**Install:** React Developer Tools (Chrome/Firefox extension)

**Usage:**
- Components tab: Inspect component state/props
- Profiler tab: Performance analysis
- Hooks: View all hook values

### Console Logging Best Practices

```typescript
// Development debugging (remove before commit)
console.log('Debug:', variable);

// Persistent logging (keep for troubleshooting)
console.error('Failed to fetch customers:', error);
console.warn('Unusual condition detected:', condition);

// Performance logging
console.time('fetchCustomers');
await fetchCustomers();
console.timeEnd('fetchCustomers');
```

---

## Common Errors & Fixes

### TypeScript Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Property 'X' does not exist on type 'Y'` | Outdated types | `npm run types:generate` |
| `Type 'X' is not assignable to type 'Y'` | Type mismatch | Check database.types.ts for correct type |
| `Cannot find module '@/...'` | Path alias issue | Check tsconfig.json paths |

### Supabase Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `row-level security policy` | RLS blocking query | Check RLS policies, ensure authenticated |
| `relation "table" does not exist` | Table not created | Run migration, regenerate types |
| `duplicate key value` | Unique constraint violated | Check for existing records |
| `foreign key violation` | Referenced row doesn't exist | Ensure parent record exists first |

### Build Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Failed to resolve import` | Missing dependency | `npm install` |
| `Unexpected token` | Syntax error | Check file for errors |
| `Module not found` | Import path wrong | Fix import path |

### Common Pitfalls

**1. Forgetting to Handle Errors:**
```typescript
// ❌ Bad
const { data } = await supabase.from('customers').select('*');

// ✅ Good
const { data, error } = await supabase.from('customers').select('*');
if (error) {
  console.error('Error:', error);
  return;
}
```

**2. Not Using maybeSingle():**
```typescript
// ❌ Bad - throws error if not found
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('id', id)
  .single();

// ✅ Good - returns null if not found
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('id', id)
  .maybeSingle();
```

**3. Forgetting to Regenerate Types:**
```typescript
// After adding new table or columns:
npm run types:generate
```

---

## Useful Commands

### Development

```bash
# Start dev server
npm run dev

# Type check
npm run typecheck

# Lint code
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database

```bash
# Generate types from remote database
npm run types:generate

# Check database connection
# (In browser console after starting dev server)
console.log(supabase.from('customers').select('*'))
```

### Testing

```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Run with coverage
npm run test:coverage
```

### Git

```bash
# Check what changed
git status

# Stage changes
git add .

# Commit with message
git commit -m "feat: add customer management"

# Push to remote
git push
```

### Troubleshooting

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Restart TypeScript server (VS Code)
# Command Palette → TypeScript: Restart TS Server
```

---

## Quick Links

### Documentation

- [README.md](../README.md) - Project overview and setup
- [TESTING-&-MIGRATION.md](./TESTING-&-MIGRATION.md) - Type generation, testing, migrations
- [DOCS-INTEGRATION-PROGRESS.md](./DOCS-INTEGRATION-PROGRESS.md) - Implementation tracking
- [SYSTEM-WORKFLOW.md](./SYSTEM-WORKFLOW.md) - End-to-end workflows
- [docs/README.md](./README.md) - Documentation index

### Feature Documentation

- [BATCHES.md](./BATCHES.md) - Batch management (⭐ PRIMARY REFERENCE)
- [PRODUCTS.md](./PRODUCTS.md) - Product catalog
- [CUSTOMERS.md](./CUSTOMERS.md) - Customer management
- [ORDERS.md](./ORDERS.md) - Order workflow
- [INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md) - Inventory management
- [SESSIONS.md](./SESSIONS.md) - Production sessions

### External Resources

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Vite Documentation](https://vitejs.dev)

---

## Tips & Best Practices

### Code Organization

✅ **Do:**
- Keep files under 300 lines
- One component per file
- Co-locate related files in feature folders
- Use barrel exports (index.ts) for clean imports

❌ **Don't:**
- Create god files with all logic
- Mix unrelated functionality
- Use deeply nested folder structures
- Put all types in one giant file

### Performance

✅ **Do:**
- Use React.memo() for expensive components
- Implement pagination for large lists
- Lazy load routes and heavy components
- Use indexes on frequently queried columns

❌ **Don't:**
- Fetch all records without pagination
- Re-fetch on every render
- Create N+1 query patterns
- Load heavy dependencies unnecessarily

### Security

✅ **Do:**
- Always enable RLS on tables
- Validate user input
- Use parameterized queries (Supabase does this)
- Check authentication before sensitive operations

❌ **Don't:**
- Store secrets in code
- Trust client-side validation alone
- Expose sensitive data in responses
- Skip RLS policies

### Git Commits

✅ **Good Commit Messages:**
```
feat: add customer geocoding
fix: resolve batch number validation
docs: update PRODUCTS.md with examples
refactor: extract order service logic
```

❌ **Bad Commit Messages:**
```
update
fix bug
changes
wip
```

---

## Getting Help

### Internal Resources

1. **Check Documentation:** Start with this guide, then module-specific docs
2. **Search Codebase:** Look for similar implementations
3. **Check Tests:** Unit tests often show usage examples
4. **Review PR History:** See how others solved similar problems

### External Resources

1. **Supabase Discord:** Active community support
2. **React Documentation:** Comprehensive guides
3. **Stack Overflow:** Tag: `supabase`, `react`, `typescript`
4. **GitHub Issues:** Check project issues for known problems

### When Stuck

1. Check error message in console
2. Search error message online
3. Review relevant documentation
4. Check if types need regeneration
5. Clear cache and restart dev server
6. Ask team member for help

---

**Document Version:** 1.0
**Last Updated:** 2025-11-10
**Maintainer:** Development Team
**Status:** Living Document - Update as patterns evolve
