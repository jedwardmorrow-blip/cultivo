---
title: AUTH
category: Module Documentation
version: 1.0
updated: 2025-11-12
---

# AUTH - Authentication & Authorization System

> **Status:** Production-Ready, Supabase-Powered
> **Purpose:** Secure user authentication, role-based authorization, and profile management
> **Foundation:** Supabase Auth with custom user profiles and RLS enforcement
> **Related Docs:** SETTINGS.md (User Management), ERROR-HANDLING.md

---

## Overview

The Auth module provides secure, production-ready authentication and authorization using Supabase Auth. All database operations enforce Row Level Security (RLS) based on authenticated user roles.

**Key Features:**

1. **Email/Password Authentication** - Secure sign-in with Supabase Auth
2. **Password Reset Flow** - Self-service password recovery via email
3. **Role-Based Access Control** - Three roles: admin, manager, user
4. **Automatic Profile Creation** - First user becomes admin automatically
5. **Protected Routes** - Application access requires authentication
6. **Session Management** - Automatic session refresh and expiry handling

---

## Architecture

### Authentication Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  User Login                                                        │
│       │                                                            │
│       ├─→ Login.tsx (email/password)                              │
│       │        │                                                   │
│       │        ├─→ useAuth().signIn()                             │
│       │        │        │                                          │
│       │        │        ├─→ supabase.auth.signInWithPassword()    │
│       │        │        │        │                                 │
│       │        │        │        ├─→ Supabase Auth validates      │
│       │        │        │        │   credentials                   │
│       │        │        │        │                                 │
│       │        │        │        └─→ Returns session + JWT        │
│       │        │        │                                          │
│       │        │        └─→ onAuthStateChange() triggered         │
│       │        │                 │                                 │
│       │        │                 ├─→ Fetch user_profiles          │
│       │        │                 │   (role, full_name, etc.)      │
│       │        │                 │                                 │
│       │        │                 └─→ Update AuthContext           │
│       │        │                      (user, profile, isAdmin)    │
│       │        │                                                   │
│       │        └─→ App.tsx renders based on auth state            │
│       │                                                            │
│       └─→ Authenticated App                                       │
│            └─→ All DB queries use RLS with auth.uid()             │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### Authorization Levels

