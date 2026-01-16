# Test Password Reset Functionality

## Quick Test (5 minutes)

**Purpose:** Verify that password reset emails are being sent by Supabase's default email service

### Steps:

1. **Open your Cult Ops login page**
   - URL: Your production or dev URL

2. **Click "Forgot password?"** link

3. **Enter your work email address**
   - Use your actual email that you can check

4. **Click "Send Reset Link"**

5. **Check your email inbox** (within 5 minutes)
   - Check main inbox
   - **Check spam/junk folder**
   - Look for sender: `noreply@mail.supabase.io` or `noreply@supabase.com`

6. **Expected Email:**
   ```
   Subject: Reset Your Password
   From: noreply@mail.supabase.io (or similar)

   Reset your password for [Project Name]

   [Reset Password Button/Link]
   ```

7. **Click the reset link**
   - Should redirect to your reset password page
   - Enter new password
   - Confirm password
   - Click "Update Password"

8. **Log in with new password**
   - Verify you can log in

---

## Results

### ✅ If Email Arrives and Reset Works

**Good News:** Password reset is FULLY FUNCTIONAL!

**Current State:**
- ✅ Users can reset their own passwords
- ✅ Admins can send password reset emails
- ✅ No admin password handling needed
- ⚠️ Emails come from Supabase (not @cultops.com)

**What You Can Do:**
- **Option A:** Keep it as-is (fully functional, just not branded)
- **Option B:** Upgrade to Supabase Pro ($25/mo) for custom branding

---

### ❌ If Email Never Arrives

**Possible Issues:**

1. **Email in Spam** - Check spam folder thoroughly
2. **Email Blocked** - Your email provider may block automated emails
3. **Supabase Email Disabled** - Check Auth settings in Supabase dashboard

**Troubleshooting:**
1. Try different email address (Gmail, Outlook, etc.)
2. Check Supabase dashboard → Logs → Edge Logs for errors
3. Verify Auth is enabled: Dashboard → Authentication → Providers → Email

---

## Custom Branding (Optional)

If password reset works but you want `noreply@cultops.com` branding:

### Requirements:
- **Supabase Pro Plan:** $25/month
- **SendGrid account:** Free (already have)
- **Domain verified:** Done ✅

### How to Enable:
1. Upgrade to Pro: https://supabase.com/dashboard/project/fonreynkfeqywshijqpi/settings/billing
2. After upgrade, SMTP Settings will appear in:
   - **Project Settings → Auth → SMTP Settings**
3. Enter SendGrid credentials
4. Test with password reset

---

## Summary Table

| Feature | Free Tier (Current) | Pro Tier ($25/mo) |
|---------|---------------------|-------------------|
| Password Reset | ✅ Works | ✅ Works |
| Email Sender | `noreply@supabase.io` | `noreply@cultops.com` |
| Custom SMTP | ❌ Not available | ✅ Available |
| Email Templates | Basic only | ✅ Customizable |
| Rate Limits | 30 emails/hour | Higher limits |

---

## Decision Guide

**Choose Free Tier if:**
- Functionality matters more than branding
- Budget is tight
- "Reset password" emails working is enough
- Small team (< 30 password resets/hour)

**Choose Pro Tier if:**
- Professional branding is important
- Want emails from @cultops.com
- Need custom email templates
- Need higher email limits
- Want other Pro features

---

## Next Steps

1. [ ] Run this test to verify password reset works
2. [ ] Document results below
3. [ ] Decide: Keep Free or upgrade to Pro?
4. [ ] Update EMAIL-PASSWORD-RESET-IMPLEMENTATION.md with decision

---

## Test Results (Fill in after testing)

**Date Tested:** _____________

**Email Address Used:** _____________

**Email Arrived?** [ ] Yes [ ] No

**Time to Receive:** __________ minutes

**Sender Address:** _____________

**Reset Link Worked?** [ ] Yes [ ] No

**Decision:**
- [ ] Keep Free tier - works fine
- [ ] Upgrade to Pro for branding
- [ ] Needs troubleshooting

**Notes:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
