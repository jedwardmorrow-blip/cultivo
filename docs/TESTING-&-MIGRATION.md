---
title: TESTING-&-MIGRATION
category: Platform, Settings & Safety
version: 1.4
updated: 2025-11-10
status: 📝 Documented → ✅ Comprehensive
---

## Purpose

Defines testing protocols, migration procedures, and schema management practices for the CULT Seed-to-Sale system. This document ensures consistent deployment practices, type safety, and database integrity across development, staging, and production environments.

---

## Database Type Generation

### Strategy

**Decision:** Generate TypeScript types from **remote production database** (established 2025-11-09)

### Implementation

**Step 1: One-time Setup**
```bash
# Install Supabase CLI
npm install --save-dev supabase

# Script is already configured in package.json:
# "types:generate": "bash scripts/generate-types.sh"
```

**Step 2: Authentication Setup (Required)**
```bash
# Get your personal access token:
# 1. Go to https://supabase.com/dashboard/account/tokens
# 2. Generate a new token
# 3. Set the environment variable:

export SUPABASE_ACCESS_TOKEN='your-token-here'

# On Windows (CMD):
set SUPABASE_ACCESS_TOKEN=your-token-here

# On Windows (PowerShell):
$env:SUPABASE_ACCESS_TOKEN="your-token-here"
```

**Step 3: Generate Types**
```bash
npm run types:generate
```

### Authentication Requirements

**Required:** Supabase personal access token

The type generation command requires authentication to access your project's database schema.

**To obtain an access token:**

