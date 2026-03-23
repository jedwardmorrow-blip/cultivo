import { useState, useMemo, useRef, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTION PLANNER v2 — Cultivation Calendar & Decision Engine
// ═══════════════════════════════════════════════════════════════════════════════
// Three-layer interaction model:
//   1. CALENDAR VIEW — Gantt timeline, rooms on Y-axis, time on X-axis
//   2. ROOM DETAIL CARD — Click room row → strain breakdown, plant counts, capacity
//   3. STRAIN STATS — Click strain from Room Card → full intelligence panel
//
// Cultivation Timeline Reference (from research):
//   Mother prep: 4-8 weeks veg before first clones
//   Clone yield: 10-30 per mother per session
//   Recovery between cuts: 2-3 weeks
//   Clone rooting: 10-21 days
//   Veg stage: 3-5 weeks (commercial indoor)
//   Flower stage: 8-10 weeks (strain-dependent)
//   Dry/cure: 10-14 days
//   Total seed-to-harvest: ~108-130 days

// ─── REAL DATA (mirrors actual DB: grow_rooms, plant_groups, strains) ────────

const ROOMS = [
  { id: "r-mom1", code: "MOM-01", name: "Mother Room", type: "mother", capacity: null, sqft: null },
  { id: "r-veg1", code: "VEG-01", name: "Veg Room 1", type: "veg", capacity: null, sqft: null },
  { id: "r-veg2", code: "VEG-02", name: "Veg Room 02", type: "veg", capacity: null, sqft: null },
  { id: "r-veg3", code: "VEG-03", name: "Veg Room 03", type: "veg", capacity: null, sqft: null },
  { id: "r-flw3", code: "FLW-03", name: "Flower Room 03", type: "flower", capacity: null, sqft: null },
  { id: "r-flw6", code: "FLW-06", name: "Flower Room 06", type: "flower", capacity: null, sqft: null },
  { id: "r-flw7", code: "FLW-07", name: "Flower Room 07", type: "flower", capacity: null, sqft: null },
  { id: "r-flw8", code: "FLW-08", name: "Flower Room 08", type: "flower", capacity: null, sqft: null },
  { id: "r-flw9", code: "FLW-09", name: "Flower Room 09", type: "flower", capacity: null, sqft: null },
  { id: "r-flw10", code: "FLW-10", name: "Flower Room 10", type: "flower", capacity: null, sqft: null },
  { id: "r-flw11", code: "FLW-11", name: "Flower Room 11", type: "flower", capacity: null, sqft: null },
];

// Strains with real production data dimensions
// Fields marked null = no data yet (progressive enrichment)
const STRAINS = {
  "black-maple": { id: "black-maple", name: "Black Maple", type: "Indica-Hybrid", grade: "B",
    flower_days: null, veg_days: null, trim_gph: null, big_bud_pct: null, waste_pct: null,
    thc: null, yield_sqft: null, rosin_yield: null, sessions: 0, harvest_count: 0,
    product_split: null, feed_group: null, flowering_time_class: null,
    cultivation_notes: null },
  "ice-cream-cake": { id: "ice-cream-cake", name: "Ice Cream Cake", type: "Indica-Hybrid", grade: "B",
    flower_days: null, veg_days: null, trim_gph: null, big_bud_pct: null, waste_pct: null,
    thc: null, yield_sqft: null, rosin_yield: null, sessions: 0, harvest_count: 0,
    product_split: null, feed_group: null, flowering_time_class: null,
    cultivation_notes: null },
  "blue-dream": { id: "blue-dream", name: "Blue Dream", type: "Sativa-Hybrid", grade: "B",
    flower_days: 63, veg_days: 28, trim_gph: 180, big_bud_pct: 35.2, waste_pct: 1.2,
    thc: 21.4, yield_sqft: 48, rosin_yield: null, sessions: 8, harvest_count: 2,
    product_split: { flower: 50, smalls: 25, trim: 20, ff: 5 }, feed_group: "standard",
    flowering_time_class: "medium", cultivation_notes: "Vigorous veg growth, stretches in flower" },
  "papaya": { id: "papaya", name: "Papaya", type: "Indica", grade: "B",
    flower_days: 60, veg_days: 26, trim_gph: 145, big_bud_pct: 38.7, waste_pct: 0.9,
    thc: 24.8, yield_sqft: 44, rosin_yield: 3.8, sessions: 12, harvest_count: 3,
    product_split: { flower: 52, smalls: 24, trim: 18, ff: 6 }, feed_group: "heavy",
    flowering_time_class: "medium", cultivation_notes: "Heavy feeder, dense colas" },
  "gg4": { id: "gg4", name: "Gorilla Glue #4", type: "Hybrid", grade: "CULT",
    flower_days: 58, veg_days: 24, trim_gph: 210, big_bud_pct: 42.5, waste_pct: 0.6,
    thc: 28.1, yield_sqft: 52, rosin_yield: 5.2, sessions: 15, harvest_count: 4,
    product_split: { flower: 58, smalls: 20, trim: 15, ff: 7 }, feed_group: "standard",
    flowering_time_class: "fast", cultivation_notes: "Sticky — slows trim. Great rosin candidate." },
  "heavens-order": { id: "heavens-order", name: "Heavens Order", type: "Hybrid", grade: "CULT",
    flower_days: null, veg_days: null, trim_gph: null, big_bud_pct: null, waste_pct: null,
    thc: null, yield_sqft: null, rosin_yield: null, sessions: 0, harvest_count: 0,
    product_split: null, feed_group: null, flowering_time_class: null,
    cultivation_notes: null },
  "fruit-stand": { id: "fruit-stand", name: "Fruit Stand", type: "Hybrid", grade: "B",
    flower_days: null, veg_days: null, trim_gph: null, big_bud_pct: null, waste_pct: null,
    thc: null, yield_sqft: null, rosin_yield: null, sessions: 0, harvest_count: 0,
    product_split: null, feed_group: null, flowering_time_class: null,
    cultivation_notes: null },
  "chile-azul": { id: "chile-azul", name: "Chile Azul", type: "Indica-Hybrid", grade: "CULT",
    flower_days: 62, veg_days: 28, trim_gph: 195, big_bud_pct: 44.1, waste_pct: 0.8,
    thc: 27.3, yield_sqft: 46, rosin_yield: 4.7, sessions: 14, harvest_count: 3,
    product_split: { flower: 56, smalls: 22, trim: 14, ff: 8 }, feed_group: "standard",
    flowering_time_class: "medium", cultivation_notes: "Consistent performer, purple in late flower" },
  "magic-marker": { id: "magic-marker", name: "Magic Marker", type: "Hybrid", grade: "CULT",
    flower_days: 60, veg_days: 26, trim_gph: 165, big_bud_pct: 40.3, waste_pct: 0.7,
    thc: 29.5, yield_sqft: 50, rosin_yield: 5.5, sessions: 11, harvest_count: 2,
    product_split: { flower: 60, smalls: 18, trim: 14, ff: 8 }, feed_group: "standard",
    flowering_time_class: "medium", cultivation_notes: "Top shelf terps, excellent bag appeal" },
  "pbb": { id: "pbb", name: "Peanut Butter Breath", type: "Hybrid", grade: "B",
    flower_days: 63, veg_days: 28, trim_gph: 130, big_bud_pct: 32.8, waste_pct: 1.1,
    thc: 25.6, yield_sqft: 40, rosin_yield: 3.4, sessions: 9, harvest_count: 2,
    product_split: { flower: 48, smalls: 26, trim: 20, ff: 6 }, feed_group: "light",
    flowering_time_class: "medium", cultivation_notes: "Compact structure, needs airflow" },
  "kiwi-melon": { id: "kiwi-melon", name: "Kiwi Melon Smacks", type: "Sativa-Hybrid", grade: "CULT",
    flower_days: 65, veg_days: 30, trim_gph: null, big_bud_pct: null, waste_pct: null,
    thc: null, yield_sqft: null, rosin_yield: null, sessions: 0, harvest_count: 0,
    product_split: null, feed_group: null, flowering_time_class: "long",
    cultivation_notes: "Pheno hunt in progress — FLW-06" },
  "grape-kiwi": { id: "grape-kiwi", name: "Grape Kiwi #5", type: "Indica-Hybrid", grade: "CULT",
    flower_days: null, veg_days: null, trim_gph: null, big_bud_pct: null, waste_pct: null,
    thc: null, yield_sqft: null, rosin_yield: null, sessions: 0, harvest_count: 0,
    product_split: null, feed_group: null, flowering_time_class: null,
    cultivation_notes: "Pheno hunt in progress — FLW-06" },
  "gsc-forum": { id: "gsc-forum", name: "GSC Forum Cut", type: "Hybrid", grade: "CULT",
    flower_days: 60, veg_days: 26, trim_gph: 155, big_bud_pct: 36.9, waste_pct: 0.9,
    thc: 26.7, yield_sqft: 43, rosin_yield: 4.1, sessions: 18, harvest_count: 5,
    product_split: { flower: 54, smalls: 22, trim: 18, ff: 6 }, feed_group: "standard",
    flowering_time_class: "medium", cultivation_notes: "Classic — reliable, consistent quality" },
  "honey-banana": { id: "honey-banana", name: "Honey Banana", type: "Indica-Hybrid", grade: "CULT",
    flower_days: 58, veg_days: 24, trim_gph: 175, big_bud_pct: 41.2, waste_pct: 0.5,
    thc: 30.1, yield_sqft: 47, rosin_yield: 5.0, sessions: 10, harvest_count: 2,
    product_split: { flower: 57, smalls: 20, trim: 15, ff: 8 }, feed_group: "heavy",
    flowering_time_class: "fast", cultivation_notes: "Fast finisher, great hash plant" },
  "gorilla-breath": { id: "gorilla-breath", name: "Gorilla Breath", type: "Indica-Hybrid", grade: "CULT",
    flower_days: 60, veg_days: 26, trim_gph: 140, big_bud_pct: 37.5, waste_pct: 0.8,
    thc: 27.8, yield_sqft: 44, rosin_yield: 4.5, sessions: 8, harvest_count: 2,
    product_split: { flower: 52, smalls: 24, trim: 16, ff: 8 }, feed_group: "standard",
    flowering_time_class: "medium", cultivation_notes: "Resinous, good structure" },
  "hawaiian-snow": { id: "hawaiian-snow", name: "Hawaiian Snowcone", type: "Sativa-Hybrid", grade: "B",
    flower_days: 68, veg_days: 30, trim_gph: 120, big_bud_pct: 28.4, waste_pct: 1.3,
    thc: 22.5, yield_sqft: 38, rosin_yield: null, sessions: 6, harvest_count: 1,
    product_split: { flower: 45, smalls: 28, trim: 22, ff: 5 }, feed_group: "light",
    flowering_time_class: "long", cultivation_notes: "Tall, needs training. Unique terps." },
  "violet-fog": { id: "violet-fog", name: "Violet Fog", type: "Indica-Hybrid", grade: "B",
    flower_days: 63, veg_days: 28, trim_gph: 94, big_bud_pct: 32.1, waste_pct: 0.7,
    thc: null, yield_sqft: 42, rosin_yield: null, sessions: 20, harvest_count: 2,
    product_split: { flower: 50, smalls: 25, trim: 20, ff: 5 }, feed_group: "standard",
    flowering_time_class: "medium", cultivation_notes: null },
  "cap-junky": { id: "cap-junky", name: "Capulator Junky", type: "Hybrid", grade: "CULT",
    flower_days: 60, veg_days: 28, trim_gph: 416, big_bud_pct: 47.1, waste_pct: 0.7,
    thc: 28.4, yield_sqft: 55, rosin_yield: 4.2, sessions: 17, harvest_count: 2,
    product_split: { flower: 60, smalls: 18, trim: 15, ff: 7 }, feed_group: "standard",
    flowering_time_class: "medium", cultivation_notes: "Fast trim, excellent yield" },
  "purple-ice": { id: "purple-ice", name: "Purple Ice Water", type: "Sativa-Hybrid", grade: "CULT",
    flower_days: 65, veg_days: 30, trim_gph: 762, big_bud_pct: 59.4, waste_pct: 0.4,
    thc: 31.2, yield_sqft: 38, rosin_yield: 5.8, sessions: 10, harvest_count: 1,
    product_split: { flower: 65, smalls: 15, trim: 10, ff: 10 }, feed_group: "standard",
    flowering_time_class: "long", cultivation_notes: "Highest big bud %. Premium rosin strain." },
  "swamp-water": { id: "swamp-water", name: "Swamp Water Fumez", type: "Indica-Hybrid", grade: "CULT",
    flower_days: 58, veg_days: 26, trim_gph: null, big_bud_pct: null, waste_pct: null,
    thc: null, yield_sqft: null, rosin_yield: null, sessions: 7, harvest_count: 1,
    product_split: null, feed_group: null, flowering_time_class: "fast",
    cultivation_notes: null },
  "slymer-cookies": { id: "slymer-cookies", name: "Slymer Cookies", type: "Hybrid", grade: "B",
    flower_days: null, veg_days: null, trim_gph: null, big_bud_pct: null, waste_pct: null,
    thc: null, yield_sqft: null, rosin_yield: null, sessions: 0, harvest_count: 0,
    product_split: null, feed_group: null, flowering_time_class: null,
    cultivation_notes: null },
  "zaja-blast": { id: "zaja-blast", name: "Zaja Blast", type: "Hybrid", grade: "B",
    flower_days: null, veg_days: null, trim_gph: null, big_bud_pct: null, waste_pct: null,
    thc: null, yield_sqft: null, rosin_yield: null, sessions: 0, harvest_count: 0,
    product_split: null, feed_group: null, flowering_time_class: null,
    cultivation_notes: null },
  "singapore-sling": { id: "singapore-sling", name: "Singapore Sling", type: "Sativa-Hybrid", grade: "B",
    flower_days: null, veg_days: null, trim_gph: null, big_bud_pct: null, waste_pct: null,
    thc: null, yield_sqft: null, rosin_yield: null, sessions: 0, harvest_count: 0,
    product_split: null, feed_group: null, flowering_time_class: null,
    cultivation_notes: null },
  "bananaconda": { id: "bananaconda", name: "Bananaconda", type: "Indica-Hybrid", grade: "B",
    flower_days: null, veg_days: null, trim_gph: null, big_bud_pct: null, waste_pct: null,
    thc: null, yield_sqft: null, rosin_yield: null, sessions: 0, harvest_count: 0,
    product_split: null, feed_group: null, flowering_time_class: null,
    cultivation_notes: null },
  "dog-walker": { id: "dog-walker", name: "Dog Walker", type: "Hybrid", grade: "B",
    flower_days: null, veg_days: null, trim_gph: null, big_bud_pct: null, waste_pct: null,
    thc: null, yield_sqft: null, rosin_yield: null, sessions: 0, harvest_count: 0,
    product_split: null, feed_group: null, flowering_time_class: null,
    cultivation_notes: null },
};

const today = new Date(2026, 2, 23);

function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function diffDays(a, b) { return Math.round((b - a) / 86400000); }
function fmtDate(d) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }

