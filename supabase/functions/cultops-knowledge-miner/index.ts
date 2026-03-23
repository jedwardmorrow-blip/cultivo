import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ============================================================
// cultops-knowledge-miner v1
// Periodic strain intelligence accumulation.
// Mines completed trim/bucking/packaging sessions from last 6 hours,
// extracts strain signals, logs to strain_intelligence_log,
// and writes anomalies (>20% deviation) to context DB business_context.
// Schedule: pg_cron every 6 hours
// ============================================================

const LOOKBACK_HOURS = 6;

function getProductionClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function getContextClient() {
  const contextUrl = Deno.env.get("CONTEXT_DB_URL");
  const contextKey = Deno.env.get("CONTEXT_DB_SERVICE_KEY");
  if (!contextUrl || !contextKey) return null;
  return createClient(contextUrl, contextKey);
}

interface Signal {
  strain_name: string;
  strain_id: string | null;
  session_type: string;
  metric_name: string;
  metric_value: number;
  session_id: string;
  session_date: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
  }

  const startTime = Date.now();
  const prodClient = getProductionClient();
  const contextClient = getContextClient();
  const cutoff = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const signals: Signal[] = [];
  const errors: string[] = [];

  console.log(`[knowledge-miner v1] Starting mining run. Cutoff: ${cutoff}`);

  // ============================================================
  // MINE TRIM SESSIONS
  // ============================================================
  try {
    const { data: trimSessions } = await prodClient
      .from("trim_sessions")
      .select("id, strain, strain_id, session_date, big_buds_grams, pulled_weight, grams_per_hour, waste_grams, small_buds_grams, trim_grams")
      .gte("completed_at", cutoff)
      .eq("session_status", "completed")
      .gt("pulled_weight", 0);

    for (const s of (trimSessions || [])) {
      const bigBudPct = s.pulled_weight > 0 ? (s.big_buds_grams / s.pulled_weight) * 100 : null;
      const wastePct = s.pulled_weight > 0 ? ((s.waste_grams || 0) / s.pulled_weight) * 100 : null;
      const smallBudPct = s.pulled_weight > 0 ? ((s.small_buds_grams || 0) / s.pulled_weight) * 100 : null;

      if (bigBudPct !== null) {
        signals.push({ strain_name: s.strain, strain_id: s.strain_id, session_type: "trim", metric_name: "big_bud_pct", metric_value: Math.round(bigBudPct * 10) / 10, session_id: s.id, session_date: s.session_date });
      }
      if (s.grams_per_hour) {
        signals.push({ strain_name: s.strain, strain_id: s.strain_id, session_type: "trim", metric_name: "throughput_g_hr", metric_value: Math.round(s.grams_per_hour * 10) / 10, session_id: s.id, session_date: s.session_date });
      }
      if (wastePct !== null) {
        signals.push({ strain_name: s.strain, strain_id: s.strain_id, session_type: "trim", metric_name: "waste_pct", metric_value: Math.round(wastePct * 10) / 10, session_id: s.id, session_date: s.session_date });
      }
      if (smallBudPct !== null) {
        signals.push({ strain_name: s.strain, strain_id: s.strain_id, session_type: "trim", metric_name: "small_bud_pct", metric_value: Math.round(smallBudPct * 10) / 10, session_id: s.id, session_date: s.session_date });
      }
    }
    console.log(`[knowledge-miner] Mined ${trimSessions?.length || 0} trim sessions → ${signals.length} signals`);
  } catch (e) { errors.push(`trim: ${e}`); }

  // ============================================================
  // MINE BUCKING SESSIONS
  // ============================================================
  const buckingSignalStart = signals.length;
  try {
    const { data: buckingSessions } = await prodClient
      .from("bucking_sessions")
      .select("id, strain, session_date, kg_per_hour")
      .gte("completed_at", cutoff)
      .eq("session_status", "completed");

    for (const s of (buckingSessions || [])) {
      if (s.kg_per_hour) {
        signals.push({ strain_name: s.strain, strain_id: null, session_type: "bucking", metric_name: "bucking_kg_hr", metric_value: Math.round(s.kg_per_hour * 100) / 100, session_id: s.id, session_date: s.session_date });
      }
    }
    console.log(`[knowledge-miner] Mined ${buckingSessions?.length || 0} bucking sessions → ${signals.length - buckingSignalStart} signals`);
  } catch (e) { errors.push(`bucking: ${e}`); }

  // ============================================================
  // MINE PACKAGING SESSIONS
  // ============================================================
  const packagingSignalStart = signals.length;
  try {
    const { data: packagingSessions } = await prodClient
      .from("packaging_sessions")
      .select("id, strain, strain_id, session_date, units_per_hour")
      .gte("completed_at", cutoff)
      .eq("session_status", "completed");

    for (const s of (packagingSessions || [])) {
      if (s.units_per_hour) {
        signals.push({ strain_name: s.strain, strain_id: s.strain_id, session_type: "packaging", metric_name: "units_per_hr", metric_value: Math.round(s.units_per_hour * 10) / 10, session_id: s.id, session_date: s.session_date });
      }
    }
    console.log(`[knowledge-miner] Mined ${packagingSessions?.length || 0} packaging sessions → ${signals.length - packagingSignalStart} signals`);
  } catch (e) { errors.push(`packaging: ${e}`); }

  // ============================================================
  // MINE HARVEST SESSIONS (join through batch_registry → strains)
  // ============================================================
  const harvestSignalStart = signals.length;
  try {
    const { data: harvestSessions } = await prodClient
      .from("harvest_sessions")
      .select("id, harvest_date, wet_weight_grams, waste_grams, plant_count_harvested, batch_registry_id, batch_registry!inner(strain_id, strains!inner(name))")
      .gte("completed_at", cutoff)
      .eq("session_status", "completed");

    for (const s of (harvestSessions || [])) {
      const strainName = (s as any).batch_registry?.strains?.name;
      const strainId = (s as any).batch_registry?.strain_id;
      if (!strainName) continue;

      if (s.wet_weight_grams && s.wet_weight_grams > 0) {
        signals.push({ strain_name: strainName, strain_id: strainId, session_type: "harvest", metric_name: "wet_weight_g", metric_value: Math.round(s.wet_weight_grams), session_id: s.id, session_date: s.harvest_date });
      }
      if (s.wet_weight_grams && s.plant_count_harvested && s.plant_count_harvested > 0) {
        const gPerPlant = s.wet_weight_grams / s.plant_count_harvested;
        signals.push({ strain_name: strainName, strain_id: strainId, session_type: "harvest", metric_name: "g_per_plant", metric_value: Math.round(gPerPlant), session_id: s.id, session_date: s.harvest_date });
      }
      if (s.waste_grams && s.wet_weight_grams && s.wet_weight_grams > 0) {
        const harvestWastePct = (s.waste_grams / s.wet_weight_grams) * 100;
        signals.push({ strain_name: strainName, strain_id: strainId, session_type: "harvest", metric_name: "harvest_waste_pct", metric_value: Math.round(harvestWastePct * 10) / 10, session_id: s.id, session_date: s.harvest_date });
      }
    }
    console.log(`[knowledge-miner] Mined ${harvestSessions?.length || 0} harvest sessions → ${signals.length - harvestSignalStart} signals`);
  } catch (e) { errors.push(`harvest: ${e}`); }

  if (signals.length === 0) {
    console.log(`[knowledge-miner] No new signals found. Done in ${Date.now() - startTime}ms.`);
    return new Response(JSON.stringify({ status: "no_new_signals", errors }), { headers: { "Content-Type": "application/json" } });
  }

  // ============================================================
  // INSERT SIGNALS TO strain_intelligence_log (ON CONFLICT DO NOTHING)
  // ============================================================
  let insertedCount = 0;
  try {
    const rows = signals.map(s => ({
      strain_name: s.strain_name,
      strain_id: s.strain_id,
      session_type: s.session_type,
      metric_name: s.metric_name,
      metric_value: s.metric_value,
      session_id: s.session_id,
      session_date: s.session_date,
      is_anomalous: false,
      deviation_pct: null,
      historical_avg: null,
      notes: null,
    }));

    const { data: inserted, error } = await prodClient
      .from("strain_intelligence_log")
      .upsert(rows, { onConflict: "session_id,metric_name", ignoreDuplicates: true })
      .select("id");

    if (error) {
      console.error(`[knowledge-miner] Insert error: ${error.message}`);
      errors.push(`insert: ${error.message}`);
    } else {
      insertedCount = inserted?.length || 0;
    }
    console.log(`[knowledge-miner] Inserted ${insertedCount} of ${signals.length} signals (dupes skipped)`);
  } catch (e) { errors.push(`insert: ${e}`); }

  // ============================================================
  // ANOMALY DETECTION — compare against v_strain_intelligence averages
  // ============================================================
  let anomalyCount = 0;
  try {
    const { data: strainAvgs } = await prodClient
      .from("v_strain_intelligence")
      .select("strain_name, avg_big_bud_pct, avg_waste_pct, avg_trim_g_per_hr, avg_bucking_kg_per_hr, avg_units_per_hr");

    if (strainAvgs) {
      const avgMap = new Map<string, any>();
      for (const sa of strainAvgs) avgMap.set(sa.strain_name, sa);

      const metricToAvgField: Record<string, string> = {
        big_bud_pct: "avg_big_bud_pct",
        waste_pct: "avg_waste_pct",
        throughput_g_hr: "avg_trim_g_per_hr",
        bucking_kg_hr: "avg_bucking_kg_per_hr",
        units_per_hr: "avg_units_per_hr",
      };

      const anomalies: any[] = [];
      for (const sig of signals) {
        const avgField = metricToAvgField[sig.metric_name];
        if (!avgField) continue;
        const strainData = avgMap.get(sig.strain_name);
        if (!strainData) continue;
        const avg = parseFloat(strainData[avgField]);
        if (!avg || avg === 0) continue;

        const deviationPct = Math.abs(sig.metric_value - avg) / avg * 100;
        if (deviationPct > 20) {
          anomalies.push({
            ...sig,
            deviation_pct: Math.round(deviationPct),
            historical_avg: Math.round(avg * 10) / 10,
          });
        }
      }

      // Update anomaly flags in strain_intelligence_log
      for (const a of anomalies) {
        await prodClient
          .from("strain_intelligence_log")
          .update({
            is_anomalous: true,
            deviation_pct: a.deviation_pct,
            historical_avg: a.historical_avg,
            notes: `${a.metric_name}: ${a.metric_value} vs avg ${a.historical_avg} (${a.deviation_pct}% deviation)`,
          })
          .eq("session_id", a.session_id)
          .eq("metric_name", a.metric_name);
      }
      anomalyCount = anomalies.length;

      // Write anomalies to context DB business_context
      if (contextClient && anomalies.length > 0) {
        const today = new Date().toISOString().split("T")[0].replace(/-/g, "_");
        for (const a of anomalies) {
          const key = `strain_signal_${a.strain_name.toLowerCase().replace(/\s+/g, "_")}_${today}`;
          const direction = a.metric_value > a.historical_avg ? "above" : "below";
          const value = `Anomaly detected: ${a.strain_name} ${a.metric_name} was ${a.metric_value} on ${a.session_date}, ${a.deviation_pct}% ${direction} the historical average of ${a.historical_avg}. Session type: ${a.session_type}. This may indicate a quality shift, measurement variance, or process change worth investigating.`;

          await contextClient
            .from("business_context")
            .upsert({
              category: "cultivation",
              key,
              value,
              metadata: {
                source: "knowledge-miner",
                strain: a.strain_name,
                metric: a.metric_name,
                actual: a.metric_value,
                avg: a.historical_avg,
                deviation_pct: a.deviation_pct,
                session_date: a.session_date,
              },
            }, { onConflict: "key" });
        }
        console.log(`[knowledge-miner] Wrote ${anomalies.length} anomalies to context DB`);
      }
    }
  } catch (e) { errors.push(`anomaly: ${e}`); }

  const duration = Date.now() - startTime;
  console.log(`[knowledge-miner v1] Done in ${duration}ms. Signals: ${signals.length}, Inserted: ${insertedCount}, Anomalies: ${anomalyCount}, Errors: ${errors.length}`);

  return new Response(JSON.stringify({
    status: "complete",
    signals_mined: signals.length,
    signals_inserted: insertedCount,
    anomalies_detected: anomalyCount,
    errors,
    duration_ms: duration,
  }), { headers: { "Content-Type": "application/json" } });
});