1. Visit [Supabase Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens)
2. Click "Generate new token"
3. Give it a descriptive name (e.g., "Type Generation - Dev Machine")
4. Copy the token immediately (it won't be shown again)
5. Set the environment variable (see Step 2 above)

**Important Notes:**
- Each developer needs their own personal access token
- Do not share tokens or commit them to version control
- For CI/CD: Store the token as a secret environment variable
- Tokens can be revoked at any time from the Supabase dashboard

### When to Regenerate Types

**Required:**
- ✅ After deploying new migrations to production
- ✅ When TypeScript errors reference missing database types
- ✅ Before starting work after database schema changes
- ✅ Before major releases (as part of pre-release checklist)

**Recommended:**
- 📅 Monthly maintenance check for drift
- 📅 After batch migration deployments
- 📅 When onboarding new developers

**Not Required:**
- ❌ After every local schema change (wait for deployment)
- ❌ During active development (unless needed for type checking)

### Rationale

1. **Single Source of Truth** - Production database reflects actual deployed schema
2. **Scalability** - Simpler for new team members (only need connection string)
3. **Centralized Control** - No local Supabase instance required
4. **CI/CD Friendly** - Easy to automate type generation in pipelines
5. **Accuracy** - Avoids migration file drift from actual database state

### Version Control

- `database.types.ts` is **committed to git** (not in .gitignore)
- Provides type safety even without live database connection
- Helps detect schema changes during code review
- Changes to this file indicate database schema evolution

### Verification Steps

After regenerating types, verify success:

**1. Check File Updated**
```bash
# Verify database.types.ts was modified
git status
# Should show: modified: src/lib/database/database.types.ts
```

**2. Verify New Types Present**
```bash
# Search for batch_registry type (should exist after regeneration)
grep -n "batch_registry" src/lib/database/database.types.ts
# Should show multiple matches with table definition

# Search for inventory_movements type
grep -n "inventory_movements" src/lib/database/database.types.ts
# Should show table definition
```

**3. Run Type Check**
```bash
npm run typecheck
# Expected: Errors should drop from ~44 to ~14 (or fewer)
# Remaining errors are typically feature implementation issues, not type issues
```

**4. Verify in Code**
```typescript
// Try importing types in any file
import type { Database } from '@/lib/database/database.types';

type BatchRegistry = Database['public']['Tables']['batch_registry']['Row'];
// Should not show TypeScript error if regeneration succeeded
```

**Expected Changes:**
- Tables added: `batch_registry`, `inventory_movements`, `inventory_items`
- New views: `vw_batch_selection`, `vw_inventory_overview`
- Updated enums: lifecycle states, movement types
- ~50+ new type definitions

### Troubleshooting

#### Issue: "Module has no exported member 'BatchRegistry'"

**Cause:** `database.types.ts` is outdated and missing new schema elements.

**Solution:**
1. Verify `SUPABASE_ACCESS_TOKEN` is set: `echo $SUPABASE_ACCESS_TOKEN`
2. Regenerate types: `npm run types:generate`
3. Check that new types appear in `database.types.ts`
4. Restart TypeScript server in your IDE

#### Issue: Type generation fails with authentication error

**Symptoms:**
```
Error: Failed to connect to Supabase
Invalid access token
```

**Solutions:**
1. **Token not set:** Run `export SUPABASE_ACCESS_TOKEN='your-token'`
2. **Token expired:** Generate new token at [Supabase Dashboard](https://supabase.com/dashboard/account/tokens)
3. **Wrong token:** Ensure you're using personal access token, not project anon key
4. **Shell session:** Token only lasts for current shell session - set it again if you opened a new terminal

#### Issue: Types generated but errors persist

**Symptoms:**
- `database.types.ts` file updated
- Git shows changes
- But TypeScript errors remain

**Solutions:**
1. **Clear TypeScript cache:**
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```
2. **Restart IDE:** VS Code, WebStorm, etc. may cache old types
3. **Check import paths:** Verify you're importing from correct path:
   ```typescript
   import type { Database } from '@/lib/database/database.types';
   ```
4. **Verify tsconfig.json paths:** Ensure `@/*` alias is configured

#### Issue: "Command not found: supabase"

**Cause:** Supabase CLI not installed or not in PATH.

**Solution:**
```bash
# Reinstall dependencies
npm install

# Or use npx to run CLI directly
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database/database.types.ts
```

#### Issue: Type generation partially completes

**Symptoms:**
- Some tables are typed, others are missing
- File size much smaller than expected

**Solutions:**
1. Check Supabase connection: Verify project is accessible
2. Check RLS policies: Ensure admin token has schema access
3. Check for broken migrations: Some migrations may have failed in production
4. Manual verification: Compare `database.types.ts` against actual schema in Supabase dashboard

### Impact of Outdated Types

**Current State (As of 2025-11-10):**
- TypeScript errors: ~44 errors
- Missing types: `batch_registry`, `inventory_movements`, 15+ fields in `inventory_items`
- Blocking: New feature development, accurate IDE autocomplete

**After Regeneration:**
- Expected errors: ~14 (mostly implementation-related, not type-related)
- Added types: batch_registry, inventory_movements, event-driven inventory system
- Unblocked: All batch-centric features, inventory tracking development

**Why Types Are Critical:**
1. **Type Safety:** Prevent runtime errors from schema mismatches
2. **Developer Experience:** Accurate autocomplete and inline documentation
3. **Refactoring:** Safe renames and structural changes
4. **Code Review:** Catch schema-related bugs before deployment
5. **Documentation:** Types serve as living documentation of database structure

---

## PDF.js Worker Synchronization

### Strategy

**Decision:** Lock pdfjs-dist version and auto-sync worker file to prevent version mismatches (established 2026-02-06)

### The Problem

PDF.js requires the worker file version to exactly match the library version. When npm installs a newer version of `pdfjs-dist` (due to the `^` caret in package.json), but the worker file in `public/` remains at the old version, COA uploads fail with errors like:

```
Incompatible worker version: 5.4.624 !== 5.4.530
```

This blocks critical workflows like Certificate of Analysis uploads for batch compliance.

### Implementation

**Step 1: Version Lock (One-time)**

The package.json now locks pdfjs-dist to an exact version:

```json
"pdfjs-dist": "5.4.624"  // No caret (^) - exact version only
```

**Step 2: Automatic Sync (Automatic)**

A postinstall hook automatically syncs the worker file after every `npm install`:

```json
"postinstall": "bash scripts/sync-pdf-worker.sh"
```

**Step 3: Manual Sync (If Needed)**

You can manually run the sync script at any time:

```bash
npm run postinstall
# Or directly:
bash scripts/sync-pdf-worker.sh
```

### When Synchronization Runs

**Automatically:**
- ✅ After `npm install`
- ✅ After `npm ci` (in CI/CD)
- ✅ When onboarding new developers
- ✅ When upgrading pdfjs-dist version

**Manually (optional):**
- 🔧 After manually updating worker file
- 🔧 When debugging COA upload issues
- 🔧 When verifying version match

### Upgrading PDF.js

When you need to upgrade to a newer PDF.js version:

1. **Update package.json:**
   ```bash
   # Change version in package.json
   "pdfjs-dist": "5.4.700"  # New exact version
   ```

2. **Install and sync:**
   ```bash
   npm install
   # Postinstall hook automatically syncs worker file
   ```

3. **Verify version match:**
   ```bash
   # Check installed version
   npm list pdfjs-dist

   # Verify worker file was synced
   ls -lh public/pdf.worker.min.mjs
   # Should show recent timestamp
   ```

4. **Test COA uploads:**
   - Upload a test COA PDF
   - Verify no version mismatch errors
   - Confirm PDF preview renders correctly

### Verification Steps

After installation or upgrade, verify synchronization:

**1. Check Worker File Exists**
```bash
ls -lh public/pdf.worker.min.mjs
# Should show ~1.1MB file with recent timestamp
```

**2. Verify Versions Match**
```bash
# Check package version
npm list pdfjs-dist

# Check worker was synced (file timestamp should be recent)
stat public/pdf.worker.min.mjs
```

**3. Test in Application**
```bash
# Start dev server
npm run dev

# Navigate to COA Management → Upload COA
# Should work without "Incompatible worker version" errors
```

### Troubleshooting

#### Issue: "Incompatible worker version" error

**Symptoms:**
```
Error: Incompatible worker version: 5.4.XXX !== 5.4.YYY
COA upload fails
PDF preview not loading
```

**Solution:**
```bash
# Re-sync worker file
bash scripts/sync-pdf-worker.sh

# If that doesn't work, reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Issue: Worker file not found

**Symptoms:**
```
Failed to load worker: /pdf.worker.min.mjs
404 Not Found
```

**Solution:**
```bash
# Manually run sync script
bash scripts/sync-pdf-worker.sh

# Verify file exists
ls -lh public/pdf.worker.min.mjs

# Check Vite configuration includes public directory
```

#### Issue: Postinstall script doesn't run

**Symptoms:**
- npm install completes
- No "Syncing PDF.js worker file..." message
- Worker file not updated

**Solutions:**
1. **Check script permissions:**
   ```bash
   chmod +x scripts/sync-pdf-worker.sh
   ```

2. **Run manually:**
   ```bash
   bash scripts/sync-pdf-worker.sh
   ```

3. **Verify package.json:**
   ```json
   "postinstall": "bash scripts/sync-pdf-worker.sh"
   ```

4. **Check for npm install flags:**
   ```bash
   # Postinstall scripts are skipped with --ignore-scripts
   npm install  # ✅ Runs postinstall
   npm install --ignore-scripts  # ❌ Skips postinstall
   ```

#### Issue: Version mismatch persists after sync

**Symptoms:**
- Sync script ran successfully
- Worker file updated
- But error still shows old version number

**Solutions:**
1. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or clear cache in DevTools

2. **Clear Vite cache:**
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

3. **Verify file contents:**
   ```bash
   # Check file size (should be ~1.1MB for v5.4.624)
   ls -lh public/pdf.worker.min.mjs

   # Check it's not an old cached version
   head -c 200 public/pdf.worker.min.mjs
   ```

### Script Details

The sync script (`scripts/sync-pdf-worker.sh`) performs these actions:

1. Detects installed pdfjs-dist version from package.json
2. Locates worker file in node_modules
3. Copies worker to public directory
4. Verifies sync with file size check
5. Reports version and file details

**Script output:**
```
🔄 Syncing PDF.js worker file...
✅ PDF.js worker synced successfully!
📦 Version: 5.4.624
📄 File: public/pdf.worker.min.mjs
📊 Size: 1078612 bytes
```

### Why This Matters

**Before Fix:**
- COA uploads fail with version mismatch errors
- Batch compliance workflows blocked
- Packaging sessions cannot proceed
- Manual intervention required after every npm install

**After Fix:**
- COA uploads work reliably
- Version sync is automatic and transparent
- Zero manual intervention required
- New developers onboard without issues
- CI/CD pipelines work correctly

### Version Lock Rationale

**Why lock to exact version:**
1. **Predictability** - Same version across all environments
2. **Stability** - Avoid unexpected breaking changes
3. **Simplicity** - Easier to troubleshoot when versions don't change
4. **Security** - Controlled, deliberate upgrades only

**When to upgrade:**
- Security patches (check npm audit)
- Bug fixes affecting COA functionality
- New features needed for PDF processing
- Regular maintenance (quarterly review)

---

## Migration Procedures

### Migration File Structure

All migrations are stored in `/supabase/migrations/` with timestamp-based naming:

```
YYYYMMDDHHMMSS_descriptive_migration_name.sql
```

### Migration Batches

For complex schema changes, migrations are organized into batches:

```
/supabase/migrations/
  batch1_critical_integrity_fixes/
    20251107000001_backfill_inventory_batch_ids.sql
    20251107000002_add_batch_id_constraints.sql
    README.md
    DELIVERABLES.md
    rollback_batch1.sql
```

### Migration Deployment Workflow

**1. Development Phase**
- Write migration SQL with comprehensive comments
- Include rollback script for batch migrations
- Test locally or against development database
- Document changes in migration README

**2. Verification Phase**
- Create verification script (verify_batchN_all.sql)
- Test against staging database
- Validate all checks pass
- Document expected results

**3. Staging Deployment**
- Deploy to staging environment
- Run verification script
- Monitor for 48 hours minimum
- Collect performance metrics

**4. Production Deployment**
- Schedule maintenance window if required
- Create database backup
- Deploy migration
- Run verification script immediately
- Monitor for anomalies

**5. Post-Deployment**
- Regenerate database.types.ts
- Run full test suite
- Update documentation with deployment date
- Mark gaps as resolved in DOCS-INTEGRATION-PROGRESS.md

### Rollback Procedures

**For Single Migrations:**
- Supabase tracks applied migrations automatically
- Manual rollback requires reverting changes via SQL

**For Batch Migrations:**
- Use provided rollback_batchN.sql script
- Test rollback script in staging first
- Document rollback execution in CHANGELOG
- Regenerate types after rollback

**When to Rollback:**
- Critical errors in production
- Data integrity issues detected
- Verification script failures
- Performance degradation beyond acceptable thresholds

---

## Testing Protocols

### Overview

The testing strategy follows a multi-layered approach:
1. **Type Checking** - Compile-time validation
2. **Unit Testing** - Component/function isolation
3. **Integration Testing** - Database and API interaction
4. **Manual Testing** - User workflow validation
5. **Migration Testing** - Database schema changes

---

### TypeScript Type Checking

**Command:**
```bash
npm run typecheck
```

**Purpose:**
- Validates TypeScript compilation without emitting files
- Catches type mismatches between code and database
- Ensures database.types.ts is current

**When to Run:**
- After regenerating database types
- Before committing code changes
- As part of CI/CD pipeline
- Before deployment to staging/production

**Success Criteria:**
- Zero TypeScript errors (or documented exceptions)
- All database queries use typed Supabase client
- No `any` types in database-related code

**Example Output:**
```
$ npm run typecheck
> typecheck
> tsc --noEmit -p tsconfig.app.json

✓ No errors found
```

**Common Issues:**
- High error count (44+ errors): Types outdated, run `npm run types:generate`
- Module not found: Check import paths and database.types.ts existence
- Type mismatch: Check if database schema changed, regenerate types

---

### Unit Testing

**Framework:** Vitest with Testing Library
**Location:** `src/__tests__/` and `src/features/*/tests/`

**Commands:**
```bash
# Watch mode (development)
npm run test

# Single run (CI/CD)
npm run test:run

# With coverage report
npm run test:coverage

# With UI dashboard
npm run test:ui

# Specific file
npm run test src/features/products/__tests__/products.test.ts
```

**Test Structure:**
```typescript
// src/features/products/__tests__/products.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productsService } from '../services/products.service';

describe('productsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all products', async () => {
      const { data, error } = await productsService.getAll();
      expect(error).toBeNull();
      expect(data).toBeInstanceOf(Array);
    });

    it('should filter archived products', async () => {
      const { data } = await productsService.getAll();
      const archivedCount = data?.filter(p => p.is_archived).length || 0;
      expect(archivedCount).toBe(0);
    });
  });

  describe('create', () => {
    it('should create product with valid input', async () => {
      const input = {
        name: 'Test Product',
        strain_id: 'uuid-here',
        product_type_id: 'uuid-here',
      };
      const { data, error } = await productsService.create(input);
      expect(error).toBeNull();
      expect(data).toHaveProperty('id');
    });

    it('should fail with invalid input', async () => {
      const input = { name: '' }; // Missing required fields
      const { error } = await productsService.create(input as any);
      expect(error).not.toBeNull();
    });
  });
});
```

**Coverage Requirements:**

| Component Type | Minimum Coverage | Target |
|---------------|------------------|--------|
| Services | 80% | 90%+ |
| Utilities | 90% | 100% |
| Critical Business Logic | 95% | 100% |
| UI Components | 60% | 80% |
| Type Utilities | 100% | 100% |

**What to Test:**

✅ **Do Test:**
- Service functions (CRUD operations)
- Data transformation utilities
- Business logic calculations
- Error handling paths
- Edge cases and boundary conditions

❌ **Don't Test:**
- UI rendering (focus on logic)
- Third-party libraries
- Trivial getters/setters
- Type definitions themselves

**Best Practices:**
1. **Arrange-Act-Assert** pattern
2. **One assertion per test** (ideally)
3. **Descriptive test names** (should read like documentation)
4. **Mock external dependencies** (database, APIs)
5. **Test both success and failure paths**

---

### Integration Testing

Integration tests validate interactions between components, database, and external services.

**Database Integration Testing:**

```typescript
// Example: Testing with real Supabase connection
import { supabase } from '@/lib/supabase';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Customer Integration', () => {
  let testCustomerId: string;

  beforeEach(async () => {
    // Create test data
    const { data } = await supabase
      .from('customers')
      .insert({ name: 'Test Customer', dispensary_code: 'TEST' })
      .select()
      .single();
    testCustomerId = data.id;
  });

  afterEach(async () => {
    // Clean up test data
    await supabase
      .from('customers')
      .delete()
      .eq('id', testCustomerId);
  });

  it('should create customer and retrieve it', async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('id', testCustomerId)
      .maybeSingle();

    expect(data).not.toBeNull();
    expect(data.name).toBe('Test Customer');
  });
});
```

**RLS Policy Testing:**

```sql
-- Test RLS policies directly in Supabase SQL Editor