// Room occupancy data — mirrors real DB query results
const ROOM_STRAINS = {
  "r-mom1": [], // No mothers tracked yet — gap identified
  "r-veg1": [
    { strainId: "black-maple", plants: 70, stage: "veg", planted: "2026-01-15" },
    { strainId: "slymer-cookies", plants: 60, stage: "veg", planted: "2026-01-15" },
    { strainId: "chile-azul", plants: 54, stage: "veg", planted: "2026-01-15" },
    { strainId: "dog-walker", plants: 37, stage: "veg", planted: "2026-01-15" },
    { strainId: "magic-marker", plants: 27, stage: "veg", planted: "2026-01-15" },
  ],
  "r-veg2": [],
  "r-veg3": [],
  "r-flw3": [
    { strainId: "black-maple", plants: 42, stage: "flower", planted: "2026-01-20", harvest: "2026-03-26" },
    { strainId: "ice-cream-cake", plants: 25, stage: "flower", planted: "2026-01-20", harvest: "2026-03-26" },
    { strainId: "blue-dream", plants: 20, stage: "flower", planted: "2026-01-20", harvest: "2026-03-26" },
    { strainId: "papaya", plants: 15, stage: "flower", planted: "2026-01-20", harvest: "2026-03-26" },
    { strainId: "gg4", plants: 15, stage: "flower", planted: "2026-01-20", harvest: "2026-03-26" },
    { strainId: "heavens-order", plants: 14, stage: "flower", planted: "2026-01-20", harvest: "2026-03-26" },
    { strainId: "fruit-stand", plants: 14, stage: "flower", planted: "2026-01-20", harvest: "2026-03-26" },
  ],
  "r-flw6": [
    { strainId: "kiwi-melon", plants: 142, stage: "flower", planted: "2025-12-30", harvest: "2026-04-21" },
    { strainId: "grape-kiwi", plants: 48, stage: "flower", planted: "2025-12-30", harvest: "2026-04-21" },
    { strainId: "gsc-forum", plants: 44, stage: "flower", planted: "2025-12-30", harvest: "2026-04-21" },
    { strainId: "honey-banana", plants: 36, stage: "flower", planted: "2025-12-30", harvest: "2026-04-21" },
  ],
  "r-flw7": [
    { strainId: "chile-azul", plants: 38, stage: "flower", planted: "2025-11-27", harvest: "2026-03-12" },
    { strainId: "magic-marker", plants: 36, stage: "flower", planted: "2025-11-27", harvest: "2026-03-12" },
    { strainId: "pbb", plants: 35, stage: "flower", planted: "2025-11-27", harvest: "2026-03-12" },
    { strainId: "gorilla-breath", plants: 33, stage: "flower", planted: "2025-11-27", harvest: "2026-03-12" },
    { strainId: "hawaiian-snow", plants: 30, stage: "flower", planted: "2025-11-27", harvest: "2026-03-12" },
  ],
  "r-flw8": [
    { strainId: "gorilla-breath", plants: 75, stage: "flower", planted: "2025-12-12", harvest: "2026-03-26" },
    { strainId: "chile-azul", plants: 66, stage: "flower", planted: "2025-12-12", harvest: "2026-03-26" },
    { strainId: "hawaiian-snow", plants: 65, stage: "flower", planted: "2025-12-12", harvest: "2026-03-26" },
    { strainId: "swamp-water", plants: 60, stage: "flower", planted: "2025-12-12", harvest: "2026-03-26" },
    { strainId: "zaja-blast", plants: 33, stage: "flower", planted: "2025-12-12", harvest: "2026-03-26" },
    { strainId: "singapore-sling", plants: 33, stage: "flower", planted: "2025-12-12", harvest: "2026-03-26" },
  ],
  "r-flw9": [
    { strainId: "zaja-blast", plants: 53, stage: "flower", planted: "2026-01-19", harvest: "2026-05-07" },
    { strainId: "cap-junky", plants: 45, stage: "flower", planted: "2026-01-19", harvest: "2026-05-07" },
    { strainId: "singapore-sling", plants: 45, stage: "flower", planted: "2026-01-19", harvest: "2026-05-07" },
    { strainId: "violet-fog", plants: 41, stage: "flower", planted: "2026-01-19", harvest: "2026-05-07" },
    { strainId: "purple-ice", plants: 36, stage: "flower", planted: "2026-01-19", harvest: "2026-05-07" },
    { strainId: "hawaiian-snow", plants: 24, stage: "flower", planted: "2026-01-19", harvest: "2026-05-07" },
    { strainId: "bananaconda", plants: 24, stage: "flower", planted: "2026-01-19", harvest: "2026-05-07" },
  ],
  "r-flw10": [
    { strainId: "black-maple", plants: 65, stage: "flower", planted: "2026-01-26", harvest: "2026-05-14" },
    { strainId: "slymer-cookies", plants: 57, stage: "flower", planted: "2026-01-26", harvest: "2026-05-14" },
    { strainId: "chile-azul", plants: 42, stage: "flower", planted: "2026-01-26", harvest: "2026-05-14" },
    { strainId: "dog-walker", plants: 32, stage: "flower", planted: "2026-01-26", harvest: "2026-05-14" },
    { strainId: "magic-marker", plants: 23, stage: "flower", planted: "2026-01-26", harvest: "2026-05-14" },
  ],
  "r-flw11": [],
};

