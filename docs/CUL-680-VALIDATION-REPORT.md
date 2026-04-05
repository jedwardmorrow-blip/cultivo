# CUL-680 Validation Report: Metrc Vault RPC Migration

**Date**: 2026-04-04
**Status**: ✅ PARTIAL (Edge functions validated, UI refactor needed)
**Severity**: 🔴 CRITICAL (Blocks credential save functionality)

---

## Summary

CUL-680 migrated Metrc API key storage from plaintext `api_key_encrypted` column to Supabase Vault with RPC pattern. Edge functions were correctly updated, but **UI component was not refactored**, creating a blocker for users saving credentials.

---

## Validation Results

### ✅ Edge Function: `metrc-sync/index.ts`

**Status**: PASSED
**Lines**: 302 total

**Operation: save_credential (lines 150-195)**
- ✅ Upserts `metrc_credentials` row (state_code, api_base_url, facility_license, is_active)
- ✅ Calls `db.rpc("store_metrc_api_key", {p_credential_id, p_state_code, p_api_key})` instead of direct column write
- ✅ Properly handles missing api_key (allows rotation without re-entering)

**Operation: verify_credentials (lines 201-237)**
- ✅ Calls `db.rpc("get_metrc_api_key", {p_state_code})` to retrieve secret from Vault
- ✅ Uses key to instantiate MetrcClient and verify via /facilities/v1 endpoint
- ✅ Returns structured error on Vault/Metrc failures

**Operation: sync_item_categories (lines 243-295)**
- ✅ Calls `db.rpc("get_metrc_api_key", {p_state_code})` to retrieve secret
- ✅ Fetches /items/v1/active and logs to metrc_sync_log with count + items payload

**Verdict**: All three operations correctly use Vault RPC pattern. No direct column access.

---

### ✅ Edge Function: `send-document/index.ts`

**Status**: PASSED
**Lines**: 697 total

**Invoice PDF Generation (lines 189-322)**
- ✅ Uses pdf-lib with proper Supabase storage image embedding
- ✅ Correct line item iteration, discounts, totals calculation
- ✅ Respects null fields (notes, discount_notes)

**COA Attachment Fetching (lines 387-431)**
- ✅ Fetches from Supabase storage bucket (coa_attachments)
- ✅ Properly handles batch lookups for packaging info

**Email Delivery (lines 436-697)**
- ✅ Gmail SMTP integration with role-based recipient resolution
- ✅ Correct logging to email_send_log table
- ✅ Dry-run support with comment-only output

**Verdict**: Complete implementation, no issues found.

---

### 🔴 Component: `MetrcCredentialsSettings.tsx`

**Status**: FAILED
**Lines**: 298 total
**Critical Issue**: Component not refactored after migration

#### Issue #1: Direct Column Write (Line 109)

```typescript
// CURRENT (BROKEN)
if (form.api_key) {
  payload.api_key_encrypted = form.api_key;  // ❌ Column removed in migration
}

const { error } = await supabase
  .from('metrc_credentials')
  .insert(payload)  // ❌ Will fail with constraint error
```

**Impact**: Users cannot save or rotate Metrc credentials. Component will throw database error when attempting insert/update.

**Expected Fix**: Call metrc-sync edge function instead:

```typescript
// EXPECTED (NOT YET IMPLEMENTED)
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

**Verdict**: Critical blocker for credential save functionality.

---

### 🔴 Type Definition: `settings.types.ts`

**Status**: FAILED
**Lines**: 86-94
**Issue**: Type definition not synchronized with schema

```typescript
export interface MetrcCredential {
  id: string;
  state_code: string;
  api_base_url: string;
  api_key_encrypted: string;  // ❌ Removed in migration, but still in type
  facility_license: string;
  is_active: boolean;
  created_at: string;
}
```

**Impact**: Type does not match actual database schema. Can mask bugs during development if code accesses this field.

**Expected Fix**: Remove `api_key_encrypted` field from interface.

**Verdict**: Type inconsistency with schema.

---

## Build Validation

```bash
npm run build  # ✅ PASSED
```

- 2812 modules transformed
- No TypeScript compilation errors
- No build warnings
- Vite output successful

**Note**: Build passes despite the runtime error, because TypeScript does not validate against Supabase column names — only component code type-checks.

---

## Findings Summary

| Component | Status | Issue | Severity |
|-----------|--------|-------|----------|
| metrc-sync edge function | ✅ Pass | — | — |
| send-document edge function | ✅ Pass | — | — |
| MetrcCredentialsSettings.tsx | 🔴 Fail | Line 109: writes removed column | 🔴 Critical |
| MetrcCredential type | 🔴 Fail | Line 90: references removed field | 🔴 Critical |

---

## Recommendations

### Immediate (Blocks Production)

1. **Builder Task**: Refactor `MetrcCredentialsSettings.tsx` to call `metrc-sync` edge function with `operation: save_credential`
   - Replace direct database writes (lines 108-110, 114-117, 121-125) with edge function invocation
   - Handle edge function error responses

2. **Type Cleanup**: Remove `api_key_encrypted: string;` from `MetrcCredential` interface in `settings.types.ts:90`

### Downstream (CUL-676)

Once above is fixed, validate CUL-676 (Vault Metrc credentials + send-document integration) to ensure full end-to-end flow.

---

## Next Steps

- [ ] Create subtask for Builder: MetrcCredentialsSettings refactor
- [ ] Create subtask for refactoring type definition
- [ ] Validate CUL-676 once above is fixed