```
┌────────────────────────────────────────────────────────────────┐
│                     ROLE HIERARCHY                              │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ADMIN (Full System Access)                                     │
│  ├── All manager permissions                                    │
│  ├── User management (create, deactivate, assign roles)        │
│  ├── Settings management (company info, logos, etc.)           │
│  ├── Session deletion (admin-level cleanup)                    │
│  └── Analytics access (revenue, performance metrics)           │
│                                                                  │
│  MANAGER (Operational Management)                               │
│  ├── All user permissions                                       │
│  ├── Approve/reject orders                                      │
│  ├── Approve/reject conversion lots                            │
│  ├── Manage batch lifecycle (quarantine, release)              │
│  ├── Manage production sessions (trim, packaging)              │
│  ├── Manage customer accounts                                  │
│  └── Generate reports and documents                            │
│                                                                  │
│  USER (Operator / Read-Only)                                    │
│  ├── View dashboard and analytics                              │
│  ├── View orders and products                                  │
│  ├── View inventory                                             │
│  ├── Start/complete assigned sessions                          │
│  └── Generate labels and coversheets                           │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. AuthProvider (Context)

**Location:** `src/lib/auth.tsx`

**Purpose:** Provides authentication state and methods to entire application via React Context.

**Context State:**
```typescript
interface AuthContextType {
  user: User | null;                // Supabase auth user
  profile: UserProfile | null;      // Custom user_profiles record
  loading: boolean;                 // Initial auth check in progress
  signIn: (email, password) => Promise<void>;
  signUp: (email, password, fullName?) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email) => Promise<void>;
  updatePassword: (newPassword) => Promise<void>;
  isAdmin: boolean;                 // role === 'admin'
  isManager: boolean;               // role === 'manager' or 'admin'
}
```

**UserProfile Type:**
```typescript
interface UserProfile {
  id: string;                       // UUID from auth.users
  email: string;
  full_name: string | null;
  role: 'admin' | 'manager' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**Usage:**
```typescript
function SomeComponent() {
  const { user, profile, isAdmin, isManager } = useAuth();

  if (!user) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <p>Welcome, {profile?.full_name}</p>
      {isAdmin && <AdminPanel />}
      {isManager && <ManagerPanel />}
    </div>
  );
}
```

**Session Management:**
- On mount: Checks for existing session via `getSession()`
- Subscribes to `onAuthStateChange()` for session updates
- Fetches user profile after successful authentication
- Cleans up subscription on unmount

**Profile Fetch Logic:**
```typescript
const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  setProfile(data);
  setLoading(false);
};
```

---

### 2. Login Component

**Location:** `src/features/auth/components/Login.tsx`

**Purpose:** Full-screen login form with email/password authentication.

**Features:**
- Email and password input fields with validation
- Error display (invalid credentials, network errors)
- Loading state during sign-in
- Forgot password link
- Premium visual design with Cult Cannabis branding

**Form Validation:**
- Email: HTML5 email validation
- Password: Minimum 6 characters (enforced by Supabase)
- Both fields required

**Error Handling:**
```typescript
try {
  await signIn(email, password);
} catch (err: any) {
  setError(err.message || 'Failed to sign in');
}
```

**Common Error Messages:**
- "Invalid login credentials" - Wrong email or password
- "Email not confirmed" - Email confirmation required (disabled by default)
- "Too many requests" - Rate limit exceeded
- Network errors - Connection issues

**Visual Design:**
- Background: Repeating Cult logo pattern (`cult-logo-outline.png`)
- Card: `bg-cult-graphite/95` with backdrop blur
- Logo: 320x320 Cult Cannabis logo with hover scale effect
- Inputs: Icon-prefixed fields with cult-red focus rings
- Button: White background with hover effects

---

### 3. ForgotPassword Component

**Location:** `src/features/auth/components/ForgotPassword.tsx`

**Purpose:** Self-service password reset via email link.

**Flow:**

**Step 1: Email Entry**
- User enters email address
- Click "Send Reset Link"
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })`

**Step 2: Success Screen**
- Shows success message with instructions
- Displays entered email address
- Provides "Back to Login" button

**Step 3: Email Delivery**
- Supabase sends reset email to user
- Email contains secure reset link
- Link valid for 24 hours

**Step 4: User Clicks Link**
- Redirects to `/reset-password` route with token
- ResetPassword component renders

**Redirect URL:**
```typescript
resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`
})
```

**Error Handling:**
- Invalid email format - HTML5 validation
- User not found - Supabase returns success (security)
- Rate limiting - "Too many requests" error

---

### 4. ResetPassword Component

**Location:** `src/features/auth/components/ResetPassword.tsx`

**Purpose:** Password update form after clicking reset link.

**Features:**
- New password input field
- Confirm password input field
- Client-side validation
- Success screen with auto-redirect

**Validation Rules:**
1. **Minimum Length:** 6 characters (Supabase requirement)
2. **Password Match:** New password === Confirm password
3. **Not Empty:** Both fields required

**Validation Errors:**
- "Password must be at least 6 characters"
- "Passwords do not match"

**Flow:**
```
User clicks reset link → ResetPassword renders
  ↓
Enter new password → Enter confirm password → Submit
  ↓
Validation passes → updatePassword(newPassword)
  ↓
Success → Show success screen → Auto-redirect to login (2s)
```

**Auto-Redirect:**
```typescript
setSuccess(true);
setTimeout(() => {
  window.location.href = '/';
}, 2000);
```

---

## Database Schema

### user_profiles Table

**Location:** Supabase `public.user_profiles`

**Schema:**
```sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'user'
    CHECK (role IN ('admin', 'manager', 'user')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Relationships:**
- `id` → `auth.users.id` (ON DELETE CASCADE)
- Automatically deleted if auth user is deleted

**Indexes:**
- Primary key on `id`
- Automatic index on `email` for lookup

---

### Row Level Security (RLS)

**Enabled:** YES (CRITICAL)

**Policies:**

**1. Admins Can Manage All Profiles**
```sql
CREATE POLICY "Admins can manage all profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND is_active = true
    )
  );