// Demand signals from PQ
const DEMAND = [
  { strain: "cap-junky", demand_lbs: 8.2, orders: 2, urgency: "normal" },
  { strain: "purple-ice", demand_lbs: 15.7, orders: 5, urgency: "overdue" },
  { strain: "chile-azul", demand_lbs: 12.4, orders: 3, urgency: "urgent" },
  { strain: "gg4", demand_lbs: 6.1, orders: 2, urgency: "soon" },
  { strain: "honey-banana", demand_lbs: 4.3, orders: 1, urgency: "normal" },
  { strain: "magic-marker", demand_lbs: 9.8, orders: 4, urgency: "urgent" },
];

// ─── Colors ──────────────────────────────────────────────────────────────────

const STAGE_COLORS = {
  clone:   { bg: "rgba(168,85,247,0.35)", border: "rgba(168,85,247,0.7)", text: "#c084fc" },
  veg:     { bg: "rgba(34,197,94,0.30)", border: "rgba(34,197,94,0.7)", text: "#4ade80" },
  flower:  { bg: "rgba(251,191,36,0.28)", border: "rgba(251,191,36,0.7)", text: "#fbbf24" },
  harvest: { bg: "rgba(239,68,68,0.25)", border: "rgba(239,68,68,0.65)", text: "#f87171" },
  planned: { bg: "rgba(148,163,184,0.15)", border: "rgba(148,163,184,0.4)", text: "#94a3b8" },
  dry:     { bg: "rgba(180,140,80,0.22)", border: "rgba(180,140,80,0.55)", text: "#d4a855" },
};

