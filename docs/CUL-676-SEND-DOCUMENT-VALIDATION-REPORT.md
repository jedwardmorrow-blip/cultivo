# CUL-676 Validation Report: send-document Edge Function

**Date**: 2026-04-04
**QA Engineer**: Agent 95a542ae-9425-42c3-82be-c6ba5a796551
**Status**: ⛔ BLOCKED - Critical security and data integrity issues identified

## Executive Summary

The `send-document` edge function (added in commit `ff6b2e5`, CUL-470) implements email delivery for invoices, COAs, and manifests. However, **two critical blockers prevent production deployment**:

1. **SMTP Credentials Not in Vault** — Plain env var storage violates Vault RPC pattern established in metrc-sync migration
2. **Multi-Page Invoice Truncation** — Orders with >8 line items lose invoice data; line items are silently dropped

---

## Issue #1: SMTP Credentials Not Vault-Protected

### Location
`supabase/functions/send-document/index.ts`, lines 36-45 (createTransport function)

### Current Code
```typescript
function createTransport() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: Deno.env.get("GMAIL_USER"),
      pass: Deno.env.get("GMAIL_APP_PASSWORD"),  // ⚠️ Plaintext env var
    },
  });
}
```

### Problem
- Credentials are read from Deno environment variables (unencrypted, visible in logs/configs)
- Violates the Vault RPC security pattern established in metrc-sync (CUL-470 same commit)
- No credential rotation support
- No audit trail for credential access

### Expected Pattern (from metrc-sync)
The parallel metrc-sync migration (same commit) correctly implements Vault RPC pattern:
```typescript
// In metrc-sync verify_credentials operation:
const { data, error } = await supabase.rpc('get_metrc_api_key', { p_state_code: state });
// ✅ Credentials retrieved from Vault, not env vars
```

### Impact
- **Severity**: Critical (credential compromise = unauthorized email delivery)
- **Risk**: If GMAIL_APP_PASSWORD is leaked, attacker can:
  - Send fraudulent invoices to customers
  - Exfiltrate invoice data via email headers
  - DOS customer email delivery

### Required Fix
Implement Vault RPC for SMTP credentials (parallel to metrc-sync pattern):
1. Create `get_smtp_credentials()` RPC in Supabase (returns user + pass from Vault)
2. Refactor `createTransport()` to call RPC instead of reading env vars
3. Add changelog entry documenting security improvement

---

## Issue #2: Multi-Page Invoices Truncate Data

### Location
`supabase/functions/send-document/index.ts`, lines 258-261 (generateInvoicePdf)

### Current Code
```typescript
for (const item of inv.line_items) {
  if (y < 120) {
    // Would need a new page — keep simple for now
    break;  // ⚠️ SILENT DATA LOSS
  }
  // ... render line item ...
}
```

### Problem
- Invoices with more than 8 line items silently truncate
- Remaining line items are **completely omitted** from PDF
- No error logged; no indication to user that data was lost
- Customer receives invoice with incorrect line items/totals

### Data Loss Scenario
Example order with 12 line items:
- Line items 1-8 rendered correctly
- Lines 9-12 silently dropped
- PDF totals may not match order amounts in database
- Customer sees incorrect invoice

### Impact
- **Severity**: Critical (revenue/compliance risk)
- **Likelihood**: High (common for bulk/wholesale orders)
- **Compliance**: Violates CA BCC cannabis track-and-trace requirements (complete invoice documentation)

### Required Fix
Implement multi-page PDF generation:
1. Add page break detection + new page creation (similar to trip plan PDF in CUL-684)
2. Continue line item rendering on new pages
3. Repeat header/footer on each page
4. Adjust totals calculation for page breaks
5. Add test case for 20+ line item invoices

---

## Validation Checklist

The send-document function was NOT validated against these requirements:

- [ ] **Security**: SMTP credentials stored in Vault (not env vars)
- [ ] **Data Integrity**: Multi-page invoice support for >8 line items
- [ ] **Error Handling**: Explicit errors logged when truncation would occur
- [ ] **Audit Trail**: Email send attempts logged with success/failure reason
- [ ] **Testing**: Unit tests for edge cases (empty items, many items, special chars)

## Current State

✅ **Implemented**:
- Invoice PDF generation (single page)
- Email routing by recipient role (AP for invoice, Compliance for COA)
- email_send_log write for audit trail
- Gmail SMTP delivery
- COA attachment collection from storage

❌ **Missing**:
- Vault RPC for SMTP credential storage
- Multi-page invoice support
- Pre-send validation (e.g., check line item count, warn if truncation would occur)

---

## Next Actions

**Before Production Deployment**:

1. **Builder Task**: Implement Vault RPC for SMTP credentials
   - Follow metrc-sync pattern from CUL-470
   - Ensure backward compatibility with env var fallback during migration

2. **Builder Task**: Implement multi-page invoice PDF
   - Add page break logic when y < 120
   - Test with 20+ line item orders
   - Verify totals remain accurate across pages

3. **QA Re-Validation**: After Builder fixes
   - Test end-to-end email delivery with real customer scenarios
   - Verify Vault credentials are never logged in edge function output
   - Confirm 20+ line item invoices render correctly
   - Validate email_send_log audit entries

---

## References

- **Metrc Vault Migration** (CUL-470): `supabase/functions/metrc-sync/index.ts` — exemplar RPC pattern
- **Trip Plan Multi-Page PDF** (CUL-684): `src/features/delivery/services/tripPlanPDF.service.ts` — exemplar multi-page handling
- **Current Implementation**: `supabase/functions/send-document/index.ts` (697 lines)
- **Service Wrapper**: `src/features/delivery/services/dispatch.service.ts` (255-276)

---

## Filed By

Agent 95a542ae-9425-42c3-82be-c6ba5a796551 (QA Engineer)
Heartbeat Session: 2026-04-04, Validation Phase 2
