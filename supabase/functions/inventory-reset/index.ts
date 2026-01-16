import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get CSV data from request body
    const { csvData } = await req.json();

    if (!csvData) {
      return new Response(
        JSON.stringify({ error: "CSV data is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Parse CSV
    const lines = csvData.trim().split('\n');
    const inventoryRows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      inventoryRows.push({
        package_id: values[0],
        product_name: values[1],
        category: values[2],
        strain: values[3],
        batch_number: values[4],
        available_qty: parseFloat(values[5]),
        unit: values[6],
        room: values[7],
        status: values[8],
        tags: values[9] || '',
      });
    }

    // Extract unique batches
    const uniqueBatches = [...new Set(inventoryRows.map((r: any) => r.batch_number).filter((b: string) => b))];

    // Check existing batches
    const { data: existingBatches } = await supabaseAdmin
      .from('batch_registry')
      .select('id, batch_number, strain')
      .in('batch_number', uniqueBatches);

    const existingBatchNumbers = new Set(existingBatches?.map((b: any) => b.batch_number) || []);
    const missingBatches = uniqueBatches.filter((b: string) => !existingBatchNumbers.has(b));

    // Create missing batches
    if (missingBatches.length > 0) {
      const { data: strains } = await supabaseAdmin
        .from('strains')
        .select('id, name');

      const strainMap = new Map(strains?.map((s: any) => [s.name.toLowerCase(), s.id]) || []);

      for (const batchNumber of missingBatches) {
        const batchItems = inventoryRows.filter((r: any) => r.batch_number === batchNumber);
        if (batchItems.length === 0) continue;

        const strainName = batchItems[0].strain;
        const totalWeight = batchItems.reduce((sum: number, item: any) => sum + item.available_qty, 0);

        // Parse harvest date from batch number
        let harvestDate = null;
        const batchPrefix = batchNumber.substring(0, 6);
        if (/^\d{6}$/.test(batchPrefix)) {
          const year = parseInt('20' + batchPrefix.substring(0, 2));
          const month = parseInt(batchPrefix.substring(2, 4));
          const day = parseInt(batchPrefix.substring(4, 6));
          harvestDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }

        await supabaseAdmin
          .from('batch_registry')
          .insert({
            batch_number: batchNumber,
            strain: strainName,
            harvest_date: harvestDate,
            initial_weight_grams: totalWeight,
            lifecycle_state: 'binned',
            status: 'active',
            notes: `Auto-created from CSV import - ${batchItems.length} items totaling ${totalWeight.toFixed(1)}g`
          });
      }
    }

    // Reload all batches
    const { data: allBatches } = await supabaseAdmin
      .from('batch_registry')
      .select('id, batch_number')
      .in('batch_number', uniqueBatches);

    const batchMap = new Map(allBatches?.map((b: any) => [b.batch_number, b.id]) || []);

    // Get product stages
    const { data: stages } = await supabaseAdmin
      .from('product_stages')
      .select('id, name');

    const stageMap = new Map(stages?.map((s: any) => [s.name, s.id]) || []);

    // Clear existing inventory
    await supabaseAdmin.from('inventory_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Create snapshot
    const { data: snapshot } = await supabaseAdmin
      .from('inventory_snapshots')
      .insert({
        snapshot_type: 'full_reset',
        source: 'consolidated_csv',
        notes: 'Full inventory reset from consolidated CSV - Event-driven system initialization',
        created_by: 'system',
        status: 'completed'
      })
      .select()
      .single();

    // Map stage names
    function mapProductNameToStage(productName: string): string | null {
      const name = productName.toLowerCase();

      if (name.includes('packaged 3.5g') || name.includes('packaged 3_5g')) return 'Packaged_3_5g';
      if (name.includes('packaged 14g')) return 'Packaged_14gSmalls';
      if (name.includes('binned')) return 'Binned';
      if (name.includes('bucked') && name.includes('small')) return 'BuckedSmalls';
      if (name.includes('bucked') && name.includes('flower')) return 'BuckedFlower';
      if (name.includes('bulk') && name.includes('small')) return 'BulkSmalls';
      if (name.includes('bulk') && name.includes('flower')) return 'BulkFlower';
      if (name.includes('trim')) return 'Trim';

      return null;
    }

    // Insert inventory items
    const itemsToInsert = inventoryRows.map((row: any) => {
      const batchId = batchMap.get(row.batch_number);
      const stageName = mapProductNameToStage(row.product_name);
      const stageId = stageName ? stageMap.get(stageName) : null;

      return {
        package_id: row.package_id,
        product_name: row.product_name,
        batch: row.batch_number,
        batch_id: batchId,
        product_stage_id: stageId,
        strain: row.strain,
        status: row.status || 'Available',
        category: row.category,
        tags: row.tags,
        room: row.room,
        available_qty: row.available_qty,
        unit: row.unit,
        on_hand_qty: row.available_qty,
        snapshot_id: snapshot.id,
        last_updated: new Date().toISOString(),
      };
    });

    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < itemsToInsert.length; i += batchSize) {
      const batch = itemsToInsert.slice(i, i + batchSize);
      await supabaseAdmin.from('inventory_items').insert(batch);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Inventory reset completed successfully',
        stats: {
          batchesCreated: missingBatches.length,
          itemsImported: itemsToInsert.length,
          snapshotId: snapshot.id
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
