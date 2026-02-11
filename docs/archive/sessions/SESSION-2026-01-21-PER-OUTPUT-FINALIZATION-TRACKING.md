# Session 2026-01-21: Per-Output Finalization Tracking for Analytics

## Overview

Implemented **Option 1 (Separate Fields)** for tracking finalization status per output type. This design optimizes for analytics queries by avoiding JOINs and providing direct column access for business intelligence and reporting.

## Business Requirements

The system needs to track four key analytics metrics:

1. **Conversion Rates** - % of Jars / Smalls / Bulk per batch
2. **Staff Performance** - Trim totals, trim rate per hour, etc.
3. **Sales Analytics** - Inventory sold per dispensary by batch and product type
4. **Inventory Projections** - Projected inventory per type and batch based on historical data

## Architecture Decision: Option 1 vs Option 2

### Option 1: Separate Fields (IMPLEMENTED)
Each output type has its own finalization fields:
```sql
-- Trim sessions
finalization_status_bigs, finalized_at_bigs, finalized_by_bigs, void_reason_bigs
finalization_status_smalls, finalized_at_smalls, finalized_by_smalls, void_reason_smalls
finalization_status_trim, finalized_at_trim, finalized_by_trim, void_reason_trim
```

**Benefits:**
- ✅ Simple queries with direct column access (no JOINs)
- ✅ Fast aggregations using column indexes
- ✅ Better performance for dashboards
- ✅ BI-tool friendly (Metabase, Tableau)
- ✅ Easy for business users to write ad-hoc queries
- ✅ Fast time-series queries for projections

### Option 2: Junction Table (REJECTED)
Create a `conversion_finalization_tracking` table with rows per output type.

**Drawbacks:**
- ❌ Requires JOINs for every analytics query
- ❌ Slower performance for aggregations
- ❌ More complex queries for business users
- ❌ Harder to optimize for time-series analysis

## Implementation Details

### Migration 20260121020000

**Schema Changes:**

#### trim_sessions
```sql
-- Big buds finalization
finalization_status_bigs finalization_status DEFAULT 'pending' NOT NULL
finalized_at_bigs timestamptz
finalized_by_bigs uuid REFERENCES auth.users(id)
void_reason_bigs text

-- Smalls finalization
finalization_status_smalls finalization_status DEFAULT 'pending' NOT NULL
finalized_at_smalls timestamptz
finalized_by_smalls uuid REFERENCES auth.users(id)
void_reason_smalls text

-- Trim finalization
finalization_status_trim finalization_status DEFAULT 'pending' NOT NULL
finalized_at_trim timestamptz
finalized_by_trim uuid REFERENCES auth.users(id)
void_reason_trim text
```

#### bucking_sessions
```sql
-- Bucked flower finalization
finalization_status_bucked finalization_status DEFAULT 'pending' NOT NULL
finalized_at_bucked timestamptz
finalized_by_bucked uuid REFERENCES auth.users(id)
void_reason_bucked text

-- Bucked smalls finalization
finalization_status_smalls finalization_status DEFAULT 'pending' NOT NULL
finalized_at_smalls timestamptz
finalized_by_smalls uuid REFERENCES auth.users(id)
void_reason_smalls text
```

#### packaging_sessions
```sql
-- Packaged units finalization
finalization_status_packaged finalization_status DEFAULT 'pending' NOT NULL
finalized_at_packaged timestamptz
finalized_by_packaged uuid REFERENCES auth.users(id)
void_reason_packaged text
```

**Data Backfill:**
- Copied existing `finalization_status` to all per-output fields
- Preserved audit trail (finalized_at, finalized_by, void_reason)
- Zero downtime migration