-- 1. Test authenticated access
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-id-here"}';

SELECT * FROM customers WHERE id = 'test-customer-id';
-- Should return the customer

-- 2. Test unauthenticated access
RESET ALL;
SET LOCAL role TO anon;

SELECT * FROM customers WHERE id = 'test-customer-id';
-- Should return nothing (RLS blocks)

-- 3. Test cross-user access
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "different-user-id"}';

SELECT * FROM orders WHERE customer_id = 'test-customer-id';
-- Should only return orders this user is allowed to see
```

**Migration Testing Workflow:**

```bash
# 1. Test migration on staging database
# Apply migration to staging
supabase db push --db-url "$STAGING_DB_URL"

# 2. Run verification script
psql "$STAGING_DB_URL" -f verification/verify_batch1_all.sql

# 3. Check for errors
# - Review verification output
# - Check for constraint violations
# - Validate data integrity

# 4. Test rollback
# Apply rollback script
psql "$STAGING_DB_URL" -f verification/rollback_batch1.sql

# 5. Reapply migration
supabase db push --db-url "$STAGING_DB_URL"

# 6. Monitor for 48 hours minimum before production
```

**Performance Testing:**

```sql
-- Benchmark critical queries
EXPLAIN ANALYZE
SELECT * FROM inventory_items
WHERE batch_id = 'test-batch-id'
ORDER BY created_at DESC;

