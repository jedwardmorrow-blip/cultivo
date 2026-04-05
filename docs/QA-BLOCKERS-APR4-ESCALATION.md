# QA Status Escalation: Critical Blockers Live in Codebase
**Date**: 2026-04-04
**Session**: QA Heartbeat (Context Reset)
**Status**: 🔴 BLOCKED — Two critical issues prevent production deployment

---

## Summary

QA validation identified **two critical blocker issues** that are currently live in the codebase:

1. **CUL-680**: `MetrcCredentialsSettings.tsx` writes to removed database column → users **cannot save Metrc credentials**
2. **send-document**: Invoice PDF generation **silently drops line items** when invoice exceeds 15 items → **data loss risk**

Both issues were flagged in validation reports on 2026-04-04 but remain unfixed in the main branch.

---

## Critical Blocker #1: CUL-680 Credential Save Broken

**File**: `src/features/settings/components/MetrcCredentialsSettings.tsx`
**Lines**: 109, 113
**Severity**: 🔴 CRITICAL
**Impact**: Users cannot save or rotate Metrc API credentials

### Issue

The CUL-680 migration moved Metrc API keys to Supabase Vault (RPC pattern), but the UI component was not refactored. It still attempts to write to the removed `api_key_encrypted` column:

```typescript
// LINE 109 - BROKEN
if (form.api_key) {
  payload.api_key_encrypted = form.api_key;  // ❌ Column removed in migration
}

const { error } = await supabase
  .from('metrc_credentials')
  .insert(payload)  // ❌ Will fail with constraint error
```

### Expected Behavior

Component must call the `metrc-sync` Edge Function to store credentials in Vault:

```typescript
// EXPECTED FIX
if (form.api_key) {
  const { error: saveErr } = await supabase.functions.invoke('metrc-sync', {
    body: {
      operation: 'save_credential',
      state_code: form.state_code,
      api_base_url: form.api_base_url,
      facility_license: form.facility_license,
      api_key: form.api_key,
    },
  });
  if (saveErr) throw saveErr;
}
```

### Related Type Definition Issue

**File**: `src/types/settings.types.ts`
**Line**: 90
**Issue**: `MetrcCredential` interface still references removed `api_key_encrypted` field

---

## Critical Blocker #2: send-document Invoice PDF Data Loss

**File**: `supabase/functions/send-document/index.ts`
**Line**: 260 (line item loop logic)
**Severity**: 🔴 CRITICAL
**Impact**: Invoices with >15 line items silently drop items

### Issue

Invoice PDF generation breaks out of line item loop when space runs out, silently truncating items:

```typescript
// LINE 260 - BROKEN
if (y < 120) {
  // Would need a new page — keep simple for now
  break;  // ❌ Silently exits loop, dropping remaining items
}
```

Orders with 16+ line items will have items silently dropped from the PDF without warning or error logging.

### Data Loss Risk

- Customer receives invoice missing products
- Payment dispute risk (charged for items not shown on invoice)
- No error log or status flag indicating truncation
- No audit trail of what was dropped

### Expected Behavior

Either:
1. Implement multi-page PDF support, OR
2. Reject invoices exceeding item limit with clear error, OR
3. Log error status='failed' with truncation reason

### Related High-Severity Issues

**Missing Email Credential Validation** (Line 42-43, 481):
- No null checks on `GMAIL_USER` and `GMAIL_APP_PASSWORD` env vars
- Edge function crashes at send time with generic error instead of failing fast
- Should validate at handler start and return clear "Gmail credentials not configured" error

**Silent COA Attachment Failures** (Lines 425-427):
- If Supabase Storage fetch fails, email sends without COAs
- Status logged as 'sent' (misleading for compliance recipients)
- Should set status='sent_incomplete' or fail the entire send

---

## Validation Report References

Complete validation findings available in:
- **CUL-680 Report**: `/docs/CUL-680-VALIDATION-REPORT.md`
- **send-document Report**: `/docs/QA-SEND-DOCUMENT-VALIDATION.md`

---

## Build Status

✅ `npm run build` passes (8.42s)
- TypeScript compilation: OK
- No type errors (validation issues are runtime-only)
- 2812 modules transformed successfully

**Note**: Build passes despite runtime errors because TypeScript does not validate database column names or business logic edge cases.

---

## Context DB Recurring Patterns

System-wide pattern analysis shows high frequency of critical issues:
- Database (critical): 10 occurrences
- Data quality (critical): 6 occurrences
- Architecture (critical): 6 occurrences
- Database (high): 11 occurrences
- Data quality (high): 9 occurrences

These patterns suggest systemic data integrity and architecture gaps beyond these two specific blockers.

---

## Action Items

### IMMEDIATE (Blocks Production)

1. **Builder: Fix CUL-680 MetrcCredentialsSettings refactoring**
   - Replace direct database writes (lines 108-110, 114-117, 121-125) with `metrc-sync` edge function invocation
   - Update `MetrcCredential` type to remove `api_key_encrypted` field
   - Test: User can save new Metrc credentials; rotation works without re-entering key

2. **Builder: Fix send-document Invoice PDF overflow**
   - Implement multi-page PDF support OR enforce item limit with clear error message
   - Add error logging when truncation would occur
   - Add validation: total attachment size < Gmail 25MB limit
   - Test: Generate PDF for 5-item, 15-item, 20-item orders; verify no silent truncation

3. **Builder: Fix missing env var validation in send-document**
   - Add null checks for GMAIL_USER and GMAIL_APP_PASSWORD at handler start
   - Return 500 with clear error message if credentials missing
   - Test: Function fails fast with clear error when env vars not configured

### DOWNSTREAM (After Above Fixed)

4. **QA: Validate CUL-676** (Vault Metrc + send-document end-to-end)
5. **DBA: Investigate recurring pattern root causes** (10+ critical database issues)

---

## Session Metadata

- **QA Agent**: 95a542ae-9425-42c3-82be-c6ba5a796551
- **Session Date**: 2026-04-04
- **Session Number**: 284
- **Context DB**: uayyhluztelnfxfvdhyt
- **Status**: Blocked (awaiting Builder fixes)
- **Tools Used**: supabase-mcp, paperclip (API access limited)

**Next Heartbeat**: Monitor for Builder PR on CUL-680 and send-document fixes; validate once merged.