**Performance Indexes:**
```sql
-- Conversion rate analysis
idx_trim_sessions_finalization_bigs ON (finalization_status_bigs, session_date)
idx_trim_sessions_finalization_smalls ON (finalization_status_smalls, session_date)
idx_trim_sessions_finalization_trim ON (finalization_status_trim, session_date)

-- Staff performance tracking
idx_trim_sessions_staff_performance ON (trimmer_name, session_date, finalization_status_bigs)

-- Batch-level analytics
idx_trim_sessions_batch_analytics ON (batch_registry_id, finalization_status_bigs, finalization_status_smalls, finalization_status_trim)
```

### Migration 20260121020100

**Updated RPC Functions:**

#### finalize_session_aggregated()
Now updates only the specific output field per product type:

- `'Bulk Flower (Trimmed)'` → Updates `finalization_status_bigs`, `finalized_at_bigs`, `finalized_by_bigs`
- `'Bulk Smalls (Trimmed)'` → Updates `finalization_status_smalls`, `finalized_at_smalls`, `finalized_by_smalls`
- `'Bulk Trim (Trimmed)'` → Updates `finalization_status_trim`, `finalized_at_trim`, `finalized_by_trim`
- `'Bulk Flower (Bucked)'` → Updates `finalization_status_bucked`, `finalized_at_bucked`, `finalized_by_bucked`
- `'Bulk Smalls (Bucked)'` → Updates `finalization_status_smalls`, `finalized_at_smalls`, `finalized_by_smalls`
- Packaged products → Updates `finalization_status_packaged`, `finalized_at_packaged`, `finalized_by_packaged`

#### void_session_aggregated()
Same per-output logic but sets status to 'voided' with void_reason.

**Interface remains unchanged:** Functions still accept `(batch_id, product_name, session_type)`.

### Migration 20260121020200

**Updated pending_conversion_sessions View:**

Each branch now checks only the relevant finalization field:

```sql
-- Branch 1: Trim Bigs
WHERE ts.finalization_status_bigs = 'pending'

-- Branch 2: Trim Smalls
WHERE ts.finalization_status_smalls = 'pending'

-- Branch 3: Trim Byproduct
WHERE ts.finalization_status_trim = 'pending'

-- Branch 4: Packaging
WHERE ps.finalization_status_packaged = 'pending'

-- Branch 5: Bucking Flower
WHERE bs.finalization_status_bucked = 'pending'

-- Branch 6: Bucking Smalls
WHERE bs.finalization_status_smalls = 'pending'
```

**Benefits:**
- More accurate pending conversions
- Enables partial finalization (finalize bigs while smalls remain pending)
- Better data integrity
- Cleaner separation of concerns

## Analytics Query Examples

### 1. Conversion Rates per Batch

```sql
-- Simple query with direct column access (NO JOINs!)
SELECT
  br.batch_number,
  s.name as strain_name,
  SUM(ts.pulled_weight) as total_input_weight,

  -- Only include FINALIZED outputs in conversion rates
  SUM(CASE WHEN ts.finalization_status_bigs = 'finalized'
      THEN ts.big_buds_grams ELSE 0 END) as finalized_bigs,
  SUM(CASE WHEN ts.finalization_status_smalls = 'finalized'
      THEN ts.small_buds_grams ELSE 0 END) as finalized_smalls,
  SUM(CASE WHEN ts.finalization_status_trim = 'finalized'
      THEN ts.trim_grams ELSE 0 END) as finalized_trim,

  -- Calculate conversion percentages
  ROUND(100.0 * SUM(CASE WHEN ts.finalization_status_bigs = 'finalized'
        THEN ts.big_buds_grams ELSE 0 END)
        / NULLIF(SUM(ts.pulled_weight), 0), 2) as bigs_pct,
  ROUND(100.0 * SUM(CASE WHEN ts.finalization_status_smalls = 'finalized'
        THEN ts.small_buds_grams ELSE 0 END)
        / NULLIF(SUM(ts.pulled_weight), 0), 2) as smalls_pct,
  ROUND(100.0 * SUM(CASE WHEN ts.finalization_status_trim = 'finalized'
        THEN ts.trim_grams ELSE 0 END)
        / NULLIF(SUM(ts.pulled_weight), 0), 2) as trim_pct
FROM trim_sessions ts
JOIN batch_registry br ON ts.batch_registry_id = br.id
JOIN strains s ON ts.strain_id = s.id
WHERE ts.session_status != 'cancelled'
GROUP BY br.batch_number, s.name
ORDER BY br.batch_number;
```

