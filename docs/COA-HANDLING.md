---
title: COA-HANDLING
category: Sales & Fulfillment
version: 1.4
updated: 2026-01-22
---

# COA-HANDLING - Certificate of Analysis Management

> **Status:** Documented (Evidence-Based)
> **Purpose:** Defines COA upload, storage, batch linkage, and public access for compliance
> **Foundation:** COAs attach to batches, not individual packages - batch-scoped compliance
> **Critical:** COA must be active before batch can be shipped to customers

---

## TABLE OF CONTENTS

1. [Purpose](#purpose)
2. [Batch-COA Relationship](#batch-coa-relationship) ⭐ **IMPORTANT**
3. [Architecture Overview](#architecture-overview)
4. [COA Upload Workflow](#coa-upload-workflow)
5. [COA Validation](#coa-validation)
6. [Public COA Access](#public-coa-access)
7. [Implementation Status](#implementation-status)

---

## Purpose

The COA-Handling module manages Certificates of Analysis (lab test results) throughout their lifecycle:
- COA upload and parsing (PDF files)
- **Batch linkage** (COAs attach to harvest batches, not individual packages)
- COA validation and activation
- Public COA hosting for compliance
- COA display on labels, coversheets, and manifests

**Critical Principle:** COAs are **batch-scoped**. One COA tests a representative sample of the entire batch. All products derived from that batch reference the same COA.

---

## Batch-COA Relationship

> **Why This Matters:** Attaching COAs to batches (not individual packages) reflects how lab testing actually works. Labs test a sample from the batch, not every single package.

### COAs Are Batch-Scoped

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COA ← ATTACHED TO BATCH, NOT PACKAGES             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  batch_registry                                                      │
│       ├─── batch_number: "250106-GSC"                                │
│       ├─── strain: "Girl Scout Cookies"                              │
│       ├─── harvest_date: 2025-01-06                                  │
│       │                                                               │
│       └─── coa_id: FK to certificates_of_analysis                    │
│            │                                                          │
│            └─── certificates_of_analysis                             │
│                 ├─── test_date: 2025-01-15                           │
│                 ├─── thc_percent: 25.4                               │
│                 ├─── cbd_percent: 0.2                                │
│                 ├─── file_url: Storage bucket URL                    │
│                 ├─── is_active: true (required for shipment)         │
│                 └─── batch_id: Links back to batch                   │
│                                                                       │
│  ALL PACKAGES FROM THIS BATCH REFERENCE THE SAME COA:               │
│  ───────────────────────────────────────────────────────────────   │
│  • Package 250106-GSC-PK-001 → COA via batch_id                      │
│  • Package 250106-GSC-PK-002 → COA via batch_id                      │
│  • Package 250106-GSC-PK-003 → COA via batch_id                      │
│  • (all 100+ packages inherit same COA)                              │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Batch-COA Linkage Is Critical

**Batch-scoped COAs enable:**
- ✅ **Lab Testing Reflects Reality:** Labs test batch samples, not individual units
- ✅ **Compliance Documentation:** Coversheets/manifests show batch COA
- ✅ **Customer Confidence:** Public COA library accessible by batch number
- ✅ **Regulatory Compliance:** State law requires COA availability per batch

**Current Gaps:**
- **GAP-009:** Multiple active COAs per batch allowed
  - **Impact:** HIGH - Unclear which COA is current for batch
  - **Resolution:** ✅ Migration Batch 1 adds unique partial index

See: [BATCHES.md](./BATCHES.md) for complete batch architecture, [DOCS-INTEGRATION-PROGRESS.md](./DOCS-INTEGRATION-PROGRESS.md#implementation-gaps-dashboard) for gap tracking.

---

## Architecture Overview

**Database Tables:**
- `certificates_of_analysis` - COA metadata and parsed test results
- `batch_registry.coa_id` - FK linking batch to COA
- Storage bucket: `coa-documents` - PDF file storage

**Key Fields:**
- `batch_id` - Which batch this COA tests
- `test_date` - When lab performed analysis
- `thc_percent`, `cbd_percent` - Primary cannabinoid levels
- `is_active` - Whether COA is current (required true for shipment)
- `file_url` - Public URL to PDF in storage bucket

---

## COA Upload Workflow

**Step 1: Access COA Upload**
- Navigate to Batch Management page
- Locate the batch needing a COA
- Click "Upload COA" button in the batch row
- System opens COA upload wizard with batch pre-selected

**Step 2: Upload PDF File**
- Select single COA PDF file
- System automatically parses PDF for cannabinoid data
- Extracts: strain, batch number, dates, THC%, CBD%, cannabinoids%, terpenes
- File uploads to `coa-pdfs` storage bucket

**Step 3: Confirm Batch Match (if needed)**
- If parsed strain/batch doesn't match selected batch, system shows warning
- User must explicitly confirm mismatch before proceeding
- Prevents accidental wrong COA assignments

**Step 4: Review & Edit Extracted Data**
- Review all parsed data (harvest date, sample date, THC%, CBD%, total cannabinoids%, terpenes)
- Top 3 terpenes automatically saved (ordered by volume)
- Make adjustments if parsing misread values
- Edit any cannabinoid percentages or dates as needed

**Step 5: Save COA**
- File path saved as `pdf_file_path` in database
- Set `is_active = true`
- Link COA to batch (`batch_id` FK + `coa_id` bidirectional)
- Batch now ready for packaging/shipment

**Note:** COA upload consolidated into Batch Management (as of 2026-01-22). Previous Settings > Certificates interface removed. This provides better UX with batch context pre-selected.

---

## COA Validation

**Required Before Shipment:**
- ✅ `is_active = true` (COA current and valid)
- ✅ `batch_registry.coa_id` not null (batch has COA)
- ✅ Test results within compliance thresholds (if applicable)

**Current Gap (GAP-007):**
- No trigger validates COA active before generating labels
- **Impact:** CRITICAL - Invalid labels could be printed
- **Resolution:** 🟡 Migration Batch 2 planned

---

## Public COA Access

**Public COA Library:**
- URL pattern: `/public/coa-library`
- Lists all active COAs by strain and batch number
- Download PDF directly from storage bucket
- Required for customer transparency and regulatory compliance

**Integration Points:**
- Labels: QR code → COA PDF
- Coversheets: COA info embedded in compliance section
- Manifests: COA reference for each batch

---

## Implementation Status

**Completed Features:**
- ✅ COA upload and storage to `coa-pdfs` bucket
- ✅ COA management interface consolidated in Batch Management (Settings interface removed)
- ✅ Advanced PDF parsing with auto-extraction of cannabinoid data and terpenes
- ✅ Batch mismatch detection with required manual confirmation
- ✅ Top 3 terpenes automatically extracted and saved
- ✅ Single-COA upload per batch with pre-selection
- ✅ Batch linkage via `batch_id` FK (bidirectional)
- ✅ Public COA library (read-only access at `/public/testing`)
- ✅ COA display on coversheets and manifests
- ✅ COA validation before packaging (UI + database trigger)

**Access Path:**
- Navigate to Settings > Batch Management tab
- Click "Upload COA" button next to any batch
- System parses PDF and validates batch match
- Review/edit extracted data
- COA automatically linked to selected batch

**Removed Features (2026-01-22):**
- ❌ Settings > Certificates (COA) tab - removed to consolidate workflow
- ❌ Bulk COA upload interface - simplified to single-batch uploads

**Critical Gaps:**
- **GAP-009:** Multiple active COAs per batch allowed
  - Status: ✅ Migration Batch 1 ready
- **GAP-007:** No COA validation before label generation
  - Status: 🟡 Migration Batch 2 planned

**See:** [DOCS-INTEGRATION-PROGRESS.md - Implementation Gaps Dashboard](./DOCS-INTEGRATION-PROGRESS.md#implementation-gaps-dashboard) for complete gap tracking.

**Recent Updates:**
- **2026-01-22:** Complete COA workflow consolidation (Session: COA-UPLOAD-BATCH-MANAGEMENT-FIX)
  - Fixed critical bugs: field mismatches, missing file upload, missing required fields
  - Added batch mismatch detection with required confirmation
  - Added automatic terpene extraction (top 3 by volume)
  - Removed Settings > Certificates tab to consolidate to single upload path
  - All COA uploads now happen in Batch Management for better UX
- **2026-01-21:** COA upload interface temporarily restored to Settings (later consolidated)
- **2026-01-19:** Database trigger added to validate COA before packaging sessions (Session COA-VAL-001)
