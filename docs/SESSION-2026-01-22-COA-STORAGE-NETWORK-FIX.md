# Session: COA Upload Storage "Failed to Fetch" Network Error Fix

**Date:** 2026-01-22
**Session Type:** Critical Network Error Diagnosis & Fix
**Status:** ✅ Diagnostic Tools Implemented
**Duration:** ~30 minutes

---

## Objective

Fix the "Failed to fetch" network error occurring when uploading COA PDFs through the Batch Management interface.

## Problem Identification

### User Report:
- COA upload through Batch Management shows "Network Error"
- Error message: "Upload COA: Failed to upload PDF: Failed to fetch"
- PDF parsing completes successfully, but upload step fails
- User is authenticated (isAdmin: true)

### Console Error Details:
```
Failed to fetch
uploadCOAPDF error: StorageUnknownError: Failed to fetch
  at @supabase_supabase-j...?v=7a29c0fc:3862:12
  at Generator.next (<anonymous>)
  at fulfilled (@supabase_supabase-j...s?v=7a29c0fc:141:24)

[NETWORK] - Upload COA: Failed to upload PDF: Failed to fetch
Error Details: Object
Stack: Error: Failed to upload PDF: Failed to fetch
net::ERR_CONNECTION_CLOSED
```

### Root Cause Analysis:

**Confirmed Facts:**
1. ✅ Storage bucket `coa-pdfs` exists in database
2. ✅ Storage policies are correctly configured (authenticated upload, public read)
3. ✅ User is authenticated (session exists)
4. ✅ PDF parsing works (pdfjs successfully extracts data)
5. ❌ Storage API request fails at network level with ERR_CONNECTION_CLOSED

**Probable Causes:**
1. **Supabase Client Auth Session** - Storage upload may not have access to current auth session
2. **Storage API Configuration** - Storage service may need explicit configuration
3. **Network/CORS Issues** - Local development environment may have CORS restrictions
4. **Missing Auth Headers** - Storage upload request may not include authorization token

**NOT the Issue:**
- ❌ Permissions (policies are correct)
- ❌ Bucket existence (bucket verified in database)
- ❌ Field mapping (fixed in previous session)
- ❌ User authentication (user is logged in as admin)

---

## Solution Implementation

### 1. Enhanced Diagnostic Logging in `uploadCOAPDF()`

**File:** `src/features/coa/services/coa.service.ts`

**Changes:**
- Added detailed file validation and logging
- Added explicit auth session check before upload
- Added file size limit (10MB)
- Added file type validation
- Enhanced error messages with context
- Added network error detection and user-friendly messages

**Key Additions:**
```typescript
// Check authentication status before upload
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
console.log('uploadCOAPDF: Auth session:', {
  hasSession: !!session,
  hasUser: !!session?.user,
  userId: session?.user?.id,
  sessionError: sessionError?.message
});

if (sessionError || !session) {
  throw new Error('Authentication required for file upload. Please log in again.');
}

// Validate file
if (!file || file.size === 0) {
  throw new Error('Invalid file: File is empty or missing');
}

if (file.size > 10 * 1024 * 1024) {
  throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 10MB)`);
}
```

---

### 2. Storage Health Check Function

**File:** `src/lib/supabase.ts`

**Changes:**
- Added explicit Supabase client configuration for auth persistence
- Created `checkStorageHealth()` function to test storage API accessibility

**Key Additions:**
```typescript
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

/**
 * Health check for Supabase storage service
 * Tests if storage API is accessible and authenticated
 */
export async function checkStorageHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { ok: false, error: 'Not authenticated' };
    }

    // Try to list files in coa-pdfs bucket
    const { data, error } = await supabase.storage
      .from('coa-pdfs')
      .list('', { limit: 1 });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Unknown error' };
  }
}
```

---

### 3. Pre-Upload Health Check in Modal

**File:** `src/features/batches/components/COAUploadModal.tsx`

**Changes:**
- Added import for `checkStorageHealth`
- Added pre-flight health check before upload attempt
- Enhanced logging at each step

**Key Additions:**
```typescript
// Pre-flight check: Verify storage service is accessible
console.log('COAUploadModal: Running storage health check...');
const healthCheck = await checkStorageHealth();
console.log('COAUploadModal: Health check result:', healthCheck);