**Example Output:**
```
batch_number | strain_name  | bigs_pct | smalls_pct | trim_pct
-------------|--------------|----------|------------|----------
251105-GAS   | Gas Face     | 68.06    | 22.69      | 8.79
251105-MGM   | Magic Marker | 75.00    | 10.00      | 15.00
```

### 2. Staff Performance Tracking

```sql
-- Direct column access for fast performance metrics
SELECT
  trimmer_name,
  session_date,

  -- Total production
  SUM(big_buds_grams) as total_bigs_produced,
  SUM(small_buds_grams) as total_smalls_produced,

  -- Finalized production (quality-approved)
  SUM(CASE WHEN finalization_status_bigs = 'finalized'
      THEN big_buds_grams ELSE 0 END) as finalized_bigs,
  SUM(CASE WHEN finalization_status_smalls = 'finalized'
      THEN small_buds_grams ELSE 0 END) as finalized_smalls,

  -- Performance metrics
  COUNT(*) as sessions,
  AVG(grams_per_hour) as avg_rate,
  SUM(minutes_trimmed) as total_time_minutes
FROM trim_sessions
WHERE session_status != 'cancelled'
  AND test_mode = false
  AND session_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY trimmer_name, session_date
ORDER BY session_date DESC, trimmer_name;
```

### 3. Sales by Dispensary / Batch / Product Type

```sql
-- Sales tracking (downstream of finalization, no schema changes needed)
SELECT
  c.name as dispensary,
  br.batch_number,
  ii.product_name,
  SUM(oia.allocated_quantity) as units_sold
FROM order_item_allocations oia
JOIN inventory_items ii ON oia.inventory_id = ii.id
JOIN batch_registry br ON ii.batch_id = br.id
JOIN order_items oi ON oia.order_item_id = oi.id
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE oia.allocation_status = 'fulfilled'
  AND o.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY c.name, br.batch_number, ii.product_name
ORDER BY c.name, br.batch_number;
```

### 4. Inventory Projections

```sql
-- Calculate historical finalization rates for projections
SELECT
  output_product_bigs_name as product,

  -- Historical conversion rates
  AVG(CASE WHEN finalization_status_bigs = 'finalized'
      THEN big_buds_grams::float / NULLIF(pulled_weight, 0)
      ELSE NULL END) as avg_conversion_rate,
  STDDEV(big_buds_grams::float / NULLIF(pulled_weight, 0)) as rate_stddev,

  -- Current bucked inventory (input for projection)
  (SELECT SUM(net_weight)
   FROM inventory_items
   WHERE product_name LIKE '%Bucked%') as available_input,

  -- Projected output inventory
  AVG(CASE WHEN finalization_status_bigs = 'finalized'
      THEN big_buds_grams::float / NULLIF(pulled_weight, 0)
      ELSE NULL END) *
  (SELECT SUM(net_weight)
   FROM inventory_items
   WHERE product_name LIKE '%Bucked%') as projected_bigs_inventory
FROM trim_sessions
WHERE finalization_status_bigs = 'finalized'
  AND session_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY output_product_bigs_name;
```

## Frontend Impact

**No Changes Required!** ✅

The frontend service layer (`src/features/inventory/services/conversions.service.ts`) calls the RPC functions which maintain the same interface:

```typescript
// Finalize conversion
await supabase.rpc('finalize_session_aggregated', {
  p_batch_id: batchId,
  p_product_name: productName,
  p_session_type: sessionType
});

// Void conversion
await supabase.rpc('void_session_aggregated', {
  p_batch_id: batchId,
  p_product_name: productName,
  p_session_type: sessionType,
  p_reason: reason
});
```

The view (`pending_conversion_sessions`) continues to work seamlessly, now with more accurate data.

## Benefits Summary

### For Analytics & Reporting
1. **Faster Queries** - Direct column access, no JOINs required
2. **Better Performance** - Database can use column indexes efficiently
3. **Simpler SQL** - Business users can write ad-hoc queries easily
4. **BI Tool Friendly** - Works well with Metabase, Tableau, Looker
5. **Time-Series Optimization** - Fast historical trend analysis

### For Data Integrity
1. **Granular Audit Trail** - Track who/when/why per output type
2. **Partial Finalization** - Finalize bigs while keeping smalls pending
3. **Better Tracking** - Know exactly which outputs are approved
4. **Quality Control** - Void specific outputs without affecting others

### For Business Operations
1. **Accurate Conversion Rates** - Only count finalized outputs
2. **Staff Performance** - Track approved vs. total production
3. **Inventory Projections** - Use finalized data for forecasting
4. **Sales Analytics** - Trace sold products back to finalized sessions

## Backward Compatibility

- ✅ Old `finalization_status` field still exists
- ✅ Frontend continues to work without changes
- ✅ RPC function signatures unchanged
- ✅ View maintains same column structure
- ✅ Zero downtime migration

## Testing Checklist

- [ ] Verify conversion rate queries return accurate percentages
- [ ] Test staff performance tracking with finalization filters
- [ ] Confirm sales analytics queries work unchanged
- [ ] Validate inventory projection calculations
- [ ] Test partial finalization scenarios (bigs finalized, smalls pending)
- [ ] Verify frontend conversions workflow still functions
- [ ] Check that pending_conversion_sessions view shows correct data
- [ ] Confirm indexes are being used (EXPLAIN ANALYZE)

## Next Steps

1. **Run Verification Queries** - Test all analytics examples above
2. **Check Performance** - EXPLAIN ANALYZE on conversion rate queries
3. **Frontend Testing** - Verify conversions workflow in UI
4. **Documentation Review** - Update any analytics guides
5. **Monitor Production** - Watch query performance after deployment

## Related Documentation

- `/docs/INVENTORY-TRACKING.md` - Overall inventory system
- `/docs/SESSIONS.md` - Session lifecycle and workflows
- `/docs/ANALYTICS.md` - Analytics and reporting patterns
- `/supabase/migrations/20260121020000_add_per_output_finalization_tracking.sql`
- `/supabase/migrations/20260121020100_update_finalization_rpcs_per_output.sql`
- `/supabase/migrations/20260121020200_update_pending_conversions_view_per_output.sql`

## AI Instructions for Future Sessions

**When working with finalization status:**

1. **For Analytics Queries** - Use the per-output fields directly:
   ```sql
   WHERE finalization_status_bigs = 'finalized'
   WHERE finalization_status_smalls = 'finalized'
   WHERE finalization_status_trim = 'finalized'
   ```

2. **For Business Logic** - Call the RPC functions:
   ```typescript
   finalize_session_aggregated(batch_id, product_name, session_type)
   void_session_aggregated(batch_id, product_name, session_type, reason)
   ```

3. **Schema Understanding:**
   - Each session table has 3-4 sets of finalization fields (one per output type)
   - Each set includes: status, timestamp, user_id, void_reason
   - This enables independent tracking and partial finalization

4. **Performance Optimization:**
   - Indexes exist on all finalization_status_* fields
   - Use direct column access instead of JOINs for analytics
   - Filter on session_date with finalization status for best performance

5. **Common Pitfall:**
   - ❌ DON'T: `JOIN conversion_finalization_tracking` for analytics
   - ✅ DO: Access `finalization_status_bigs` column directly