```
- Admins can SELECT, INSERT, UPDATE, DELETE any profile
- Admin must be active
- Used for user management in Settings module

**2. Users Can Read Own Profile**
```sql
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());
```
- All authenticated users can read their own profile
- Used by AuthContext to fetch profile after login

**3. Users Can Update Own Name**
```sql
CREATE POLICY "Users can update own name"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM user_profiles WHERE id = auth.uid())
  );
```
- Users can update their `full_name`
- Users CANNOT change their own `role` (security)
- Only admins can change roles via policy #1

---

### Database Functions

**1. handle_new_user()**

**Purpose:** Automatically create user_profiles record when auth user is created.

**Trigger:** AFTER INSERT on `auth.users`

**Logic:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_count integer;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM user_profiles;

  -- Insert new profile
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN user_count = 0 THEN 'admin' ELSE 'user' END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Key Behavior:**
- **First User = Admin:** If `user_count = 0`, first user gets `role = 'admin'`
- **Subsequent Users = User:** All other users get `role = 'user'`
- **Full Name:** Extracted from Supabase `raw_user_meta_data`
- **Security:** SECURITY DEFINER allows function to bypass RLS

**2. update_updated_at()**

**Purpose:** Automatically update `updated_at` timestamp on profile changes.

**Trigger:** BEFORE UPDATE on `user_profiles`

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Authentication Methods

### useAuth Hook

**Location:** `src/lib/auth.tsx`

**Purpose:** Custom React hook providing access to AuthContext.

**Usage:**
```typescript
import { useAuth } from '@/lib/auth';