-- Expected: Index scan, < 10ms execution time
-- If table scan or > 50ms: Add index or optimize query
```

---

### Manual Testing Checklist

**Before Release:**

**1. Type Generation ✓**
- [ ] Run `npm run types:generate`
- [ ] Verify new tables/columns appear in database.types.ts
- [ ] Confirm TypeScript errors drop significantly
- [ ] Restart dev server to clear cache

**2. Build Verification ✓**
- [ ] Run `npm run build`
- [ ] Verify no errors
- [ ] Check build output size (should be < 3MB gzipped)
- [ ] Test production build with `npm run preview`

**3. Critical User Flows ✓**
- [ ] Create new order → Verify order number generated
- [ ] Add products to order → Verify pricing calculated
- [ ] Submit order → Verify status changes
- [ ] Create trim session → Verify inventory deduction
- [ ] Upload COA → Verify batch linkage
- [ ] Generate manifest → Verify compliance data

**4. Database Integrity ✓**
- [ ] Check for orphaned records (orders without customers, etc.)
- [ ] Verify foreign key constraints active
- [ ] Test RLS policies (try accessing data you shouldn't)
- [ ] Confirm triggers are firing (check audit logs)

**5. Edge Cases ✓**
- [ ] Empty states (no data in tables)
- [ ] Large datasets (1000+ records)
- [ ] Concurrent operations (multiple users)
- [ ] Network failures (offline behavior)

---

### Test Data Management

**Creating Test Data:**

```typescript
// scripts/create-test-data.ts
import { supabase } from './lib/supabase';

