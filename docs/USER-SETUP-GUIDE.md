---
title: User Setup & Management Guide
category: User Documentation
version: 1.0
created: 2025-01-12
updated: 2025-01-12
---

# User Setup & Management Guide

> **Audience:** System Administrators
> **Purpose:** Step-by-step guide for creating and managing user accounts
> **Prerequisites:** Admin role in Cult Ops system

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [User Roles](#user-roles)
3. [Creating New Users](#creating-new-users)
4. [Password Reset Workflows](#password-reset-workflows)
5. [Managing Existing Users](#managing-existing-users)
6. [User Deactivation](#user-deactivation)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Overview

The Cult Ops system uses role-based access control to manage user permissions. This guide covers all aspects of user account management for system administrators.

**Key Concepts:**
- **User Accounts:** Each employee needs a unique account with email and password
- **Roles:** Three role levels (admin, manager, user) with different permissions
- **Email-Based Setup:** All user setup and password resets happen via email
- **Self-Service:** Users can reset their own passwords without admin intervention

---

## User Roles

### Role Hierarchy

```
┌──────────────────────────────────────────────────────────┐
│                    ADMIN (Highest)                        │
│  • Full system access                                     │
│  • Create/manage all users                                │
│  • Modify system settings                                 │
│  • Delete production sessions (advanced)                  │
│  • Access all analytics and reports                       │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│                        MANAGER                            │
│  • All USER permissions PLUS:                             │
│  • Approve/reject orders                                  │
│  • Approve conversion lots                                │
│  • Manage batch lifecycle (quarantine, release)          │
│  • Manage customer accounts                               │
│  • Generate compliance documents                          │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│                      USER (Basic)                         │
│  • View dashboard and analytics                           │
│  • View orders and products                               │
│  • View inventory                                         │
│  • Start/complete assigned sessions                       │
│  • Generate labels and coversheets                        │
└──────────────────────────────────────────────────────────┘
```

### Choosing the Right Role

**Assign ADMIN role to:**
- IT administrators
- System owners
- Senior management requiring full access
- **Recommendation:** Keep admin count to 2-3 people maximum

**Assign MANAGER role to:**
- Production managers
- Inventory managers
- Sales managers
- Quality control supervisors
- **Recommendation:** 5-10 managers depending on facility size

**Assign USER role to:**
- Production operators
- Packaging staff
- Delivery drivers
- Sales representatives
- General employees
- **Recommendation:** Most employees should be users

---

## Creating New Users

### Current Workflow (Manual Password)

**⚠️ Current State:** Admin creates password for user (less secure)

**Steps:**
1. Log into Cult Ops as admin
2. Navigate to **Settings** (gear icon in sidebar)
3. Click **User Management** section
4. Click **Add User** button
5. Fill in the user form:
   - **Email:** User's work email address (required)
   - **Full Name:** User's first and last name (required)
   - **Role:** Select admin, manager, or user
   - **Password:** Create a temporary password for the user
   - **Is Active:** Leave checked (enabled by default)
6. Click **Create User**
7. **Important:** Communicate the temporary password to the user securely:
   - Use encrypted messaging (Signal, WhatsApp)
   - Tell them in person
   - DO NOT email the password in plain text

**User's First Login:**
1. User navigates to system URL
2. User logs in with email and temporary password
3. User should immediately change password:
   - Click profile icon → Settings → Change Password
   - OR use "Forgot Password" flow to reset

**Security Note:** This manual approach requires you to create and share passwords, which is less secure. Once email system is configured (see next section), the flow will be automated and more secure.

---

### Future Workflow (Email-Based Setup)

**✅ After Email System Configuration:** Automated and secure

**Steps:**
1. Log into Cult Ops as admin
2. Navigate to **Settings** → **User Management**
3. Click **Add User** button
4. Fill in the user form:
   - **Email:** User's work email address (required)
   - **Full Name:** User's first and last name (required)
   - **Role:** Select admin, manager, or user
   - **Is Active:** Leave checked
5. Click **Create User**
6. System automatically:
   - Generates secure temporary password
   - Sends email to user from noreply@cultops.com
   - Email contains setup instructions and link
7. **No password communication needed!**

**User Receives Email:**
```
Subject: Welcome to Cult Cannabis Co

Hello [Full Name],

Your account has been created for the Cult Ops system.

Click the link below to set up your password:
[Set Up Your Account]

This link will expire in 24 hours.

If you didn't expect this email, please contact your administrator.

---
Cult Cannabis Co
```

**User's First Login:**
1. User clicks link in email
2. User is prompted to create their own password
3. User creates secure password
4. User logs in with their password
5. **User never knows temporary password - more secure!**

---

## Password Reset Workflows

### 1. User Self-Service Password Reset

**When to use:** User forgot password and can access their email

**Steps for User:**
1. Go to Cult Ops login page
2. Click **"Forgot password?"** link
3. Enter email address
4. Click **"Send Reset Link"**
5. Check email inbox (within 5 minutes)
6. Click reset link in email
7. Enter new password (minimum 6 characters)
8. Enter confirm password (must match)
9. Click **"Update Password"**
10. Redirected to login page
11. Log in with new password

**Timeline:**
- Email arrives within 2-5 minutes
- Reset link valid for 24 hours
- Old reset links invalidated after password change

**No Admin Involvement Required!**

---

### 2. Admin-Assisted Password Reset

**When to use:** User can't access their email OR user doesn't know their email address

**Steps for Admin:**
1. Log into Cult Ops as admin
2. Navigate to **Settings** → **User Management**
3. Find the user in the list
4. Click **"Send Password Reset"** button next to user
5. Confirm the action
6. User receives password reset email
7. User follows email link to reset password

**Alternative:** Use Forgot Password flow
1. On login page, click "Forgot password?"
2. Enter user's email address
3. User receives reset email
4. User completes reset process

**Admin Never Sees New Password - Secure!**

---

### 3. Emergency Access (User Locked Out)

**When to use:** User can't access email AND needs immediate access

**Current Workflow (Temporary):**
1. Admin creates new password via Supabase dashboard:
   - Log into Supabase dashboard
   - Go to Authentication → Users
   - Find user by email
   - Click user → Click "Send Password Recovery"
   - OR manually reset password (less secure)
2. Communicate new password to user securely
3. User logs in and changes password immediately

**Future Workflow (After Email Setup):**
1. Admin updates user's email to working email address
2. Admin sends password reset email
3. User receives email at working address
4. User resets password
5. Admin updates email back to original (if needed)

---

## Managing Existing Users

### Viewing All Users

**Steps:**
1. Navigate to **Settings** → **User Management**
2. View list of all users with:
   - Email address
   - Full name
   - Role
   - Active status
   - Created date
   - Last updated date

**Filtering:**
- Active users shown first
- Inactive users shown at bottom (grayed out)

---

### Updating User Information

**Steps:**
1. Navigate to **Settings** → **User Management**
2. Find user in list
3. Click **Edit** button next to user
4. Update fields:
   - Full name (can change)
   - Role (can change - admin only)
   - Is Active (can toggle - admin only)
5. Click **Save**

**Restrictions:**
- Users cannot change their own role
- Users cannot deactivate themselves
- Email address cannot be changed (security)
  - To change email: Create new user, deactivate old user

---

### Changing User Roles

**When to Promote:**
- User needs more permissions for new responsibilities
- User demonstrates competency and trustworthiness
- Organizational structure changes

**When to Demote:**
- User no longer needs elevated permissions
- User changing job roles
- Security concerns

**Steps:**
1. Navigate to **Settings** → **User Management**
2. Find user in list
3. Click **Edit** button
4. Change **Role** dropdown
5. Click **Save**
6. User's permissions update immediately
7. User may need to log out and back in to see changes

**Important:** Role changes take effect immediately. Active sessions continue with old permissions until next login.

---

## User Deactivation

### When to Deactivate

**Deactivate users when:**
- Employee leaves company
- Employee on extended leave
- Security concerns or investigation
- Temporary access suspension needed

**DO NOT delete users!** Deactivate instead to preserve:
- Audit trails
- Historical data associations
- Activity logs
- Compliance records

---

### Deactivation Process

**Steps:**
1. Navigate to **Settings** → **User Management**
2. Find user in list
3. Click **Edit** button
4. Uncheck **Is Active** checkbox
5. Click **Save**

**Effects:**
- User cannot log in (existing sessions terminated)
- User's email greyed out in user list
- User's data remains in system
- User's historical actions preserved

---

### Reactivation Process

**Steps:**
1. Navigate to **Settings** → **User Management**
2. Scroll to inactive users section
3. Find user in list
4. Click **Edit** button
5. Check **Is Active** checkbox
6. Click **Save**
7. Send password reset email to user
8. User can log in after resetting password

---

## Troubleshooting

### Issue: User Not Receiving Password Reset Email

**Possible Causes & Solutions:**

**1. Email in Spam Folder**
- Check user's spam/junk folder
- Whitelist sender: noreply@cultops.com
- Add to safe senders list

**2. Email Delivery Delay**
- Wait 10 minutes before retrying
- Email services can be slow

**3. Wrong Email Address**
- Verify email address is correct
- Check for typos
- Verify email address exists and is active

**4. SMTP Not Configured (Admin)**
- Check Supabase dashboard → Authentication → SMTP Settings
- Verify SendGrid credentials are entered correctly
- Test with admin's own email first

**5. SendGrid Issues (Admin)**
- Check SendGrid dashboard for errors
- Verify domain is verified (green checkmark)
- Check email sending quota (free tier: 100/day)

**Admin Diagnostic Steps:**
```
1. Log into Supabase dashboard
2. Go to Logs → Edge Logs
3. Search for email-related errors
4. Check SMTP connection status
5. Try sending test email to admin's email
6. If test works, issue is with user's email provider
```

---

### Issue: User Forgot Email Address

**Solution:**
1. Check with HR/employee records for email
2. Ask user what email they might have used
3. Admin can search user list by full name
4. Once found, admin can send password reset to that email
5. User confirms receipt

---

### Issue: User Reset Link Expired

**Cause:** Links expire after 24 hours

**Solution:**
1. User requests new password reset
2. New link sent to email
3. Old link invalidated
4. User has another 24 hours

---

### Issue: New User Creation Failed

**Possible Causes:**

**1. Email Already Exists**
- Email must be unique in system
- Check if user already exists
- Deactivated users still "exist" - reactivate instead

**2. Invalid Email Format**
- Must be valid email: user@domain.com
- No spaces or special characters

**3. Missing Required Fields**
- Email is required
- Full name is required (in future workflow)
- Role must be selected

**Admin Diagnostic Steps:**
1. Check browser console for errors
2. Verify Supabase connection
3. Try creating test user with simple email
4. Check Supabase logs for error details

---

### Issue: Admin Can't Access User Management

**Cause:** User role is not admin

**Solution:**
1. Verify user has admin role
2. If first user: Should be auto-assigned admin
3. If not first user: Another admin must promote
4. Check user_profiles table role column
5. If no admins exist: Manual database update needed

---

## Best Practices

### Security Best Practices

**1. Principle of Least Privilege**
- Assign lowest role needed for job function
- Regular access reviews (quarterly)
- Demote when responsibilities change

**2. Password Policies**
- Encourage strong passwords (8+ characters, mixed case, numbers, symbols)
- Never share passwords
- Change passwords quarterly
- Use password managers

**3. Account Management**
- Deactivate accounts within 24 hours of employee departure
- Review active user list monthly
- Remove inactive accounts after 90 days (future)
- Document all role changes

**4. Admin Account Security**
- Limit admin accounts to 2-3 people
- Require strong passwords for admins
- Consider MFA for admin accounts (future)
- Regular admin access audits

---

### Operational Best Practices

**1. User Onboarding Checklist**
- [ ] Verify employee email address is active
- [ ] Determine appropriate role based on job function
- [ ] Create user account with correct role
- [ ] Send setup email (or communicate temp password securely)
- [ ] Verify user successfully logged in
- [ ] Provide system training
- [ ] Document access grant in HR records

**2. User Offboarding Checklist**
- [ ] Deactivate account same day as departure
- [ ] Verify user cannot log in
- [ ] Document deactivation date
- [ ] Reassign user's active sessions (if any)
- [ ] Archive any user-specific data
- [ ] Update HR records

**3. Regular Maintenance**
- Monthly: Review active user list for accuracy
- Quarterly: Audit user roles for appropriateness
- Annually: Full security audit of all accounts
- As needed: Clean up deactivated accounts

---

### Communication Best Practices

**When Creating New Users:**
1. Email user to expect setup email
2. Provide system URL
3. Provide IT contact for issues
4. Schedule training session
5. Send user documentation links

**When Resetting Passwords:**
1. Confirm reset was initiated by user
2. Warn about phishing (verify sender)
3. Remind about password best practices
4. Follow up to confirm success

**When Deactivating Users:**
1. Notify user in advance (if possible)
2. Document reason for deactivation
3. Communicate to relevant managers
4. Update team access lists

---

## Related Documentation

- **[AUTH.md](./AUTH.md)** - Technical authentication system documentation
- **[SETTINGS.md](./SETTINGS.md)** - System settings and configuration
- **[EMAIL-PASSWORD-RESET-IMPLEMENTATION.md](./EMAIL-PASSWORD-RESET-IMPLEMENTATION.md)** - Email system setup progress

---

## Support

**For Technical Issues:**
- Check troubleshooting section above
- Review system logs (admin only)
- Contact IT administrator
- Refer to technical documentation

**For Access Questions:**
- Contact system administrator
- Verify with HR for employee status
- Check user role requirements

---

## Changelog

### Version 1.0 (2025-01-12)
- Initial guide created
- Current manual workflow documented
- Future email-based workflow documented
- Password reset workflows documented
- User management procedures documented
- Troubleshooting guide added
- Best practices defined

---

**Document Version:** 1.0
**Last Updated:** 2025-01-12
**Next Review:** After email system implementation (Phase 4)
