-- =====================================================
-- Database Cleanup Verification Queries
-- =====================================================
-- Run these queries to verify the cleanup was successful

-- 1. Check deprecated table status
-- Expected: All row_count should be 0
SELECT * FROM deprecated_table_status;

-- 2. Check active inventory tables have data
-- Expected: These should have rows
SELECT
  'inventory_items' as table_name,
  COUNT(*) as row_count,
  'ACTIVE' as status
FROM inventory_items
UNION ALL
SELECT
  'bucked_inventory',
  COUNT(*),
  'ACTIVE'
FROM bucked_inventory
UNION ALL
SELECT
  'bulk_inventory',
  COUNT(*),
  'ACTIVE'
FROM bulk_inventory
UNION ALL
SELECT
  'inventory_changes',
  COUNT(*),
  'ACTIVE'
FROM inventory_changes
UNION ALL
SELECT
  'inventory_snapshots',
  COUNT(*),
  'ACTIVE'
FROM inventory_snapshots;

-- 3. Verify strains table is consolidated
-- Expected: Should have data with abbreviations and conversion ratios
SELECT
  COUNT(*) as total_strains,
  COUNT(abbreviation) as strains_with_abbreviation,
  COUNT(avg_bucked_to_flower_ratio) as strains_with_ratios
FROM strains;

-- 4. Check for any data in strain_metadata (deprecated)
-- Expected: May have data (not deleted yet, just deprecated)
SELECT COUNT(*) as strain_metadata_rows FROM strain_metadata;

-- 5. List all table comments to see ACTIVE vs DEPRECATED status
SELECT
  schemaname,
  tablename,
  obj_description((schemaname||'.'||tablename)::regclass, 'pg_class') as comment
FROM pg_tables
WHERE schemaname = 'public'
  AND (
    obj_description((schemaname||'.'||tablename)::regclass, 'pg_class') LIKE '%ACTIVE%'
    OR obj_description((schemaname||'.'||tablename)::regclass, 'pg_class') LIKE '%DEPRECATED%'
  )
ORDER BY
  CASE
    WHEN obj_description((schemaname||'.'||tablename)::regclass, 'pg_class') LIKE '%ACTIVE%' THEN 1
    ELSE 2
  END,
  tablename;

-- 6. Check migration history
-- Expected: Should see our new migrations at the top
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;

-- 7. Test strain lookup functions
-- Expected: Should return strain info
SELECT * FROM find_strain_by_name('Blue Dream');
SELECT get_strain_abbreviation('Blue Dream');
SELECT get_strain_abbreviation('Unknown Strain'); -- Should auto-generate

-- 8. Test package ID generation with locking
-- Expected: Should return sequential IDs without duplicates
SELECT generate_consolidated_package_id(CURRENT_DATE, 'TST');
SELECT generate_consolidated_package_id(CURRENT_DATE, 'TST');
SELECT generate_consolidated_package_id(CURRENT_DATE, 'TST');

-- 9. Validate strain names from a test array
-- Expected: Should show match quality for each strain
SELECT * FROM validate_strain_names(ARRAY['Blue Dream', 'Unknown Strain', 'OG Kush']);

-- 10. Check for duplicate package IDs in consolidated_packages
-- Expected: Should return 0 rows
SELECT
  package_id,
  COUNT(*) as duplicate_count
FROM consolidated_packages
GROUP BY package_id
HAVING COUNT(*) > 1;

-- 11. Check for duplicate package IDs in labels
-- Expected: Should return 0 rows
SELECT
  package_id,
  COUNT(*) as duplicate_count
FROM labels
GROUP BY package_id
HAVING COUNT(*) > 1;

-- =====================================================
-- Summary Report
-- =====================================================

-- Generate comprehensive summary
SELECT
  '=== DATABASE CLEANUP VERIFICATION SUMMARY ===' as report_section
UNION ALL
SELECT ''
UNION ALL
SELECT '1. Deprecated Tables Status:'
UNION ALL
SELECT '   ' || table_name || ': ' || row_count || ' rows'
FROM deprecated_table_status
UNION ALL
SELECT ''
UNION ALL
SELECT '2. Active Inventory Tables:'
UNION ALL
SELECT '   inventory_items: ' || (SELECT COUNT(*)::text FROM inventory_items) || ' rows'
UNION ALL
SELECT '   bucked_inventory: ' || (SELECT COUNT(*)::text FROM bucked_inventory) || ' rows'
UNION ALL
SELECT '   bulk_inventory: ' || (SELECT COUNT(*)::text FROM bulk_inventory) || ' rows'
UNION ALL
SELECT ''
UNION ALL
SELECT '3. Strain System:'
UNION ALL
SELECT '   strains table: ' || (SELECT COUNT(*)::text FROM strains) || ' strains'
UNION ALL
SELECT '   strain_metadata (deprecated): ' || (SELECT COUNT(*)::text FROM strain_metadata) || ' rows'
UNION ALL
SELECT ''
UNION ALL
SELECT '4. Latest Migrations:'
UNION ALL
SELECT '   ' || version || ' - ' || name
FROM (
  SELECT version, name
  FROM supabase_migrations.schema_migrations
  ORDER BY version DESC
  LIMIT 5
) recent_migrations;