async function createTestData() {
  // 1. Create test strain
  const { data: strain } = await supabase
    .from('strains')
    .insert({ name: 'Test Strain', abbreviation: 'TST' })
    .select()
    .single();

  // 2. Create test batch
  const { data: batch } = await supabase
    .from('batch_registry')
    .insert({
      batch_number: '251110-TST',
      strain_id: strain.id,
      harvest_date: '2025-11-10',
    })
    .select()
    .single();

  // 3. Create test inventory
  await supabase
    .from('inventory_items')
    .insert({
      batch_id: batch.id,
      product_stage_id: 'bulk-available-id',
      quantity: 1000,
      unit: 'gram',
    });

  console.log('Test data created successfully');
}
```

**Cleaning Test Data:**

```sql
-- Delete test data (use with caution!)
DELETE FROM inventory_items WHERE batch_id IN (
  SELECT id FROM batch_registry WHERE batch_number LIKE '%-TST'
);

DELETE FROM batch_registry WHERE batch_number LIKE '%-TST';
DELETE FROM strains WHERE abbreviation = 'TST';
```

---

### Continuous Testing

**Pre-Commit:**
```bash
# Run before every commit
npm run typecheck && npm run test:run && npm run build
```

**Pre-Push:**
```bash
# More thorough checks before pushing
npm run typecheck
npm run test:coverage
npm run build
# Check coverage report - ensure > 80%
```

**Pre-Deployment:**
```bash
# Final checks before production
npm run types:generate
npm run typecheck
npm run test:run
npm run build
# Run verification scripts on staging
# Monitor staging for 48 hours
```

---

## Verification Scripts

### Purpose

Verification scripts validate database state before and after migrations, ensuring:
- Data integrity is maintained
- Constraints are properly applied
- Expected relationships exist
- Performance is acceptable

### Script Structure

```sql
-- verify_batchN_all.sql