function Component() {
  const auth = useAuth();

  // Access state
  console.log(auth.user);
  console.log(auth.profile);
  console.log(auth.isAdmin);

  // Call methods
  auth.signOut();
}
```

**Error:** Throws error if used outside `<AuthProvider>`.

---

### signIn(email, password)

**Purpose:** Authenticate user with email and password.

**Implementation:**
```typescript
const signIn = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
};
```

**Success Flow:**
1. Supabase validates credentials
2. Returns session with JWT
3. `onAuthStateChange()` fires
4. AuthContext fetches user profile
5. App re-renders with authenticated state

**Error Handling:**
- Throws error for invalid credentials
- Throws error for network issues
- Component displays error to user

---

### signUp(email, password, fullName?)

**Purpose:** Create new user account (admin-only in production).

**Implementation:**
```typescript
const signUp = async (email: string, password: string, fullName?: string) => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || '',
      },
      emailRedirectTo: undefined,  // Email confirmation disabled
    },
  });
  if (error) throw error;
};
```

**Production Use:**
- **Public Signups Disabled:** Set via Supabase dashboard
- **Admin Creation Only:** Admins create users via Settings → User Management
- Uses Supabase Edge Function `admin-create-user` with service role key

**Flow:**
1. Admin calls Edge Function with email, password, role
2. Edge Function creates auth.users record
3. `handle_new_user()` trigger creates user_profiles record
4. User receives invite email with temp password

---

### signOut()

**Purpose:** Log out current user and clear session.

**Implementation:**
```typescript
const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
```

**Success Flow:**
1. Supabase clears session
2. `onAuthStateChange()` fires with null session
3. AuthContext updates: `user = null`, `profile = null`
4. App redirects to login screen

---

### resetPassword(email)

**Purpose:** Send password reset email to user.

**Implementation:**
```typescript
const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
};
```

**Configuration Requirements:**

Password reset emails require proper SMTP configuration in Supabase. By default, Supabase uses their email service which has rate limits and may be blocked by spam filters.

**For Production Use:**
1. Navigate to Supabase Dashboard → Authentication → Email Templates
2. Configure custom SMTP settings under Project Settings → Authentication → SMTP Settings
3. Enter your SMTP provider credentials:
   - SMTP Host (e.g., smtp.gmail.com)
   - SMTP Port (usually 587 for TLS)
   - SMTP Username (your email address)
   - SMTP Password (app-specific password recommended)
   - Sender Email (must match your domain)
   - Sender Name (your company name)

**Recommended SMTP Providers:**
- SendGrid (free tier: 100 emails/day)
- Amazon SES (pay-as-you-go, very cheap)
- Mailgun (free tier: 5,000 emails/month)
- Gmail (requires app-specific password, 500 emails/day limit)

**Without SMTP Configuration:**
- Emails may be delayed or blocked
- Supabase default service has strict rate limits
- Password reset functionality may be unreliable
- Not recommended for production use

**Testing Email Delivery:**
```typescript
// Test password reset email
await supabase.auth.resetPasswordForEmail('test@example.com', {
  redirectTo: `${window.location.origin}/reset-password`,
});
// Check inbox for reset email within 5 minutes
```

**Security:**
- Returns success even if email not found (prevents email enumeration)
- Reset link valid for 24 hours
- Old reset links invalidated on password change

---

### updatePassword(newPassword)

**Purpose:** Update password for currently authenticated user.

**Implementation:**
```typescript
const updatePassword = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
};
```

**Requirements:**
- User must be authenticated
- Password minimum 6 characters
- Used by ResetPassword component

---

## User Workflows

### 1. Initial System Setup

**Scenario:** First time deploying system.

**Steps:**
1. Deploy application to production
2. Navigate to application URL
3. Click "Contact your administrator for account access"
4. Administrator creates first user via Supabase dashboard:
   - Go to Authentication → Users → Add User
   - Enter email and password
   - Click "Create User"
5. First user automatically becomes admin (via `handle_new_user()`)
6. Log in with admin credentials
7. Navigate to Settings → User Management
8. Create additional users as needed

**First User Admin Logic:**
```sql
CASE WHEN user_count = 0 THEN 'admin' ELSE 'user' END
```

---

### 2. Daily Login

**Scenario:** Existing user logging in for work.

**Steps:**
1. Navigate to application URL
2. If session expired, redirected to login screen
3. Enter email and password
4. Click "Sign In"
5. If successful, redirected to Dashboard
6. If failed, error displayed (e.g., "Invalid login credentials")

**Session Duration:**
- Default: 7 days (Supabase default)
- Configurable in Supabase dashboard
- Auto-refresh if user active

---

### 3. Forgot Password

**Scenario:** User forgot password and needs to reset.

**Steps:**
1. On login screen, click "Forgot password?"
2. Enter email address
3. Click "Send Reset Link"
4. Check email inbox for reset email
5. Click reset link in email
6. Redirected to application `/reset-password` route
7. Enter new password (min 6 characters)
8. Enter confirm password
9. Click "Update Password"
10. Success screen shown for 2 seconds
11. Auto-redirected to login screen
12. Log in with new password

**Email Not Received:**
- Check spam folder
- Wait 5 minutes (email delivery delay)
- Retry reset (old link still valid if not expired)
- Contact administrator

---

### 4. Admin Creating New User

**Scenario:** Admin needs to add new employee to system.

**Steps:**
1. Log in as admin
2. Navigate to Settings → User Management
3. Click "Add User" button
4. Fill in form:
   - Email (required)
   - Full Name (required)
   - Role (admin, manager, user)
   - Is Active (checked by default)
5. Click "Create User"
6. User receives email with temporary password
7. User logs in and changes password

**Behind the Scenes:**
- Calls `admin-create-user` Edge Function
- Edge Function uses service role key (bypasses RLS)
- Creates auth.users record
- `handle_new_user()` trigger creates user_profiles record
- Sends invite email via Supabase

---

### 5. Admin Resetting User Password

**Scenario:** User forgot password or needs password reset by admin.

**Steps:**
1. Log in as admin
2. Navigate to Settings → User Management
3. Find user in the list
4. Click "Reset Password" button next to user
5. Confirm the action in modal dialog
6. System sends password reset email to user's email address
7. User receives email with reset link
8. User clicks link and sets new password

**Alternative Method:**
- Admin can use the standard "Forgot Password" flow
- Enter user's email on the forgot password page
- User receives reset email
- No admin action needed beyond knowing user's email

**Behind the Scenes:**
```typescript
// Admin-initiated reset
const resetUserPassword = async (userEmail: string) => {
  await supabase.auth.resetPasswordForEmail(userEmail, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
};
```

**Important Notes:**
- Requires SMTP configuration in Supabase (see resetPassword section)
- Admin cannot see or set the new password directly
- User must click email link to complete reset
- Reset link expires after 24 hours
- Provides secure, auditable password reset process

---

## Integration Points

### With Settings Module

**User Management:**
- Settings module displays all users from `user_profiles`
- Admins can update roles and deactivate users
- Uses RLS policy "Admins can manage all profiles"

**Company Settings:**
- Only admins can update company info
- Stored in `app_settings` table
- RLS enforces admin-only access

---

### With All Modules

**RLS Enforcement:**
- Every database query includes `WHERE auth.uid() = ...` or similar
- RLS policies automatically enforce access control
- No manual permission checks needed in application code

**Example:**
```typescript
// Orders module
const { data } = await supabase
  .from('orders')
  .select('*');
// RLS automatically filters to allowed orders
```

---

### With Dashboard Module

**Role-Based Widgets:**
- Some widgets only visible to managers/admins
- Example: PendingConversionsWidget (manager approval)
- Uses `isManager` or `isAdmin` from AuthContext

---

## Security Best Practices

### Current Implementation

**1. Row Level Security (RLS) Enabled**
- All tables have RLS enabled
- Policies enforce role-based access
- No direct table access bypasses RLS

**2. Password Requirements**
- Minimum 6 characters (Supabase default)
- Can be increased in Supabase dashboard
- Consider enforcing complexity in production

**3. Email Confirmation Disabled**
- Simplifies onboarding for internal users
- Admin-controlled user creation
- Users can't self-register

**4. Session Security**
- JWT tokens with 7-day expiry
- Automatic refresh on activity
- Secure cookie storage (httpOnly, secure)

**5. HTTPS Only**
- Application deployed on HTTPS
- Supabase enforces HTTPS
- No plaintext credentials

---

### Recommendations

**1. Enable Multi-Factor Authentication (MFA)**
```typescript
// In AuthProvider
const enableMFA = async () => {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
  });
  // Show QR code to user
};
```
- Adds second factor (TOTP app)
- Recommended for admin accounts
- Optional for manager/user accounts

**2. Implement Password Complexity**
```typescript
// In password validation
const validatePassword = (password: string) => {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase) throw new Error('Password must include uppercase letter');
  if (!hasLowerCase) throw new Error('Password must include lowercase letter');
  if (!hasNumbers) throw new Error('Password must include number');
  if (!hasSpecialChar) throw new Error('Password must include special character');
};
```

**3. Log Authentication Events**
```typescript
// In AuthProvider
onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    logAuditEvent('user_login', { userId: session?.user.id });
  }
  if (event === 'SIGNED_OUT') {
    logAuditEvent('user_logout', { userId: user?.id });
  }
});
```
- Track login/logout events
- Monitor failed login attempts
- Audit user activity

**4. Implement Rate Limiting**
- Supabase has built-in rate limiting
- Consider additional application-level limits
- Block IP after N failed attempts

---

## Testing

### Unit Tests

**Test Coverage:**
- [ ] AuthProvider - Session management, profile fetching
- [ ] Login component - Form validation, error handling
- [ ] ForgotPassword - Email validation, success flow
- [ ] ResetPassword - Password validation, confirmation match

**Key Test Cases:**
```typescript
describe('AuthProvider', () => {
  it('fetches profile after successful login');
  it('sets isAdmin true for admin role');
  it('sets isManager true for manager and admin roles');
  it('handles profile fetch errors gracefully');
  it('cleans up subscription on unmount');
});

