---
title: COA-HANDLING
category: Sales & Fulfillment
version: 1.2
updated: 2025-11-10
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

**Step 1: Upload PDF**
- Manager uploads COA PDF via UI
- File stored in `coa-documents` storage bucket
- `file_url` saved to database

**Step 2: Link to Batch**
- Manager selects batch number
- System checks if batch already has active COA:
  - If yes: Prompt to deactivate old COA or cancel
  - If no: Proceed with linkage

**Step 3: Parse & Validate**
- Extract test_date, THC%, CBD% from PDF (manual entry or OCR)
- Validate required fields present
- Set `is_active = true`

**Step 4: Update Batch**
- Set `batch_registry.coa_id = new_coa_id`
- Batch now ready for packaging/shipment

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
- ✅ COA upload and storage
- ✅ Batch linkage via `coa_id` FK
- ✅ Public COA library (read-only access)
- ✅ COA display on coversheets

**Critical Gaps:**
- **GAP-009:** Multiple active COAs per batch allowed
  - Status: ✅ Migration Batch 1 ready
- **GAP-007:** No COA validation before label generation
  - Status: 🟡 Migration Batch 2 planned

**See:** [DOCS-INTEGRATION-PROGRESS.md - Implementation Gaps Dashboard](./DOCS-INTEGRATION-PROGRESS.md#implementation-gaps-dashboard) for complete gap tracking.