-- Section 1: Pre-Migration Checks
SELECT 'Pre-Migration: Checking current state...' AS status;

-- Test data completeness
SELECT COUNT(*) AS total_items FROM inventory_items;

-- Section 2: Constraint Validation
SELECT 'Validating constraints...' AS status;

-- Check NOT NULL constraints
SELECT COUNT(*) AS null_batch_ids
FROM inventory_items
WHERE batch_id IS NULL;

-- Section 3: Post-Migration Validation
SELECT 'Post-Migration: Verifying changes...' AS status;

-- Validate triggers are active
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Section 4: Results Summary
SELECT 'All checks passed' AS final_status;
```

### Required Tests

**Every Verification Script Must Include:**
1. Data integrity checks (no orphaned records)
2. Constraint validation (NOT NULL, UNIQUE, FK)
3. Trigger existence and activation
4. Function creation and permissions
5. RLS policy application
6. Performance baseline queries

---

## CI/CD Integration

### Automated Checks

**Pre-Commit:**
- Lint SQL migration files
- Validate migration naming convention
- Check for commented-out code

**Pull Request:**
- Run full test suite
- TypeScript type checking
- Check for database.types.ts staleness
- Migration file validation

**Pre-Deployment:**
- Regenerate types from target environment
- Run integration tests
- Execute verification scripts
- Performance benchmarks

### Automated Type Generation (Future)

```yaml
# .github/workflows/regenerate-types.yml
name: Regenerate Database Types
on:
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday
  workflow_dispatch:      # Manual trigger

