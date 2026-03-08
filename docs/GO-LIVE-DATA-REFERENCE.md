# CULT Seed-to-Sale -- Go-Live Data Reference

**Snapshot Date:** March 2, 2026
**Source Database:** Bolt.new Supabase instance `fonreynkfeqywshijqpi`
**Total Migrations Applied:** 232
**Last Migration:** `20260301230247_fix_fulfillment_trigger_atp_constraint.sql`

> This document is the authoritative record of all reference data, configuration, and
> operational state from the current (Bolt.new) database. It serves as:
> 1. A checklist for validating the new database after migration
> 2. A permanent record of the old database state before go-live
> 3. A data quality inventory that flags known issues for cleanup

---

## Table of Contents

1. [Strain Catalog](#1-strain-catalog-43-strains)
2. [Product Stages](#2-product-stages)
3. [Product Types](#3-product-types-15-types)
4. [Product Catalog Summary](#4-product-catalog-summary-1049-products)
5. [Quality Grades](#5-quality-grades)
6. [Label Types](#6-label-types)
7. [Conversion Rates](#7-conversion-rates)
8. [Customer Directory](#8-customer-directory-38-customers)
9. [Batch Registry](#9-batch-registry-65-batches)
10. [Inventory Snapshot](#10-inventory-snapshot-non-zero-items)
11. [App Settings](#11-app-settings-34-entries)
12. [User Profiles](#12-user-profiles-10-users)
13. [Delivery Fleet](#13-delivery-fleet)
14. [Cultivation Infrastructure](#14-cultivation-infrastructure)
15. [Session & Operational Data Summary](#15-session--operational-data-summary)
16. [Data Quality Issues](#16-data-quality-issues)
17. [What Carries Forward vs. What Gets Left Behind](#17-what-carries-forward-vs-what-gets-left-behind)

---

## 1. Strain Catalog (43 Strains)

All strains are active (`is_active = true`).

| Name | Abbreviation | Dominance Type | Category |
|------|-------------|---------------|----------|
| Acid Dawg | ACD | Hybrid | hybrid |
| Animal Tsunami | ASU | Indica-Hybrid | hybrid |
| Bananaconda | BAN | Sativa-Hybrid | sativa |
| Black Maple | BLM | Indica-Hybrid | indica |
| Blue Pave | BLP | Sativa | sativa |
| Bonnfire | BON | Indica-Hybrid | indica |
| Capulator Junky | CAP | Hybrid | hybrid |
| Cementer Pops | CEP | Hybrid | hybrid |
| Chembanger | CHB | Hybrid | hybrid |
| Chemlatto | CHL | Hybrid | hybrid |
| Cherry Paloma | CHP | Sativa-Hybrid | sativa |
| **Dante's Inferno** | DIF | **null** | **unknown** |
| **Devil Driver** | DDV | **null** | **unknown** |
| Dog Walker | DOG | Indica-Hybrid | hybrid |
| Donny Burger | DON | Indica | indica |
| Early Riser | EAR | Sativa-Hybrid | sativa |
| Flavor Flav | FLF | Indica-Hybrid | indica |
| Fugazi Funk | FGF | Indica-Hybrid | indica |
| Gas Face | GAS | Indica-Hybrid | indica |
| Georgia Apple Pie | GAP | Hybrid | hybrid |
| Highlighter | HLR | Hybrid | hybrid |
| Lemondary | LMD | Indica-Hybrid | indica |
| Magic Marker | MGM | Indica | indica |
| Orange Sherb | ORS | Indica-Hybrid | indica |
| Peanut Butter Breath | PPB | Hybrid | hybrid |
| Pie Scream | PIE | Indica-Hybrid | indica |
| Purple Ice Water | PIW | Sativa-Hybrid | sativa |
| Rainbow Inferno | RBI | Indica-Hybrid | indica |
| Silver Marker | SSM | Hybrid | hybrid |
| Smackles | SMA | Indica-Hybrid | indica |
| Sour Diesel | SOD | Sativa | sativa |
| Stay Puft | STP | Indica-Hybrid | indica |
| **Strawguava** | SGA | **hybrid** | **unknown** |
| Swamp Water Fumez | SWF | Indica-Hybrid | indica |
| Tahoe Larry | THL | Indica-Hybrid | indica |
| Trillionz | TIZ | Indica-Hybrid | indica |
| Valley Dog | VLD | Indica-Hybrid | indica |
| Violet Fog | VIO | Indica-Hybrid | indica |
| White Burgundy | WHB | Hybrid | hybrid |
| White Devil | WTD | Sativa | sativa |
| Z Chem | ZCH | Sativa-Hybrid | sativa |
| Z Marker | ZMK | Indica-Hybrid | indica |
| Zoda Pop | ZOP | Sativa | sativa |

**Data Issues (bold rows above):**
- Dante's Inferno: `dominance_type` is null, `category` is "unknown" -- needs classification
- Devil Driver: `dominance_type` is null, `category` is "unknown" -- needs classification
- Strawguava: `dominance_type` is "hybrid" (lowercase, inconsistent with others), `category` is "unknown"

---

## 2. Product Stages

| Name | Sort | Default Pricing Unit | Allows Fractional Qty | Description | UUID |
|------|------|---------------------|----------------------|-------------|------|
| Binned | 10 | lb | Yes | Raw harvest, wet weight | `c360e356-eb78-4512-8777-ee47c328157d` |
| Bucked | 20 | lb | Yes | Stems removed, ready for trimming | `35d07a66-851d-4b2d-be18-290b03b91d2d` |
| Trimmed | 30 | unit | No | Trimmed flower, ready for packaging or bulk sale | `30be0d52-a3b2-482d-a462-1803054cf792` |
| Packaged | 40 | unit | No | Consumer-ready packaged products | `323ee0fe-1342-4b26-9379-c373f3cabbb9` |

---

## 3. Product Types (15 Types)

| Name | Base Weight | Base Unit | Sort | Applicable Stages | Active | Notes |
|------|-----------|-----------|------|-------------------|--------|-------|
| Flower | null | lb | 1 | Binned, Bucked, Trimmed | Yes | Bulk flower material |
| Smalls | null | lb | 2 | Binned, Bucked, Trimmed | Yes | Small bud material |
| Trim | null | lb | 3 | Binned, Bucked, Trimmed | Yes | Trim material |
| 3.5g Flower | 3.5g | g | 10 | Packaged | Yes | Packaged eighth |
| 14g Flower | 14g | g | 11 | Packaged | **No** | Half-ounce (inactive) |
| Fresh Frozen | 0g | g | 11 | Bulk | Yes | **Typo in description: "Fresh Frozdn"** |
| 28g Flower | 28g | g | 12 | Packaged | **No** | Full ounce (inactive) |
| 14g Smalls | 14g | g | 13 | Packaged | Yes | Packaged half-ounce smalls |
| 1lb Flower (454g) | 454g | g | 14 | Packaged | Yes | Pound flower |
| Deep Story - Flower 3.5g | 3.5g | g | 14 | _(empty)_ | Yes | **No applicable stages** |
| 1lb Smalls (454g) | 454g | g | 15 | Packaged | Yes | Pound smalls |
| 1g Preroll | 1g | g | 20 | Packaged | Yes | Single preroll |
| 3-pack Preroll | 3g | g | 21 | Packaged | **No** | 3-pack (inactive) |
| Preroll | null | unit | 22 | Bulk, Binned, Bucked | Yes | Bulk preroll material |

**Data Issues:**
- Fresh Frozen description contains typo "Fresh Frozdn"
- Deep Story - Flower 3.5g has empty `applicable_stages` array
- 3 types are inactive: 14g Flower, 28g Flower, 3-pack Preroll

---

## 4. Product Catalog Summary (1,049 Products)

### Active Products by Category (820 total active)

| Category | Type | Price | Pricing Unit | Count |
|----------|------|-------|-------------|-------|
| Bulk | flower | $0 | lb | 539 |
| Packaged | flower (auto-gen) | $0 | unit | 86 |
| Packaged | 3.5g Flower | $17.50 | unit | 41 |
| Packaged | 14g Smalls | $50.00 | unit | 41 |
| Packaged | 1lb Smalls | $1,200 | unit | 3 |
| Packaged | 1lb Flower | $1,800 | unit | 3 |
| Packaged | pre-roll | $3.00 | g | 41 |
| Packaged | fresh frozen | $100 | lb | 4 |
| Packaged | bulk flower (various) | $300-$1,200 | lb | 19 |
| Preroll | bulk preroll material | $0 | unit | 43 |

### Archived Products (229 total archived)

| Category | Count |
|----------|-------|
| Bulk (archived) | 20 |
| Packaged (archived) | 166 |
| Preroll (archived) | 43 |

### Naming Conventions

- **Bulk/Binned:** `[Strain] - Binned` or `Binned - [Strain] - [Type]`
- **Bucked:** `[Strain] - Bulk Flower (Bucked)` or `Bulk Flower (Bucked)` or `Bucked - [Strain] - [Type]`
- **Trimmed:** `Bulk Flower (Trimmed)` or `Bulk Smalls (Trimmed)` or `Bulk Trim (Trimmed)`
- **Packaged:** `Packaged - [Strain] - [Weight] [Type]`
- **Orderable (customer-facing):** `1lb Flower - [Strain]`, `1lb Smalls - [Strain]`, `Bulk - [Strain] - Flower`

---

## 5. Quality Grades

| Code | Label | Sort | Color Class | Description |
|------|-------|------|------------|-------------|
| UNDEFINED | Ungraded | 0 | gray | Not yet graded |
| CULT | CULT | 1 | emerald | Top-tier premium flower |
| B | B Grade | 2 | sky | Good quality, standard distribution |
| C | C Grade | 3 | amber | Acceptable, minor cosmetic issues |
| D | D Grade | 4 | rose | Below standard, extraction only |

---

## 6. Label Types

| Code | Name | Requires COA | Active |
|------|------|-------------|--------|
| BULK | Bulk Container | No | Yes |
| PACKAGED | Packaged Product | Yes | Yes |
| SAMPLE | Sample | No | Yes |
| TESTING | Testing | No | Yes |

---

## 7. Conversion Rates

| From Stage | To Stage | Rate % | Split % | Notes |
|-----------|----------|--------|---------|-------|
| Binned | Bucked | 66% | n/a | 34% loss to stems |
| Bucked | Bulk | 75% | 50/50 | 50% A-buds, 50% Smalls |

---

## 8. Customer Directory (38 Customers)

### Active Accounts (26)

| Name | Dispensary Code | License Name | ATO Number | City | Account Type | Delivery Model |
|------|----------------|-------------|------------|------|-------------|---------------|
| Allgreens Dispensary | ALG | Allgreens Dispensary | #00000142ESIL74759395 | Sun City | direct | direct_to_each |
| ANC | ANC | RJK Ventures | 00000131DCYO00924714 | Phoenix | direct | direct_to_each |
| Arizona Organix | ARO | Arizona Organix | # 00000099DCPL00826691 | Glendale | direct | direct_to_each |
| D2 - Downtown | AVC | Forever 46 LLC | 00000128ESJI00619914 | Tucson | direct | direct_to_each |
| D2 - Eastside | ABB | Forever 46 LLC | 00000128ESJI00619914 | Tucson | direct | direct_to_each |
| Earth's Healing | WEE | Earth's healing | 4444 | Tucson | **hub_parent** | direct_to_each |
| FWA, INC (Farm Fresh) | FWA | _(null)_ | _(null)_ | _(null)_ | direct | direct_to_each |
| Kind Meds | KMD | Kind Meds Inc | _(null)_ | Mesa | direct | direct_to_each |
| Nature Med | NMD | Arizona Golden Leaf Wellness | _(null)_ | Tucson | direct | direct_to_each |
| Noble Herb | NOB | _(null)_ | _(null)_ | Flagstaff | direct | direct_to_each |
| Ponderosa | PON | Ponderosa Botanical Care Inc. | _(null)_ | Tempe | direct | direct_to_each |
| Prime Leaf at Park | PRP | Total Accountability Patient Care | 00000025DCPT00084389 | Tucson | direct | direct_to_each |
| Prime Leaf at Speedway | PRS | Rainbow Collective Inc | 00000039DCVR00320237 | Tucson | direct | direct_to_each |
| Sol Flower | SOL | Kannaboost Technology Inc | 00000118DCKD00426097 | Tempe | **hub_parent** | **hub_and_spoke** |
| Story - Bell | SBL | Pleasant Plants 1, LLC | 0000159ESTFT57497963 | Glendale | direct | direct_to_each |
| Story - Bullhead City | SBC | Juicy Joint 1, LLC | EST # 0000147ESTXX54706468 | Bullhead City | direct | direct_to_each |
| Story - Dunlap | SDN | Arizona Natural Pain Solutions, Inc. | 00000013DCOU00042197 / 00000096ESWI60030184 | Phoenix | direct | direct_to_each |
| Story - Grand | SGR | Total Health & Wellness Inc | _(null)_ | Glendale | direct | direct_to_each |
| Story - Havasu | SHV | Curious Cultivators 1, LLC | EST # 0000155ESTWD37312465 | Lake Havasu City | direct | direct_to_each |
| Story - McDowell | SMC | Sixth Street Enterprises, Inc | DCR# 00000088DCXB00897085 EST#00000092ESKW00353670 | Phoenix | direct | direct_to_each |
| Story - Midtown Phoenix | SJB | Total Health & Wellness Inc | EST # 00000060ESTV86857950 - DRC# 00000036DCOP0081 | Phoenix | direct | direct_to_each |
| Story - North Chandler | SNC | Total Health and Wellness, Inc. | DRC# 00000100DCWU00857159 EST#00000021ESQX24132908 | Chandler | direct | direct_to_each |
| Story - South Chandler | SSC | MCCSE29, LLC | EST#0000149ESTUL49249395 | Chandler | direct | direct_to_each |
| Story - Tolleson | STL | Cannabis Research Group, Inc | DRC# 00000055DCDA00381095 - EST# 00000104ESDH57805 | Tolleson | direct | direct_to_each |
| Story Litchfield | SLF | Joint Junkies I LLC - MCCSE29, LLC | _(null)_ | Litchfield Park | direct | direct_to_each |
| Superior Dispensary | SUP | The Superior Dispensary | #00000065DCLV00799347 | Phoenix | direct | direct_to_each |
| The Best Dispensary | TBD | Jamestown Center | 00000046ESTW28902560 | Mesa | direct | direct_to_each |
| The Flower Shop | FLS | Nature's Healing Center Inc | 00000085DCSC00371416 | Phoenix | direct | direct_to_each |
| Tree Junky | TRJ | Forever 46 Llc | _(null)_ | Tucson | direct | direct_to_each |
| Trubliss | SOG | Sea of Green LLC | #00000113DCUX00454549 | Mesa | direct | direct_to_each |
| Trulieve | TRU | Green Sky Patient Center of Scottsdale | 00000081ESLT56066782 | Phoenix | direct | direct_to_each |

### Prospect Accounts (7)

| Name | Dispensary Code | City |
|------|----------------|------|
| Arizona Cannabis Society | ACS | El Mirage |
| Cult Cannabis Co. | CUL | Phoenix |
| Deeply Rooted | DPR | El Mirage |
| Sticky Saguaro | STK | Chandler |
| Story - Williams | SWL | Williams |
| Sunday Goods | SUN | Phoenix |
| The Green Halo | GRH | Tucson |
| Timeless | TML | Tempe |

**Customer Data Issues:**
- FWA, INC (Farm Fresh): No address, no license info, no ATO number
- Nature Med: No street address (only city/state/zip)
- Earth's Healing ATO number is just "4444" -- likely placeholder
- Several active customers missing ATO numbers: Kind Meds, Nature Med, Noble Herb, Ponderosa, Story-Grand, Story Litchfield, Tree Junky
- Dave Low's email domain typo (see User Profiles section)

---

## 9. Batch Registry (65 Batches)

### Legacy Imported Batches (pre-250916) -- 21 batches

These are historical batches imported from prior systems. Most have lifecycle_state = "created" (no processing activity in this system).

| Batch Number | Strain | Initial Weight (g) | Lifecycle State |
|-------------|--------|-------------------|----------------|
| 241209HE | Donny Burger | 1,816 | created |
| 250128HE | Strawguava | 48.5 | created |
| 250218HG | Peanut Butter Breath | 102 | created |
| 250218HL | Magic Marker | 594.3 | created |
| 250218HN | Bananaconda | 550 | created |
| 250318HL | Dante's Inferno | 85.3 | created |
| 250318HN | Strawguava | 2,052.2 | created |
| 250403HB | Fugazi Funk | 100 | created |
| 250403HG | White Devil | 404 | **packaged** |
| 250520HC | Rainbow Inferno | 1,454.6 | created |
| 250520HE | Lemondary | 672 | created |
| 250520HH | Peanut Butter Breath | 62.9 | created |
| 250520HM | Georgia Apple Pie | 880.4 | created |
| 250520HN | Chembanger | 42 | created |
| 25064H | Gas Face | 1,610.1 | created |
| 25064HA | Rainbow Inferno | 5,500.3 | created |
| 25064HB | Strawguava | 4,639.9 | created |
| 25064HD | Capulator Junky | 1,626 | created |
| 25064HF | Cherry Paloma | 4,110 | created |
| 25064HM | Valley Dog | 1,495 | created |
| 250704H | Devil Driver | 1,074.3 | created |

### CSV-Import Batches (250704-250916 era) -- 12 batches

| Batch Number | Strain | Initial Weight (g) | Lifecycle State |
|-------------|--------|-------------------|----------------|
| 250704HA | Lemondary | 8,786.5 | bulk_available |
| 250704HB | Tahoe Larry | 1,193.1 | created |
| 250704HC | Animal Tsunami | 1,468 | created |
| 250704HD | Chemlatto | 9 | created |
| 250704HF | Magic Marker | 4,976.5 | created |
| 250704HH | Z Marker | 4,347.09 | bulk_available |
| 250704HI | Z Chem | 5,530.2 | created |
| 25074HA | Lemondary | 431 | created |
| 250916-ASU | Animal Tsunami | 5,114.9 | created |
| 250916-BLP | Blue Pave | 2,426.5 | bulk_available |
| 250916-CAP | Capulator Junky | 861.3 | created |
| 250916-CHL | Chemlatto | 2,972.8 | created |

### CSV-Import Batches with NULL Strain (5 batches -- need mapping)

| Batch Number | Initial Weight (g) | Lifecycle State |
|-------------|-------------------|----------------|
| 250916-CHP | 10,870 | created |
| 250916-MGM | 4,983 | created |
| 250916-SSM | 5,590 | **bucked** |
| 250916-WTD | 5,905 | created |
| 250916-ZMK | 2,442 | **bucked** |

**Note:** These 5 batches have null `strain_id` values. Based on batch number suffixes, the likely mappings are:
- 250916-CHP -> Cherry Paloma (CHP)
- 250916-MGM -> Magic Marker (MGM)
- 250916-SSM -> Silver Marker (SSM)
- 250916-WTD -> White Devil (WTD)
- 250916-ZMK -> Z Marker (ZMK)

### November 2025 Active Batches (251105 series) -- 10 batches

These are the primary active batches with real inventory.

| Batch Number | Strain | Initial Weight (g) | Lifecycle State |
|-------------|--------|-------------------|----------------|
| 251105-ASU | Animal Tsunami | 7,216 | bulk_available |
| 251105-BLM | Black Maple | 7,278 | bulk_available |
| 251105-DOG | Dog Walker | 11,132 | bulk_available |
| 251105-GAS | Gas Face | 6,270 | bulk_available |
| 251105-MGM | Magic Marker | 7,149 | bulk_available |
| 251105-SMA | Smackles | 4,588 | created |
| 251105-SSM | Silver Marker | 7,126 | created |
| 251105-SWF | Swamp Water Fumez | 4,890 | bulk_available |
| 251105-TIZ | Trillionz | 5,790 | created |
| 251105-DOG | Dog Walker | 11,132 | bulk_available |

### Additional Batches (late 2025 + cultivation) -- 17 batches

| Batch Number | Strain | Initial Weight (g) | Lifecycle State | Notes |
|-------------|--------|-------------------|----------------|-------|
| 250916-DOG | Dog Walker | 5,355.7 | bulk_available | |
| 250916-GAS | Gas Face | 911 | created | |
| 250916-PBB | Peanut Butter Breath | 1,979.2 | created | |
| 250916-SWF | Swamp Water Fumez | 6,216.6 | created | |
| 251231-FLF | _(null strain)_ | null | created | Null strain |
| 251231-GAP | _(null strain)_ | null | created | Null strain |
| 260105-DIF | Dante's Inferno | null | pre_harvest | Cultivation |
| 260112-CHL | Chemlatto | null | pre_harvest | Cultivation |
| 260114-ASU | _(null strain)_ | null | created | Null strain |
| 260120-DON | Donny Burger | null | pre_harvest | Cultivation |
| 260128-PPB | Peanut Butter Breath | null | pre_harvest | Cultivation |
| 260202-STP | Stay Puft | null | pre_harvest | Cultivation |
| 260207-THL | Tahoe Larry | null | pre_harvest | Cultivation |
| 260211-ZCH | Z Chem | null | pre_harvest | Cultivation |
| 260214-ZMK | Z Marker | null | pre_harvest | Cultivation |
| 260220-DIF | Dante's Inferno | 2,340 | created | Harvested |
| 260220-STP | Stay Puft | 36,348 | created | Harvested |
| 260225-DON | Donny Burger | null | pre_harvest | Cultivation |

---

## 10. Inventory Snapshot (Non-Zero Items)

Only items with `on_hand_qty > 0` are listed. All quantities in grams unless noted as "unit".

### Animal Tsunami (251105-ASU)

| Product Name | On Hand | Available | Reserved | Unit |
|-------------|---------|-----------|----------|------|
| Animal Tsunami - Binned | 1,096 | 1,096 | 0 | g |
| Animal Tsunami - Binned | 1,160 | 1,160 | 0 | g |
| Animal Tsunami - Bulk Flower (Bucked) | 2,200 | 2,200 | 0 | g |
| Animal Tsunami - Bulk Flower (Bucked) | 3,120 | 3,120 | 0 | g |
| Bulk Flower (Bucked) | 500 | 500 | 0 | g |
| Packaged - Animal Tsunami - 3.5g Flower | 68 | 68 | 0 | unit |
| **Totals (bulk grams):** | **8,076g** | **8,076g** | **0** | |

### Black Maple (251105-BLM)

| Product Name | On Hand | Available | Reserved | Unit |
|-------------|---------|-----------|----------|------|
| Black Maple - Bulk Flower (Bucked) | 1,200 | 1,200 | 0 | g |
| Black Maple - Bulk Flower (Bucked) | 1,200 | 1,200 | 0 | g |
| Bucked - Chembanger - Flower | 800 | 800 | 0 | g |
| Bucked - Chembanger - Flower | 1,600 | 1,600 | 0 | g |
| Bucked - Chembanger - Smalls | 800 | 400 | **400** | g |
| Bulk Flower (Bucked) | 1,600 | 1,600 | 0 | g |
| Bulk Flower (Bucked) | 454 | 454 | 0 | g |
| Bulk Flower (Bucked) | 600 | 600 | 0 | g |
| Bulk Flower (Bucked) | 200 | 200 | 0 | g |
| Bulk Flower (Bucked) | 800 | 800 | 0 | g |
| Bulk Flower (Bucked) | 800 | 800 | 0 | g |
| Bulk Flower (Trimmed) | 300 | 300 | 0 | g |
| Bulk Flower (Trimmed) | 400 | 400 | 0 | g |
| Bulk Flower (Trimmed) | 300 | 0 | **300** | g |
| Bulk Smalls (Bucked) | 191 | 191 | 0 | g |
| Bulk Smalls (Trimmed) | 200 | 200 | 0 | g |
| Packaged - Black Maple - 14g Smalls | 26 | 21 | **5** | unit |
| Packaged - Black Maple - 3.5g Flower | 228 | 228 | 0 | unit |
| **Totals (bulk grams):** | **11,445g** | **10,745g** | **700g** | |

### Dog Walker (251105-DOG)

| Product Name | On Hand | Available | Reserved | Unit |
|-------------|---------|-----------|----------|------|
| Bulk Flower (Bucked) | 500 | 500 | 0 | g |
| Bulk Flower (Trimmed) | 50 | 50 | 0 | g |
| Dog Walker - Binned | 732 | 732 | 0 | g |
| Dog Walker - Binned | 1,226 | 1,226 | 0 | g |
| Dog Walker - Binned | 394 | 394 | 0 | g |
| Dog Walker - Binned | 1,232 | 1,232 | 0 | g |
| Dog Walker - Binned | 1,300 | 1,300 | 0 | g |
| Dog Walker - Binned | 630 | 630 | 0 | g |
| Dog Walker - Binned | 1,158 | 1,158 | 0 | g |
| Dog Walker - Binned | 988 | 988 | 0 | g |
| Dog Walker - Bulk Flower (Bucked) | 2,600 | 2,000 | **600** | g |
| **Totals (bulk grams):** | **10,810g** | **10,210g** | **600g** | |

### Gas Face (251105-GAS)

| Product Name | On Hand | Available | Reserved | Unit |
|-------------|---------|-----------|----------|------|
| Bucked - Gas Face - Smalls | 1,035 | 517.5 | **517.5** | g |
| Bucked - Gas Face - Smalls | 922 | 461 | **461** | g |
| Bulk Flower (Bucked) | 600 | 600 | 0 | g |
| Bulk Flower (Bucked) | 400 | 400 | 0 | g |
| Bulk Flower (Bucked) | 600 | 600 | 0 | g |
| Bulk Trim (Trimmed) | 86 | 86 | 0 | g |
| _(null product_name)_ | 1,640 | _(null)_ | 0 | g |
| **Totals (bulk grams):** | **5,283g** | **2,664.5g** | **978.5g** | |

### Magic Marker (251105-MGM)

| Product Name | On Hand | Available | Reserved | Unit |
|-------------|---------|-----------|----------|------|
| Bulk Flower (Bucked) | 300 | 300 | 0 | g |
| Bulk Flower (Bucked) | 300 | 300 | 0 | g |
| Bulk Flower (Bucked) | 1,000 | 1,000 | 0 | g |
| Bulk Flower (Bucked) | 300 | 300 | 0 | g |
| Bulk Flower (Bucked) | 500 | 500 | 0 | g |
| Bulk Flower (Trimmed) | 400 | 400 | 0 | g |
| Bulk Trim (Trimmed) | 100 | 100 | 0 | g |
| Magic Marker - Binned | 1,180 | 0 | **1,180** | g |
| Magic Marker - Binned | 1,160 | 1,160 | 0 | g |
| Packaged - Magic Marker - 3.5g Flower | 57 | 57 | 0 | unit |
| **Totals (bulk grams):** | **5,240g** | **4,060g** | **1,180g** | |

### Silver Marker (251105-SSM)

| Product Name | On Hand | Available | Reserved | Unit |
|-------------|---------|-----------|----------|------|
| Silver Marker - Binned | 874 | 874 | 0 | g |
| Silver Marker - Binned | 1,258 | 1,258 | 0 | g |
| Silver Marker - Binned | 1,712 | 1,712 | 0 | g |
| Silver Marker - Binned | 1,436 | 1,436 | 0 | g |
| **Totals:** | **5,280g** | **5,280g** | **0** | |

### Smackles (251105-SMA)

| Product Name | On Hand | Available | Reserved | Unit |
|-------------|---------|-----------|----------|------|
| Smackles - Binned | 838 | 838 | 0 | g |
| Smackles - Binned | 544 | 544 | 0 | g |
| Smackles - Binned | 1,902 | 1,902 | 0 | g |
| Smackles - Binned | 832 | 832 | 0 | g |
| Smackles - Binned | 472 | 472 | 0 | g |
| **Totals:** | **4,588g** | **4,588g** | **0** | |

### Swamp Water Fumez (251105-SWF)

| Product Name | On Hand | Available | Reserved | Unit |
|-------------|---------|-----------|----------|------|
| Bulk Flower (Bucked) | 400 | 400 | 0 | g |
| Bulk Flower (Bucked) | 400 | 400 | 0 | g |
| Bulk Flower (Trimmed) | 400 | 400 | 0 | g |
| Bulk Smalls (Bucked) | 500 | 500 | 0 | g |
| Bulk Smalls (Bucked) | 88 | 88 | 0 | g |
| Packaged - Swamp Water Fumez - 3.5g Flower | 32 | 32 | 0 | unit |
| Packaged Products | 285 | 285 | 0 | unit |
| Packaged Products | 52 | 52 | 0 | unit |
| **Totals (bulk grams):** | **1,788g** | **1,788g** | **0** | |

### Trillionz (251105-TIZ)

| Product Name | On Hand | Available | Reserved | Unit |
|-------------|---------|-----------|----------|------|
| Trillionz - Binned | 1,310 | 1,310 | 0 | g |
| Trillionz - Binned | 1,330 | 1,330 | 0 | g |
| Trillionz - Binned | 1,612 | 1,612 | 0 | g |
| Trillionz - Binned | 1,538 | 1,538 | 0 | g |
| **Totals:** | **5,790g** | **5,790g** | **0** | |

### Inventory Grand Totals

| Strain | On Hand (g) | Available (g) | Reserved (g) |
|--------|------------|--------------|-------------|
| Animal Tsunami | 8,076 | 8,076 | 0 |
| Black Maple | 11,445 | 10,745 | 700 |
| Dog Walker | 10,810 | 10,210 | 600 |
| Gas Face | 5,283 | 2,664.5 | 978.5 |
| Magic Marker | 5,240 | 4,060 | 1,180 |
| Silver Marker | 5,280 | 5,280 | 0 |
| Smackles | 4,588 | 4,588 | 0 |
| Swamp Water Fumez | 1,788 | 1,788 | 0 |
| Trillionz | 5,790 | 5,790 | 0 |
| **GRAND TOTAL** | **58,300g** | **53,201.5g** | **3,458.5g** |

Plus packaged unit inventory:
- 68 units ASU 3.5g Flower
- 228 units BLM 3.5g Flower, 26 units BLM 14g Smalls
- 57 units MGM 3.5g Flower
- 32 units SWF 3.5g Flower, 337 units SWF Packaged Products

**Inventory Data Issues:**
- Some "Bucked - Chembanger" items are actually Black Maple strain (batch 251105-BLM) -- naming mismatch
- Gas Face has an item with null `product_name` and null `available_qty` but 1,640g on_hand
- "Packaged Products" generic naming on SWF items

---

## 11. App Settings (34 Entries)

### Company Identity

| Key | Value |
|-----|-------|
| company_name | Cult Cannabis Co. |
| company_brand_name | CULT Cannabis |
| company_entity_name | Syn-Ag Inc. |
| company_license_name | Kind Meds Inc |
| company_license_number | 00000078DCBK00628996 |
| company_phone | _(empty)_ |
| company_address | 3303 South 40th Street |
| company_city | Phoenix |
| company_state | AZ |
| company_postal_code | 85040 |
| company_logo_path | _(empty -- legacy, use logo URLs below)_ |

### Branding / Logos

| Key | Value |
|-----|-------|
| logo_light_url | `https://fonreynkfeqywshijqpi.supabase.co/storage/v1/object/public/company-assets/logos/light-logo-1760672792950.png` |
| logo_dark_url | `https://fonreynkfeqywshijqpi.supabase.co/storage/v1/object/public/company-assets/logos/dark-logo-1760672823201.png` |
| logo_invoice_url | `https://fonreynkfeqywshijqpi.supabase.co/storage/v1/object/public/company-assets/logos/invoice-logo-1760672839846.png` |
| logo_label_url | `https://fonreynkfeqywshijqpi.supabase.co/storage/v1/object/public/company-assets/logos/label-logo-1760672849112.png` |
| logo_eye_url | `https://fonreynkfeqywshijqpi.supabase.co/storage/v1/object/public/company-assets/logos/eye-logo-1760673044713.png` |
| logo_upload_date | 2025-10-17T03:50:45.529Z |
| storage_bucket_name | company-assets |

**Note:** These logo URLs point to the Bolt.new Supabase storage bucket. Logos will need to be re-uploaded to the new instance and these URLs updated accordingly.

### Routing / Facility

| Key | Value |
|-----|-------|
| facility_address | 3303 South 40th Street |
| facility_city | Phoenix |
| facility_state | AZ |
| facility_postal_code | 85040 |
| facility_latitude | 33.417454 |
| facility_longitude | -111.994514 |
| routing_api_provider | openrouteservice |
| routing_api_key | eyJvcmci... _(truncated for security)_ |
| route_cache_days | 30 |

### Operations

| Key | Value |
|-----|-------|
| default_overage_percentage | 10 |
| packaging_lead_time_days | 1 |
| trim_lead_time_days | 2 |
| notification_threshold_days | 7 |

### Testing

| Key | Value |
|-----|-------|
| test_mode_enabled | false |
| test_mode_audit_retention_days | 30 |

---

## 12. User Profiles (10 Users)

| Name | Email | Role | Active |
|------|-------|------|--------|
| Justin Morrow | justin@cultcannabis.co | admin | Yes |
| James Gomez | james@cultcannabis.co | admin | Yes |
| Samantha Dockery | sam@cultcannabis.co | admin | Yes |
| Scott Tucker | scott@cultcannabis.co | admin | Yes |
| Greg Dunaway | greg@cultcannabis.co | admin | Yes |
| **Dave Low** | **david@cultcannabis.c** | admin | Yes |
| Josie Olvera | josie@cultcannabis.co | manager | Yes |
| Laura Gonzalez | laura@cultcannabis.co | manager | Yes |
| Leo Groulx | leo@cultcannabis.co | user | Yes |
| Ynez Cross | ynez_cross@yahoo.com | user | Yes |

**Data Issue:** Dave Low's email is `david@cultcannabis.c` -- missing the "o" in `.co`. This needs to be corrected when recreating the user in the new instance.

---

## 13. Delivery Fleet

### Drivers

| Name | FA Number | Active |
|------|-----------|--------|
| Justin Morrow | 555555555555 | Yes |

### Vehicles

| Year | Make | Model | License Plate | VIN | Active |
|------|------|-------|--------------|-----|--------|
| 2017 | Honda | Civic | CET4783 | 0000000000000001 | Yes |

---

## 14. Cultivation Infrastructure

### Grow Rooms (11 rooms)

| Name | Room Code | Room Type | Active |
|------|-----------|-----------|--------|
| Mother Room | MOM-01 | mother | Yes |
| Veg Room 1 | VEG-01 | veg | Yes |
| Veg Room 02 | VEG-02 | veg | Yes |
| Veg Room 03 | VEG-03 | veg | Yes |
| Flower Room 03 | FLW-03 | flower | Yes |
| Flower Room 06 | FLW-06 | flower | Yes |
| Flower Room 07 | FLW-07 | flower | Yes |
| Flower Room 08 | FLW-08 | flower | Yes |
| **Flower Room 09** | **FLW-09** | flower | **No** |
| Flower Room 10 | FLW-10 | flower | Yes |
| Flower Room 11 | FLW-11 | flower | Yes |

**Note:** Veg Room naming is inconsistent ("Veg Room 1" vs "Veg Room 02"). FLW-09 is inactive.

### Dry Rooms (3 rooms)

| Name | Room Code | Active |
|------|-----------|--------|
| Dry Room 01 | DRY-01 | Yes |
| Dry Room 02 | DRY-02 | Yes |
| Dry Room 03 | DRY-03 | Yes |

### Room Tables

- 1 table in Flower Room 08 (FLW-08), 144 sqft, with 4 active sections

### Cultivation Activity (test data -- will NOT carry forward)

- 11 plant groups, 153 individual plants
- 2 harvest sessions (Stay Puft 36,348g and Dante's Inferno 2,340g)

---

## 15. Session & Operational Data Summary

This is all test/development data created during system buildout. **None of this carries forward to the new database.**

| Table | Count | Notes |
|-------|-------|-------|
| Orders | 132 | 88 submitted, 12 accepted, 31 completed, 1 ready_for_delivery |
| Order Items | 576 | |
| Bucking Sessions | 36 | |
| Trim Sessions | 31 | |
| Packaging Sessions | 16 | |
| Inventory Items | 122 | 72 with on_hand > 0 |
| Inventory Movements | 227 | |
| COA Documents | 0 | (files may exist in storage bucket) |
| Labels | 29 | |
| Invoices | 3 | |
| Coversheets | 5 | |
| Manifests | 0 | |
| Plant Groups | 11 | |
| Individual Plants | 153 | |
| Harvest Sessions | 2 | |

---

## 16. Data Quality Issues

### Must Fix Before Go-Live

1. **Dave Low's email typo** -- `david@cultcannabis.c` should be `david@cultcannabis.co`
2. **3 strains with incomplete metadata** -- Dante's Inferno, Devil Driver, Strawguava need dominance_type and category
3. **Fresh Frozen product type description typo** -- "Fresh Frozdn" should be "Fresh Frozen"
4. **Deep Story product type** has empty applicable_stages -- should either be configured or deactivated
5. **Earth's Healing ATO number** is "4444" -- likely placeholder, needs real value

### Should Fix During Migration

6. **5 batches with null strain_id** -- 250916-CHP, 250916-MGM, 250916-SSM, 250916-WTD, 250916-ZMK (mappings noted in Section 9)
7. **3 recent batches with null strain_id** -- 251231-FLF, 251231-GAP, 260114-ASU
8. **FWA, INC (Farm Fresh)** -- no address, license, or ATO data
9. **Nature Med** -- missing street address
10. **company_phone** -- empty, should be populated
11. **Veg Room naming inconsistency** -- "Veg Room 1" vs "Veg Room 02"/"Veg Room 03"

### Informational (No Action Required)

12. Inventory naming inconsistencies (Bucked-Chembanger vs Black Maple) -- artifacts of test session processing, inventory will be loaded fresh
13. Null product_name on Gas Face inventory item -- same as above, test artifact
14. Logo URLs reference Bolt.new storage -- will need new URLs after logo re-upload

---

## 17. What Carries Forward vs. What Gets Left Behind

### CARRY FORWARD (Seed Into New Database)

These tables contain production reference data that must be recreated in the new instance:

| Table | Records | Notes |
|-------|---------|-------|
| strains | 43 | Fix 3 incomplete metadata entries |
| product_stages | 4 | Exact copy |
| product_types | 15 | Fix Fresh Frozen typo, review Deep Story |
| products | 820 active | Active products only, skip 229 archived |
| customers | 38 | All accounts (active + prospect) |
| quality_grades | 5 | Exact copy |
| label_types | 4 | Exact copy |
| conversion_rates | 2 | Exact copy |
| app_settings | 34 | Update logo URLs after re-upload |
| grow_rooms | 11 | Include inactive FLW-09 |
| dry_rooms | 3 | Exact copy |
| delivery_drivers | 1 | Verify FA number |
| delivery_vehicles | 1 | Verify VIN |
| user_profiles | 10 | Recreate via auth, fix Dave's email |

### LEAVE BEHIND (Test/Development Data)

These tables contain test data from development. They will NOT be migrated:

| Table | Records | Reason |
|-------|---------|--------|
| inventory_items | 122 | Will be loaded fresh from physical audit |
| inventory_movements | 227 | Test movements |
| batch_registry | 65 | Will be created fresh as new inventory is entered |
| trim_sessions | 31 | Test sessions |
| packaging_sessions | 16 | Test sessions |
| bucking_sessions | 36 | Test sessions |
| orders | 132 | Test orders |
| order_items | 576 | Test order items |
| coa_documents | 0 | Will upload fresh |
| labels | 29 | Test labels |
| invoices | 3 | Test invoices |
| coversheets | 5 | Test coversheets |
| manifests | 0 | N/A |
| plant_groups | 11 | Cultivation test data |
| individual_plants | 153 | Cultivation test data |
| harvest_sessions | 2 | Cultivation test data |
| conversion_packages | various | Test session artifacts |
| pending_conversions (view) | various | Derived from session data |
| package_assignments | various | Test assignments |
| inventory_reservations | various | Test reservations |
| crm_activity_log | various | CRM test data |
| customer_contacts | 0 | Empty |
| sales_rep_assignments | 0 | Empty |

---

_End of Go-Live Data Reference_