describe('Login', () => {
  it('displays error for invalid credentials');
  it('disables submit during loading');
  it('validates email format');
  it('requires minimum password length');
  it('navigates to forgot password screen');
});

describe('ResetPassword', () => {
  it('validates password length (min 6)');
  it('validates password confirmation match');
  it('redirects to login after success');
  it('displays error for weak passwords');
});
```

### Integration Tests

**Test Scenarios:**
1. Complete login flow (email + password → dashboard)
2. Complete password reset flow (forgot → email → reset → login)
3. Session persistence across page refresh
4. Role-based access control (admin vs user)

---

## Known Gaps & Future Enhancements

### Current Limitations

1. **GAP-015: No Multi-Factor Authentication (MFA)** [MEDIUM]
   - **Issue:** Only password authentication supported
   - **Target:** TOTP-based MFA for admin accounts
   - **Impact:** Reduced security for high-privilege accounts
   - **Resolution:** Q1 2026

2. **GAP-016: Weak Password Requirements** [LOW]
   - **Issue:** Only 6-character minimum enforced
   - **Target:** Complexity requirements (uppercase, lowercase, number, special char)
   - **Impact:** Users can choose weak passwords
   - **Resolution:** Q4 2025

3. **GAP-017: No Audit Logging** [MEDIUM]
   - **Issue:** No tracking of login/logout events
   - **Target:** Comprehensive audit log with timestamps, IPs, actions
   - **Impact:** No forensic capability for security incidents
   - **Resolution:** Q1 2026

### Planned Enhancements

**Q4 2025:**
- Implement password complexity requirements
- Add "Remember Me" option (extended session)
- Add user profile photo upload

**Q1 2026:**
- Implement MFA (TOTP) for admin accounts
- Add comprehensive audit logging
- Add IP-based rate limiting
- Add "Active Sessions" management

**Q2 2026:**
- Implement SSO (Single Sign-On) for enterprise
- Add biometric authentication (WebAuthn)
- Add session activity monitoring

---

## Migration Notes

### From Previous System

**No Migration Required** - Auth system built from scratch with Supabase.

### Breaking Changes

**Migration 20251012030930: Disable Public Signups**
- Public user registration disabled
- Users must be created by admins
- Existing users unaffected

---

## Changelog

### Version 1.0 (2025-11-12)
- Initial documentation created
- Authentication flow documented
- Authorization levels documented
- All components documented
- Database schema and RLS policies documented
- User workflows documented
- Security best practices documented

---

## Related Documentation

- **SETTINGS.md** - User management for admins
- **ERROR-HANDLING.md** - Error handling patterns
- **SYSTEM-WORKFLOW.md** - Overall application workflow
- **DASHBOARD.md** - Role-based dashboard visibility

---

## Support & Troubleshooting

### Common Issues

**Issue: "Invalid login credentials" error**
- **Cause:** Wrong email or password
- **Solution:**
  1. Verify email is correct (no typos)
  2. Check Caps Lock is off
  3. Try password reset if forgot password
  4. Contact admin if account deactivated

**Issue: Password reset email not received**
- **Cause:** Email delivery delay, spam filter, or missing SMTP configuration
- **Solution:**
  1. Check spam/junk folder
  2. Wait 5-10 minutes
  3. Verify email address is correct
  4. Check Supabase SMTP configuration (admin only)
  5. Test with different email provider
  6. Contact administrator to manually reset

**Administrator Steps:**
- Verify SMTP settings in Supabase Dashboard
- Test email delivery with test account
- Check Supabase logs for email errors
- Consider switching to dedicated SMTP provider
- Review email rate limits and quotas

**Issue: "Session expired" message**
- **Cause:** JWT token expired after 7 days
- **Solution:** Log in again (normal behavior)

**Issue: Can't access admin features**
- **Cause:** User role is not admin
- **Solution:** Contact admin to upgrade role

### Debug Checklist

1. Check browser console for errors
2. Verify Supabase project URL and anon key in `.env`
3. Confirm user exists in Supabase dashboard
4. Check `user_profiles` table for profile record
5. Verify RLS policies are enabled
6. Test with different browser (clear cache issue?)

---

**Documentation Version:** 1.0
**Last Updated:** 2025-11-12
**Next Review:** After Security Audit (Q1 2026)