jobs:
  regenerate-types:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run types:generate
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      - name: Create PR if changes
        # Create PR with regenerated types
```

---

## Known Gaps & Future Improvements

### Current Limitations

1. **Manual type regeneration** - Requires developer to run command
2. **No automated type staleness detection** - Manual process to check if types are outdated
3. **No migration dry-run capability** - Cannot preview migration effects without deployment
4. **Limited rollback automation** - Rollback scripts are manual SQL files
5. **No performance regression testing** - Manual performance validation

### Planned Improvements

1. Add automated type generation to CI/CD
2. Implement migration preview/explain functionality
3. Create automated rollback system with safety checks
4. Add performance regression test suite
5. Build migration dependency graph validator
6. Create type staleness detection in pre-commit hooks

---

## Implementation Status (2025-11-10)

### ✅ Completed
- [x] Supabase CLI installed as devDependency
- [x] Type generation script created (scripts/generate-types.sh)
- [x] package.json script added (`npm run types:generate`)
- [x] Authentication requirements documented
- [x] Migration procedures documented
- [x] **Testing protocols comprehensively enhanced** (NEW - 2025-11-10)
- [x] **Unit testing patterns and examples** (NEW - 2025-11-10)
- [x] **Integration testing workflows** (NEW - 2025-11-10)
- [x] **Manual testing checklists** (NEW - 2025-11-10)
- [x] **Test data management procedures** (NEW - 2025-11-10)
- [x] **Continuous testing workflows** (NEW - 2025-11-10)
- [x] Verification script exists (`verify_batch1_all.sql`)
- [x] Coverage requirements documented
- [x] RLS policy testing procedures

### ⏸️ Pending Manual Step
- [ ] **Obtain Supabase access token** (required by each developer)
- [ ] Run `npm run types:generate` to regenerate types
- [ ] Verify TypeScript errors reduced (44 → <15 expected)

### 📝 Next Actions
1. Each team member obtains their Supabase access token
2. Run type generation: `npm run types:generate`
3. Review changes: `git diff src/lib/database/database.types.ts`
4. Verify compilation: `npm run typecheck`
5. Run test suite: `npm run test`
6. Check coverage: `npm run test:coverage`
7. Commit updated types file

---

## Related Documentation

- **DOCS-INTEGRATION-PROGRESS.md** - Type Generation Strategy section
- **DATASETS.md** - Complete database schema reference
- **SYSTEM-WORKFLOW.md** - System-wide workflow and state machines
- **/supabase/migrations/batch1_critical_integrity_fixes/README.md** - Batch migration example

---

## Version History

| Version | Date | Changes | Updated By |
|---------|------|---------|------------|
| 1.4 | 2025-11-10 | **Comprehensive Testing Enhancement:** Added detailed unit testing patterns with examples, integration testing workflows with RLS policy testing, manual testing checklists, test data management procedures, continuous testing workflows (pre-commit, pre-push, pre-deployment), coverage requirements table, best practices, and test structure examples. Verified verification script exists and is comprehensive. | Claude AI |
| 1.3 | 2025-11-10 | Enhanced type generation documentation with comprehensive troubleshooting (5 scenarios), verification steps (4-step process), impact analysis, and detailed solutions for common issues. Updated confidence from 60% to 85%. | Claude AI |
| 1.2 | 2025-11-09 | Implemented type generation setup, added authentication requirements, created helper script, updated status to Implemented | Claude AI |
| 1.1 | 2025-11-09 | Complete rewrite with type generation strategy, migration procedures, verification scripts, CI/CD integration, and testing protocols | Claude AI |
| 1.0 | 2025-11-06 | Initial template created | Product Team |

---

_This document is part of CULT v1.0 comprehensive documentation set. Status: ✅ Comprehensive (all testing protocols documented, verification scripts exist)._