if (!healthCheck.ok) {
  const healthError = `Storage service unavailable: ${healthCheck.error}`;
  console.error('COAUploadModal:', healthError);
  throw new Error(healthError);
}
```

---

## Diagnostic Information Captured

The enhanced logging now captures:

### Auth Session Details:
- Whether session exists
- Whether user exists in session
- User ID
- Session errors if any

### File Details:
- File name
- File size (bytes and MB)
- File type (MIME)
- Last modified timestamp

### Storage Health:
- Storage API accessibility
- Authentication status
- Bucket accessibility

### Error Details:
- Error message
- Error type/name
- Stack trace
- Network vs API errors

---

## Expected Behavior After Fix

When user attempts COA upload, console should show:

1. **Storage health check:**
   ```
   COAUploadModal: Running storage health check...
   COAUploadModal: Health check result: { ok: true }
   ```

2. **Auth verification:**
   ```
   uploadCOAPDF: Auth session: {
     hasSession: true,
     hasUser: true,
     userId: "user-uuid-here",
     sessionError: undefined
   }
   ```

3. **File validation:**
   ```
   uploadCOAPDF: File details: {
     name: "COA-Batch-123.pdf",
     size: 1234567,
     type: "application/pdf",
     lastModified: 1234567890
   }
   ```

4. **Upload success:**
   ```
   uploadCOAPDF: Uploading to coa-pdfs bucket: 1234567890-COA-Batch-123.pdf
   uploadCOAPDF: Upload successful: 1234567890-COA-Batch-123.pdf
   COAUploadModal: PDF uploaded successfully: 1234567890-COA-Batch-123.pdf
   ```

---

## Next Steps for User Testing

### Test 1: Verify Console Output
1. Open browser DevTools Console
2. Clear console
3. Attempt COA upload
4. Check console for diagnostic messages
5. Look for any red flags in auth session or health check

### Test 2: Check Auth State
If health check shows "Not authenticated":
- Log out and log back in
- Check if other features work (creating batches, etc.)
- Verify session persists across page refreshes

### Test 3: Test File Upload
If health check passes but upload still fails:
- Try with a very small PDF (< 100KB)
- Try with different PDF
- Check Network tab for actual HTTP request details

### Test 4: Verify Storage API
If still failing, verify in Supabase Dashboard:
- Go to Storage section
- Verify `coa-pdfs` bucket exists
- Check bucket policies are active
- Verify storage service is enabled for project

---

## If Issue Persists

### Possible Remaining Issues:

1. **CORS Configuration** - Supabase project may not allow local dev origin
   - Check Supabase Dashboard > Settings > API
   - Add `http://localhost:5173` to allowed origins
   - Also add the credential-based URL from console

2. **Storage Service Disabled** - Storage may not be enabled
   - Check Supabase Dashboard > Storage
   - Verify service is active

3. **Network Proxy/Firewall** - Corporate network may block storage API
   - Test from different network
   - Check if VPN is interfering

4. **Browser Extension Blocking** - Ad blocker or privacy extension
   - Try in incognito/private browsing mode
   - Disable extensions temporarily

---

## Files Modified

1. `src/features/coa/services/coa.service.ts`
   - Enhanced `uploadCOAPDF()` with diagnostics
   - Added auth verification
   - Added file validation
   - Enhanced error handling

2. `src/lib/supabase.ts`
   - Added explicit client auth configuration
   - Created `checkStorageHealth()` function

3. `src/features/batches/components/COAUploadModal.tsx`
   - Added pre-upload health check
   - Enhanced logging

4. `docs/SESSION-2026-01-22-COA-STORAGE-NETWORK-FIX.md` (this file)
   - Session documentation

---

## Build Status

✅ **Build Successful**
```bash
npm run build
✓ 2452 modules transformed
✓ built in 22.67s
```

No TypeScript errors
No new warnings
All imports resolved correctly

---

## Related Sessions

- **SESSION-2026-01-22-COA-UPLOAD-BATCH-MANAGEMENT-FIX.md:** Initial field mapping fix
- **SESSION-2026-01-21-COA-UPLOAD-SCHEMA-FIX.md:** Schema mismatch discovery
- **SESSION-2026-01-21-COA-UPLOAD-INTERFACE-RESTORED.md:** COA interface restoration

---

## Impact Analysis

### Immediate Benefits
1. **Better Error Messages** - Users see actionable error messages instead of generic "Failed to fetch"
2. **Diagnostic Visibility** - Console shows exactly where upload fails
3. **Auth Verification** - Upload confirms user is authenticated before attempting
4. **File Validation** - Catches invalid files before upload attempt
5. **Health Monitoring** - Can detect storage service issues proactively

### Technical Improvements
1. Explicit auth session management for storage operations
2. Pre-flight checks before expensive operations
3. Detailed error logging for debugging
4. User-friendly error messages with context

### Next Session Priorities
1. Test the enhanced diagnostics with actual upload
2. Identify exact failure point from console output
3. Implement fix based on diagnostic results
4. Update troubleshooting documentation

---

## AI Continuity Notes

**For Next AI Session:**
1. This session added DIAGNOSTICS only, not a fix yet
2. User needs to test upload and share console output
3. Console output will reveal exact failure point
4. Likely issues: auth session not passed to storage, CORS, or storage service config
5. All code changes are non-breaking and add observability
6. Build is clean, no errors introduced

**Key Question to Ask User:**
"Please try uploading a COA again and share the full console output. The enhanced logging will show us exactly where it's failing."

---