const GRADE_COLORS = { CULT: "#22d3ee", B: "#a78bfa", C: "#fb923c", D: "#ef4444" };
const URGENCY_COLORS = { overdue: "#ef4444", urgent: "#f59e0b", soon: "#eab308", normal: "#22c55e" };

const FEED_COLORS = { heavy: "#ef4444", standard: "#22c55e", light: "#60a5fa" };
const FLOWER_CLASS_COLORS = { fast: "#22c55e", medium: "#fbbf24", long: "#f87171" };

// ─── Timeline Constants ──────────────────────────────────────────────────────

const TIMELINE_START = addDays(today, -120);
const TIMELINE_END = addDays(today, 90);
const TOTAL_DAYS = diffDays(TIMELINE_START, TIMELINE_END);
const DAY_WIDTH = 5.2;
function dayToX(date) { return diffDays(TIMELINE_START, date) * DAY_WIDTH; }

// ─── CULTIVATION TIMELINE REFERENCE ──────────────────────────────────────────
const CULT_TIMELINE = {
  mother_prep_weeks: { min: 4, max: 8 },
  clones_per_mother: { min: 10, max: 30 },
  recovery_between_cuts_weeks: { min: 2, max: 3 },
  clone_rooting_days: { min: 10, max: 21 },
  veg_weeks: { min: 3, max: 5 },
  flower_weeks_indica: { min: 8, max: 9 },
  flower_weeks_sativa: { min: 9, max: 12 },
  dry_cure_days: { min: 10, max: 14 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 3: STRAIN STATS — Full Intelligence Panel
// ═══════════════════════════════════════════════════════════════════════════════

function StrainStats({ strain, onClose, onBack }) {
  if (!strain) return null;
  const dem = DEMAND.find(d => d.strain === strain.id);
  const hasData = strain.sessions > 0;
  const splits = strain.product_split;
  const isDefaultSplit = !splits;

  const metrics = [
    { label: "Flower Days", value: strain.flower_days ? `${strain.flower_days}d` : "—", color: "#fbbf24", source: strain.flower_days ? "harvest data" : null },
    { label: "Veg Days", value: strain.veg_days ? `${strain.veg_days}d` : "—", color: "#4ade80", source: strain.veg_days ? "stage tracking" : null },
    { label: "Trim Speed", value: strain.trim_gph ? `${strain.trim_gph} g/hr` : "—", color: strain.trim_gph > 200 ? "#22d3ee" : "#94a3b8", source: strain.trim_gph ? `${strain.sessions} sessions` : null },
    { label: "Big Bud %", value: strain.big_bud_pct != null ? `${strain.big_bud_pct}%` : "—", color: strain.big_bud_pct > 40 ? "#22d3ee" : strain.big_bud_pct > 25 ? "#fbbf24" : "#94a3b8", source: strain.big_bud_pct != null ? "trim sessions" : null },
    { label: "Waste %", value: strain.waste_pct != null ? `${strain.waste_pct}%` : "—", color: strain.waste_pct > 3 ? "#ef4444" : "#4ade80", source: strain.waste_pct != null ? "trim sessions" : null },
    { label: "THC", value: strain.thc ? `${strain.thc}%` : "No COA", color: strain.thc ? "#c084fc" : "#475569", source: strain.thc ? "COA avg" : null },
    { label: "Yield/sqft", value: strain.yield_sqft ? `${strain.yield_sqft}g` : "—", color: "#94a3b8", source: strain.yield_sqft ? "harvest data" : null },
    { label: "Rosin Yield", value: strain.rosin_yield ? `${strain.rosin_yield}%` : "—", color: strain.rosin_yield ? "#22d3ee" : "#475569", source: strain.rosin_yield ? "press runs" : null },
  ];

  return (
    <div style={{
      position: "fixed", right: 0, top: 0, bottom: 0, width: 420,
      background: "linear-gradient(180deg, #0c0f14 0%, #111318 100%)",
      borderLeft: "1px solid rgba(255,255,255,0.08)",
      zIndex: 200, overflow: "auto",
      boxShadow: "-20px 0 60px rgba(0,0,0,0.6)",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {onBack && (
              <button onClick={onBack} style={{
                background: "none", border: "none", color: "#64748b", cursor: "pointer",
                fontSize: 12, padding: "0 0 8px", display: "flex", alignItems: "center", gap: 4,
              }}>
                ← Back to room
              </button>
            )}
            <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.02em" }}>
              {strain.name}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(148,163,184,0.12)", color: "#94a3b8", fontWeight: 500 }}>
                {strain.type}
              </span>
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 700,
                background: `${GRADE_COLORS[strain.grade]}18`,
                color: GRADE_COLORS[strain.grade],
                border: `1px solid ${GRADE_COLORS[strain.grade]}30`,
              }}>
                {strain.grade}
              </span>
              {strain.flowering_time_class && (
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                  background: `${FLOWER_CLASS_COLORS[strain.flowering_time_class]}15`,
                  color: FLOWER_CLASS_COLORS[strain.flowering_time_class],
                }}>
                  {strain.flowering_time_class} flower
                </span>
              )}
              {strain.feed_group && (
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                  background: `${FEED_COLORS[strain.feed_group]}15`,
                  color: FEED_COLORS[strain.feed_group],
                }}>
                  {strain.feed_group} feed
                </span>
              )}
              <span style={{ fontSize: 11, color: "#64748b" }}>
                {strain.sessions > 0 ? `${strain.sessions} sessions · ${strain.harvest_count} harvests` : "No session data"}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20, padding: "0 4px" }}>×</button>
        </div>
      </div>

      {/* Demand Signal */}
      {dem && (
        <div style={{
          margin: "16px 24px", padding: "12px 16px", borderRadius: 8,
          background: `${URGENCY_COLORS[dem.urgency]}10`,
          border: `1px solid ${URGENCY_COLORS[dem.urgency]}25`,
        }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: URGENCY_COLORS[dem.urgency], fontWeight: 600, marginBottom: 6 }}>
            Open Demand — {dem.urgency}
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>{dem.demand_lbs} lbs</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{dem.orders} open orders</div>
            </div>
          </div>
        </div>
      )}

      {/* Confidence Banner */}
      {!hasData && (
        <div style={{
          margin: "0 24px 12px", padding: "10px 14px", borderRadius: 6,
          background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)",
          fontSize: 12, color: "#fbbf24", lineHeight: 1.5,
        }}>
          No production data yet. Metrics below are blank or defaults. Data will populate as harvests and trim sessions are recorded.
        </div>
      )}

      {/* Metrics Grid */}
      <div style={{ padding: "12px 24px" }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#475569", fontWeight: 600, marginBottom: 10 }}>
          Strain Intelligence
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {metrics.map(m => (
            <div key={m.label} style={{
              padding: "10px 12px", borderRadius: 6,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}>
              <div style={{ fontSize: 10, color: "#475569", marginBottom: 3, fontWeight: 500 }}>{m.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: m.value === "—" || m.value === "No COA" ? "#334155" : m.color, fontFeatureSettings: "'tnum'" }}>{m.value}</div>
              {m.source && <div style={{ fontSize: 9, color: "#334155", marginTop: 2 }}>via {m.source}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Product Allocation */}
      <div style={{ padding: "12px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#475569", fontWeight: 600 }}>
            Product Allocation
          </span>
          {isDefaultSplit && (
            <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "rgba(251,191,36,0.12)", color: "#fbbf24", fontWeight: 500 }}>
              NO DATA
            </span>
          )}
        </div>
        {splits ? (
          <>
            <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden", gap: 2 }}>
              <div style={{ flex: splits.flower, background: "rgba(34,197,94,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 10, color: "#bbf7d0", fontWeight: 600 }}>Flower {splits.flower}%</span>
              </div>
              <div style={{ flex: splits.smalls, background: "rgba(96,165,250,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 9, color: "#93c5fd", fontWeight: 600 }}>Sm {splits.smalls}%</span>
              </div>
              <div style={{ flex: splits.trim, background: "rgba(251,191,36,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 9, color: "#fcd34d", fontWeight: 600 }}>Tr {splits.trim}%</span>
              </div>
              <div style={{ flex: splits.ff, background: "rgba(168,85,247,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 9, color: "#d8b4fe", fontWeight: 600 }}>FF {splits.ff}%</span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ height: 28, borderRadius: 6, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: "#334155" }}>Needs harvest + trim data</span>
          </div>
        )}
      </div>

      {/* Cycle Timeline */}
      <div style={{ padding: "12px 24px" }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#475569", fontWeight: 600, marginBottom: 10 }}>
          Full Cycle Timeline
        </div>
        <div style={{ display: "flex", gap: 2, height: 36, borderRadius: 6, overflow: "hidden" }}>
          {[
            { label: "Clone", days: 14, color: STAGE_COLORS.clone, note: "10-21d rooting" },
            { label: "Veg", days: strain.veg_days || 28, color: STAGE_COLORS.veg, note: `${strain.veg_days || "~28"}d` },
            { label: "Flower", days: strain.flower_days || 60, color: STAGE_COLORS.flower, note: `${strain.flower_days || "~60"}d` },
            { label: "Dry", days: 12, color: STAGE_COLORS.dry, note: "10-14d" },
          ].map(s => (
            <div key={s.label} style={{
              flex: s.days, background: s.color.bg, borderTop: `2px solid ${s.color.border}`,
              display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
            }}>
              <span style={{ fontSize: 9, color: s.color.text, fontWeight: 600 }}>{s.label}</span>
              <span style={{ fontSize: 8, color: s.color.text, opacity: 0.7 }}>{s.note}</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "right", marginTop: 4, fontSize: 11, color: "#64748b" }}>
          Total: ~{14 + (strain.veg_days || 28) + (strain.flower_days || 60) + 12} days
        </div>
      </div>

      {/* Mother / Clone Planning */}
      <div style={{ padding: "12px 24px" }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#475569", fontWeight: 600, marginBottom: 10 }}>
          Clone Supply Planning
        </div>
        <div style={{
          padding: "12px 14px", borderRadius: 6, fontSize: 12, lineHeight: 1.7,
          background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.12)",
          color: "#c084fc",
        }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: "#94a3b8" }}>Mother prep:</span> 4-8 weeks before first cuts
          </div>
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: "#94a3b8" }}>Yield per cut session:</span> 10-30 clones/mother
          </div>
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: "#94a3b8" }}>Recovery between cuts:</span> 2-3 weeks
          </div>
          <div>
            <span style={{ color: "#94a3b8" }}>Rooting time:</span> 10-21 days to transplant-ready
          </div>
        </div>
      </div>

      {/* Compatibility & Notes */}
      <div style={{ padding: "12px 24px 24px" }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#475569", fontWeight: 600, marginBottom: 10 }}>
          Compatibility & Notes
        </div>
        <div style={{
          padding: "12px 14px", borderRadius: 6, fontSize: 12, lineHeight: 1.6,
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
          color: "#94a3b8",
        }}>
          {strain.harvest_count > 0 ? (
            <span>{strain.harvest_count} harvest{strain.harvest_count > 1 ? "s" : ""} completed. </span>
          ) : (
            <span style={{ color: "#fbbf24" }}>No harvests yet — projections are estimates. </span>
          )}
          {strain.trim_gph && strain.trim_gph > 300 && <span style={{ color: "#22d3ee" }}>Fast trimmer — high throughput. </span>}
          {strain.waste_pct > 3 && <span style={{ color: "#f87171" }}>High waste — check plant health. </span>}
          {!strain.thc && <span style={{ color: "#475569" }}>No COA data — needs lab testing. </span>}
          {!strain.rosin_yield && <span style={{ color: "#475569" }}>No rosin data. </span>}
          {strain.flower_days > 63 && <span>Long flower cycle — plan room time carefully. </span>}
          {strain.cultivation_notes && <div style={{ marginTop: 8, color: "#64748b", fontStyle: "italic" }}>{strain.cultivation_notes}</div>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2: ROOM DETAIL CARD
// ═══════════════════════════════════════════════════════════════════════════════

function RoomDetailCard({ room, onClose, onStrainClick }) {
  if (!room) return null;

  const roomStrains = ROOM_STRAINS[room.id] || [];
  const totalPlants = roomStrains.reduce((sum, rs) => sum + rs.plants, 0);
  const strainCount = roomStrains.length;
  const harvestDate = roomStrains[0]?.harvest;
  const daysToHarvest = harvestDate ? diffDays(today, new Date(harvestDate)) : null;

  const stageLabel = room.type === "mother" ? "Mother" : room.type === "veg" ? "Vegetative" : "Flowering";
  const stageColor = room.type === "mother" ? STAGE_COLORS.clone : room.type === "veg" ? STAGE_COLORS.veg : STAGE_COLORS.flower;

  return (
    <div style={{
      position: "fixed", right: 0, top: 0, bottom: 0, width: 420,
      background: "linear-gradient(180deg, #0c0f14 0%, #111318 100%)",
      borderLeft: "1px solid rgba(255,255,255,0.08)",
      zIndex: 100, overflow: "auto",
      boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
    }}>
      {/* Room Header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.02em" }}>
              {room.code}
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{room.name}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <span style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 4, fontWeight: 600,
                background: stageColor.bg, color: stageColor.text,
                border: `1px solid ${stageColor.border}`,
              }}>
                {stageLabel}
              </span>
              {daysToHarvest !== null && daysToHarvest >= 0 && (
                <span style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 4, fontWeight: 600,
                  background: daysToHarvest <= 7 ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.1)",
                  color: daysToHarvest <= 7 ? "#f87171" : "#fbbf24",
                }}>
                  Harvest in {daysToHarvest}d
                </span>
              )}
              {daysToHarvest !== null && daysToHarvest < 0 && (
                <span style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 4, fontWeight: 600,
                  background: "rgba(239,68,68,0.15)", color: "#f87171",
                }}>
                  {Math.abs(daysToHarvest)}d past harvest
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20, padding: "0 4px" }}>×</button>
        </div>
      </div>

      {/* Room Summary */}
      <div style={{ padding: "16px 24px", display: "flex", gap: 16 }}>
        <div style={{
          flex: 1, padding: "12px", borderRadius: 8,
          background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9" }}>{totalPlants}</div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Total Plants</div>
        </div>
        <div style={{
          flex: 1, padding: "12px", borderRadius: 8,
          background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9" }}>{strainCount}</div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Strains</div>
        </div>
        <div style={{
          flex: 1, padding: "12px", borderRadius: 8,
          background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: room.capacity ? "#f1f5f9" : "#334155" }}>
            {room.capacity || "—"}
          </div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Capacity</div>
        </div>
      </div>

      {/* Capacity Bar */}
      {room.capacity && (
        <div style={{ padding: "0 24px 12px" }}>
          <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
            <div style={{
              width: `${Math.min((totalPlants / room.capacity) * 100, 100)}%`,
              background: totalPlants > room.capacity * 0.9 ? "rgba(239,68,68,0.5)" : "rgba(34,197,94,0.4)",
              borderRadius: 4,
            }} />
          </div>
          <div style={{ fontSize: 10, color: "#64748b", textAlign: "right", marginTop: 4 }}>
            {Math.round((totalPlants / room.capacity) * 100)}% utilized
          </div>
        </div>
      )}

      {/* Empty room state */}
      {roomStrains.length === 0 && (
        <div style={{
          margin: "16px 24px", padding: "32px 16px", borderRadius: 8,
          background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🌱</div>
          <div style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>
            {room.type === "mother" ? "No mothers tracked yet" : "Room is empty — available for next cycle"}
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
            {room.type === "mother"
              ? "Mother plant tracking needs to be set up in plant_groups with is_mother = true"
              : "Plan a new cycle by selecting strains and plant counts"
            }
          </div>
        </div>
      )}

      {/* Strain Breakdown */}
      {roomStrains.length > 0 && (
        <div style={{ padding: "4px 24px 8px" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#475569", fontWeight: 600, marginBottom: 10 }}>
            Strain Breakdown
          </div>

          {/* Proportional bar */}
          <div style={{ display: "flex", height: 24, borderRadius: 6, overflow: "hidden", gap: 1, marginBottom: 16 }}>
            {roomStrains.map((rs, i) => {
              const s = STRAINS[rs.strainId];
              const pct = totalPlants > 0 ? (rs.plants / totalPlants) * 100 : 0;
              const hue = (i * 47 + 180) % 360;
              return (
                <div key={rs.strainId} style={{
                  flex: rs.plants, background: `hsla(${hue}, 60%, 50%, 0.3)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "opacity 0.15s",
                }} onClick={() => onStrainClick(s)}
                  title={`${s?.name}: ${rs.plants} plants (${pct.toFixed(0)}%)`}>
                  {pct > 10 && <span style={{ fontSize: 9, color: `hsla(${hue}, 70%, 80%, 0.9)`, fontWeight: 600 }}>{pct.toFixed(0)}%</span>}
                </div>
              );
            })}
          </div>

          {/* Strain list */}
          {roomStrains.map((rs, i) => {
            const s = STRAINS[rs.strainId];
            if (!s) return null;
            const dem = DEMAND.find(d => d.strain === rs.strainId);
            const pct = totalPlants > 0 ? ((rs.plants / totalPlants) * 100).toFixed(1) : "0";
            const hue = (i * 47 + 180) % 360;

            return (
              <button key={rs.strainId} onClick={() => onStrainClick(s)}
                style={{
                  width: "100%", textAlign: "left", cursor: "pointer",
                  padding: "12px 14px", borderRadius: 8, marginBottom: 6,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", gap: 12,
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; }}>

                {/* Color dot */}
                <div style={{
                  width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                  background: `hsla(${hue}, 60%, 55%, 0.7)`,
                }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{s.name}</span>
                    <span style={{
                      fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 700,
                      background: `${GRADE_COLORS[s.grade]}18`,
                      color: GRADE_COLORS[s.grade],
                    }}>
                      {s.grade}
                    </span>
                    {dem && (
                      <span style={{
                        fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 600,
                        background: `${URGENCY_COLORS[dem.urgency]}12`,
                        color: URGENCY_COLORS[dem.urgency],
                      }}>
                        {dem.demand_lbs}lb demand
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11, color: "#64748b" }}>
                    <span>{rs.plants} plants</span>
                    <span>{pct}%</span>
                    {s.flower_days && <span>{s.flower_days}d flower</span>}
                    {s.trim_gph && <span>{s.trim_gph} g/hr trim</span>}
                  </div>
                </div>

                {/* Arrow */}
                <span style={{ color: "#334155", fontSize: 16 }}>›</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Harvest date info */}
      {harvestDate && (
        <div style={{ padding: "12px 24px 24px" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#475569", fontWeight: 600, marginBottom: 10 }}>
            Room Schedule
          </div>
          <div style={{
            padding: "12px 14px", borderRadius: 6, fontSize: 12, lineHeight: 1.7,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
            color: "#94a3b8",
          }}>
            <div><span style={{ color: "#64748b" }}>Planted:</span> {roomStrains[0]?.planted || "—"}</div>
            <div><span style={{ color: "#64748b" }}>Est. Harvest:</span> {harvestDate}</div>
            <div><span style={{ color: "#64748b" }}>Next available:</span> ~{fmtDate(addDays(new Date(harvestDate), 14))} (after dry/transition)</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1: MAIN CALENDAR VIEW
// ═══════════════════════════════════════════════════════════════════════════════

export default function ProductionPlanner() {
  const [activePanel, setActivePanel] = useState(null); // null | { type: "room", room } | { type: "strain", strain, fromRoom }
  const [showPlanned, setShowPlanned] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = dayToX(today) - 300;
    }
  }, []);

  const handleRoomClick = (room) => {
    setActivePanel({ type: "room", room });
  };

  const handleStrainClick = (strain, fromRoom) => {
    setActivePanel({ type: "strain", strain, fromRoom });
  };

  const handleBack = () => {
    if (activePanel?.fromRoom) {
      setActivePanel({ type: "room", room: activePanel.fromRoom });
    } else {
      setActivePanel(null);
    }
  };

  const handleClose = () => setActivePanel(null);

  // Build timeline bars from ROOM_STRAINS data
  const roomBars = useMemo(() => {
    const bars = {};
    ROOMS.forEach(room => {
      const strains = ROOM_STRAINS[room.id] || [];
      if (strains.length === 0) {
        bars[room.id] = [];
        return;
      }
      // Aggregate by harvest date to create cycle bars
      const harvestGroups = {};
      strains.forEach(rs => {
        const key = rs.harvest || "no-harvest";
        if (!harvestGroups[key]) harvestGroups[key] = { strains: [], totalPlants: 0, planted: rs.planted, harvest: rs.harvest, stage: rs.stage };
        harvestGroups[key].strains.push(rs);
        harvestGroups[key].totalPlants += rs.plants;
      });
      bars[room.id] = Object.values(harvestGroups);
    });
    return bars;
  }, []);

  // Upcoming harvests
  const upcomingHarvests = useMemo(() => {
    const harvests = [];
    Object.entries(ROOM_STRAINS).forEach(([roomId, strains]) => {
      if (strains.length === 0 || !strains[0].harvest) return;
      const room = ROOMS.find(r => r.id === roomId);
      const harvestDate = new Date(strains[0].harvest);
      const daysOut = diffDays(today, harvestDate);
      if (daysOut >= -7 && daysOut <= 21) {
        const totalPlants = strains.reduce((s, rs) => s + rs.plants, 0);
        harvests.push({ roomId, room, harvestDate, daysOut, totalPlants, strainCount: strains.length });
      }
    });
    return harvests.sort((a, b) => a.daysOut - b.daysOut);
  }, []);

  const ROW_HEIGHT = 52;
  const HEADER_HEIGHT = 40;
  const SIDEBAR_WIDTH = 168;
  const svgWidth = TOTAL_DAYS * DAY_WIDTH;

  const weekMarkers = useMemo(() => {
    const markers = [];
    let d = new Date(TIMELINE_START);
    d.setDate(d.getDate() - d.getDay() + 1);
    if (d < TIMELINE_START) d.setDate(d.getDate() + 7);
    while (d < TIMELINE_END) {
      markers.push({ date: new Date(d), x: dayToX(d) });
      d = addDays(d, 7);
    }
    return markers;
  }, []);

  const monthMarkers = useMemo(() => {
    const markers = [];
    let d = new Date(TIMELINE_START.getFullYear(), TIMELINE_START.getMonth() + 1, 1);
    while (d < TIMELINE_END) {
      markers.push({ date: new Date(d), x: dayToX(d), label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) });
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return markers;
  }, []);

  return (
    <div style={{
      fontFamily: "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif",
      background: "#090b10", color: "#e2e8f0", minHeight: "100vh", position: "relative",
    }}>
      {/* Top Bar */}
      <div style={{
        padding: "20px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 16,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, rgba(34,197,94,0.3), rgba(251,191,36,0.3))",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid rgba(34,197,94,0.2)", fontSize: 16,
            }}>🌱</div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.03em", color: "#f8fafc" }}>
                Production Planner
              </h1>
              <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0", fontWeight: 400 }}>
                Cultivation calendar — click rooms for strain detail, click strains for intelligence
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 12 }}>
          <div style={{ display: "flex", gap: 12, color: "#64748b" }}>
            {Object.entries(STAGE_COLORS).filter(([k]) => !["harvest","dry"].includes(k)).map(([stage, colors]) => (
              <div key={stage} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: colors.bg, border: `1px solid ${colors.border}` }} />
                <span style={{ fontSize: 10, color: colors.text, textTransform: "capitalize", fontWeight: 500 }}>{stage}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Harvest Alerts */}
      {upcomingHarvests.length > 0 && (
        <div style={{
          padding: "10px 28px", display: "flex", gap: 10, alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          background: "rgba(239,68,68,0.03)", overflowX: "auto",
        }}>
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f87171", fontWeight: 600, whiteSpace: "nowrap" }}>
            Upcoming Harvests
          </span>
          {upcomingHarvests.map(h => (
            <button key={h.roomId} onClick={() => handleRoomClick(h.room)}
              style={{
                padding: "5px 12px", borderRadius: 6, cursor: "pointer",
                border: `1px solid ${h.daysOut <= 3 ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)"}`,
                background: h.daysOut <= 3 ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.03)",
                display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap",
              }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{h.room.code}</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>{h.totalPlants}pl · {h.strainCount} strains</span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: h.daysOut <= 0 ? "#f87171" : h.daysOut <= 7 ? "#fbbf24" : "#94a3b8",
              }}>
                {h.daysOut <= 0 ? `${Math.abs(h.daysOut)}d over` : `${h.daysOut}d`}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: "flex", position: "relative" }}>
        {/* Room Sidebar */}
        <div style={{
          width: SIDEBAR_WIDTH, flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          background: "#090b10", zIndex: 10,
        }}>
          <div style={{ height: HEADER_HEIGHT + 16, borderBottom: "1px solid rgba(255,255,255,0.04)" }} />

          {["mother", "veg", "flower"].map(type => {
            const rooms = ROOMS.filter(r => r.type === type);
            return rooms.map((room, i) => {
              const strains = ROOM_STRAINS[room.id] || [];
              const totalPlants = strains.reduce((s, rs) => s + rs.plants, 0);
              const isSelected = activePanel?.type === "room" && activePanel.room.id === room.id;

              return (
                <div key={room.id}
                  onClick={() => handleRoomClick(room)}
                  style={{
                    height: ROW_HEIGHT, display: "flex", alignItems: "center", padding: "0 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    borderTop: i === 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    cursor: "pointer",
                    background: isSelected ? "rgba(34,211,238,0.06)" : "transparent",
                    borderLeft: isSelected ? "2px solid #22d3ee" : "2px solid transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{room.code}</div>
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
                      {strains.length > 0
                        ? `${totalPlants} plants · ${strains.length} strain${strains.length > 1 ? "s" : ""}`
                        : "Empty"
                      }
                    </div>
                  </div>
                  <span style={{ color: "#334155", fontSize: 14 }}>›</span>
                </div>
              );
            });
          })}
        </div>

        {/* Timeline */}
        <div ref={scrollRef} style={{ flex: 1, overflowX: "auto", overflowY: "hidden", position: "relative" }}>
          <svg width={svgWidth} height={HEADER_HEIGHT + 16 + ROOMS.length * ROW_HEIGHT + 20} style={{ display: "block" }}>

            {/* Month headers */}
            {monthMarkers.map((m, i) => (
              <g key={i}>
                <text x={m.x + 8} y={16} fill="#94a3b8" fontSize={12} fontWeight={600} fontFamily="'DM Sans', system-ui">
                  {m.label}
                </text>
                <line x1={m.x} y1={0} x2={m.x} y2={HEADER_HEIGHT + 16 + ROOMS.length * ROW_HEIGHT + 20}
                  stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
              </g>
            ))}

            {/* Week grid */}
            {weekMarkers.map((w, i) => (
              <g key={i}>
                <line x1={w.x} y1={HEADER_HEIGHT} x2={w.x} y2={HEADER_HEIGHT + 16 + ROOMS.length * ROW_HEIGHT + 20}
                  stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
                <text x={w.x + 3} y={HEADER_HEIGHT + 10} fill="#334155" fontSize={9} fontFamily="'DM Mono', monospace">
                  {fmtDate(w.date)}
                </text>
              </g>
            ))}

            {/* TODAY line */}
            <line x1={dayToX(today)} y1={0} x2={dayToX(today)} y2={HEADER_HEIGHT + 16 + ROOMS.length * ROW_HEIGHT + 20}
              stroke="#22d3ee" strokeWidth={1.5} opacity={0.6} />
            <rect x={dayToX(today) - 22} y={2} width={44} height={16} rx={4} fill="#22d3ee" opacity={0.15} />
            <text x={dayToX(today)} y={13} fill="#22d3ee" fontSize={9} fontWeight={700} textAnchor="middle" fontFamily="'DM Sans', system-ui">
              TODAY
            </text>

            {/* Room rows + cycle bars */}
            {(() => {
              let yOffset = HEADER_HEIGHT + 16;
              return ["mother", "veg", "flower"].flatMap(type => {
                const rooms = ROOMS.filter(r => r.type === type);
                return rooms.map(room => {
                  const y = yOffset;
                  yOffset += ROW_HEIGHT;
                  const groups = roomBars[room.id] || [];

                  return (
                    <g key={room.id}>
                      <rect x={0} y={y} width={svgWidth} height={ROW_HEIGHT} fill="transparent" />
                      <line x1={0} y1={y + ROW_HEIGHT} x2={svgWidth} y2={y + ROW_HEIGHT}
                        stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />

                      {groups.map((group, gi) => {
                        if (!group.planted) return null;
                        const plantedDate = new Date(group.planted);
                        const harvestDate = group.harvest ? new Date(group.harvest) : addDays(plantedDate, 90);
                        const stageColor = group.stage === "veg" ? STAGE_COLORS.veg : group.stage === "flower" ? STAGE_COLORS.flower : STAGE_COLORS.planned;

                        const barStart = dayToX(plantedDate);
                        const barEnd = dayToX(harvestDate);
                        const barWidth = Math.max(barEnd - barStart, 20);

                        const daysToH = group.harvest ? diffDays(today, harvestDate) : null;
                        const harvestSoon = daysToH !== null && daysToH >= 0 && daysToH <= 7;
                        const isPast = group.harvest && harvestDate < today;

                        // For flower rooms with a planted+harvest, show veg portion too
                        const strainData = group.strains[0] ? STRAINS[group.strains[0].strainId] : null;
                        const vegDays = strainData?.veg_days || 28;
                        const flowerStartDate = addDays(plantedDate, vegDays);
                        const vegWidth = dayToX(flowerStartDate) - barStart;
                        const flowerWidth = barWidth - Math.max(vegWidth, 0);

                        const topStrain = group.strains[0] ? STRAINS[group.strains[0].strainId] : null;
                        const label = group.strains.length === 1
                          ? topStrain?.name || "?"
                          : `${group.strains.length} strains`;

                        return (
                          <g key={gi} style={{ cursor: "pointer", opacity: isPast ? 0.35 : 1 }}
                            onClick={() => handleRoomClick(room)}>
                            {group.stage === "flower" && vegWidth > 0 ? (
                              <>
                                <rect x={barStart} y={y + 8} width={Math.max(vegWidth, 0)} height={36} rx={4}
                                  fill={STAGE_COLORS.veg.bg} stroke={STAGE_COLORS.veg.border} strokeWidth={0.5} />
                                <rect x={barStart + Math.max(vegWidth, 0)} y={y + 8} width={Math.max(flowerWidth, 0)} height={36} rx={4}
                                  fill={STAGE_COLORS.flower.bg} stroke={STAGE_COLORS.flower.border} strokeWidth={0.5} />
                              </>
                            ) : (
                              <rect x={barStart} y={y + 8} width={barWidth} height={36} rx={4}
                                fill={stageColor.bg} stroke={stageColor.border} strokeWidth={0.5} />
                            )}

                            {harvestSoon && (
                              <g>
                                <line x1={barEnd} y1={y + 4} x2={barEnd} y2={y + ROW_HEIGHT - 4} stroke="#f87171" strokeWidth={2} strokeDasharray="3 2" />
                                <circle cx={barEnd} cy={y + ROW_HEIGHT / 2} r={4} fill="#ef4444" />
                              </g>
                            )}

                            {barWidth > 70 && (
                              <text x={barStart + 10} y={y + 30} fill="#e2e8f0" fontSize={11} fontWeight={600}
                                fontFamily="'DM Sans', system-ui" style={{ pointerEvents: "none" }}>
                                {label}
                                {barWidth > 160 && (
                                  <tspan fill="#64748b" fontSize={9} fontWeight={400}>
                                    {" "}· {group.totalPlants}pl
                                  </tspan>
                                )}
                              </text>
                            )}

                            {!isPast && dayToX(today) > barStart && dayToX(today) < barStart + barWidth && (
                              <rect x={dayToX(today)} y={y + 8} width={2} height={36} fill="rgba(255,255,255,0.5)" rx={1} />
                            )}
                          </g>
                        );
                      })}

                      {groups.length === 0 && (
                        <text x={dayToX(today) + 20} y={y + ROW_HEIGHT / 2 + 4}
                          fill="#1e293b" fontSize={11} fontStyle="italic" fontFamily="'DM Sans', system-ui">
                          Empty — available
                        </text>
                      )}
                    </g>
                  );
                });
              });
            })()}
          </svg>
        </div>
      </div>

      {/* Bottom Demand Bar */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "14px 28px", display: "flex", gap: 16, alignItems: "center",
        background: "rgba(255,255,255,0.015)", flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569", fontWeight: 600 }}>
          Open Demand
        </span>
        {DEMAND.map(d => {
          const s = STRAINS[d.strain];
          return (
            <button key={d.strain}
              onClick={() => handleStrainClick(s)}
              style={{
                padding: "6px 14px", borderRadius: 6, cursor: "pointer",
                border: `1px solid ${URGENCY_COLORS[d.urgency]}30`,
                background: `${URGENCY_COLORS[d.urgency]}08`,
                display: "flex", gap: 10, alignItems: "center",
              }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{s?.name}</span>
              <span style={{ fontSize: 11, color: URGENCY_COLORS[d.urgency], fontWeight: 600 }}>{d.demand_lbs} lbs</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>{d.orders} orders</span>
            </button>
          );
        })}
      </div>

      {/* Hint bar */}
      <div style={{
        padding: "8px 28px", borderTop: "1px solid rgba(255,255,255,0.04)",
        fontSize: 10, color: "#334155", display: "flex", gap: 16,
      }}>
        <span>Click room row → strain breakdown</span>
        <span>Click strain → full intelligence</span>
        <span>Scroll timeline horizontally</span>
      </div>

      {/* PANELS */}
      {activePanel?.type === "room" && (
        <RoomDetailCard
          room={activePanel.room}
          onClose={handleClose}
          onStrainClick={(strain) => handleStrainClick(strain, activePanel.room)}
        />
      )}

      {activePanel?.type === "strain" && (
        <StrainStats
          strain={activePanel.strain}
          onClose={handleClose}
          onBack={activePanel.fromRoom ? handleBack : null}
        />
      )}
    </div>
  );
}
