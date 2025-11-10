# Google OAuth Setup Guide for Certified Sliders

This guide covers configuring Google OAuth for the Certified Sliders application.

## Prerequisites

- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Admin access to your Supabase project
- Production domain: `https://certifiedsliders.com`

## Part 1: Configure Supabase Auth

### 1. Get your Supabase OAuth Redirect URL

Your Supabase auth callback URL follows this format:
```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

For your project:
```
https://sczxkekhouglmvjoukdb.supabase.co/auth/v1/callback
```

## Part 2: Google Cloud Console Setup

### 1. Create/Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your existing project or create a new one
3. Note your project ID

### 2. Enable Google+ API

1. Go to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click **Enable**

### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace)
3. Click **Create**

#### Application Information

- **App name**: `Certified Sliders`
- **User support email**: Your support email
- **App logo**: Upload your logo (optional)
- **Application home page**: `https://certifiedsliders.com`
- **Application privacy policy link**: `https://certifiedsliders.com/privacy`
- **Application terms of service link**: `https://certifiedsliders.com/terms`
- **Authorized domains**:
  - `certifiedsliders.com`
  - `supabase.co`

#### Scopes

Add these scopes:
- `email`
- `profile`
- `openid`

#### Test Users (if in Testing mode)

Add email addresses of users who should be able to sign in while the app is in testing mode.

**Important**: To allow all users to sign in, publish your OAuth consent screen by clicking **Publish App** after setup.

### 4. Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select application type: **Web application**
4. Name: `Certified Sliders Web Client`

#### Authorized JavaScript origins

Add both development and production URLs:
```
http://localhost:3000
https://certifiedsliders.com
https://sczxkekhouglmvjoukdb.supabase.co
```

#### Authorized redirect URIs

Add these exact URLs:
```
http://localhost:3000/auth/callback
https://certifiedsliders.com/auth/callback
https://sczxkekhouglmvjoukdb.supabase.co/auth/v1/callback
```

**Note**: The last one is the Supabase auth callback URL from Part 1.

5. Click **Create**
6. Copy your **Client ID** and **Client Secret** - you'll need these for Supabase

## Part 3: Configure Supabase with Google Credentials

### 1. Add Google OAuth Provider

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Providers**
3. Find **Google** in the list
4. Enable Google provider
5. Paste your **Client ID** from Google Console
6. Paste your **Client Secret** from Google Console
7. Click **Save**

### 2. Verify Redirect URLs

In Supabase, go to **Authentication** > **URL Configuration** and ensure:

- **Site URL**: `https://certifiedsliders.com`
- **Redirect URLs**: Add these URLs:
  ```
  http://localhost:3000/auth/callback
  https://certifiedsliders.com/auth/callback
  ```

## Part 4: Environment Variables

### Local Development (.env.local)

Your local `.env.local` already has:
```bash
NEXT_PUBLIC_SUPABASE_SITE_URL=http://localhost:3000
```

This is correct for local development.

### Production (Vercel Environment Variables)

In Vercel dashboard, set these environment variables:

1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add/update:

```bash
NEXT_PUBLIC_SUPABASE_SITE_URL=https://certifiedsliders.com
NEXT_PUBLIC_SITE_URL=https://certifiedsliders.com
NEXT_PUBLIC_APP_URL=https://certifiedsliders.com
```

4. Redeploy your application after saving

## Testing the Integration

### Test New User Registration

1. Go to `https://certifiedsliders.com/register`
2. Select an account type (e.g., "I'm an Athlete")
3. Click "Continue with Google"
4. Verify you see "Certified Sliders" in the Google consent screen
5. Authorize the application
6. Verify you're redirected back to `/me` (or `/coach/onboarding` for coaches)

### Test Existing User Sign-In

1. Sign out from your account
2. Go to `https://certifiedsliders.com/signin`
3. Click "Sign in with Google"
4. Verify you're automatically signed in without seeing the account type selection
5. Verify you land on `/me`

## Troubleshooting

### Error: "redirect_uri_mismatch"

- Ensure all redirect URIs in Google Console exactly match your Supabase callback URLs
- Check for trailing slashes (should not have them)
- Verify the protocol (http vs https)

### OAuth Consent Screen Shows Wrong App Name

- Go to Google Cloud Console > OAuth consent screen
- Update the **App name** field to "Certified Sliders"
- Save and wait a few minutes for changes to propagate

### Redirects to Localhost Instead of Production

- Check Vercel environment variables for `NEXT_PUBLIC_SUPABASE_SITE_URL`
- Ensure it's set to `https://certifiedsliders.com` (not localhost)
- Redeploy your application

### "Access Blocked" Error

- Your OAuth consent screen might be in "Testing" mode
- Either add the user's email to test users, or publish your app

### New Users Keep Seeing Account Type Selection

- This is expected behavior for new users
- Existing users who have already set their account type will skip this step
- If an existing user sees it, their `user_type` may still be set to default 'athlete'

## Security Notes

1. **Never commit secrets**: Keep your Google Client Secret and Supabase service role key out of git
2. **Use environment variables**: Always use `process.env.NEXT_PUBLIC_SUPABASE_SITE_URL` for dynamic URLs
3. **HTTPS in production**: Always use HTTPS URLs in production redirect URIs
4. **Verify redirect URIs**: Supabase will reject redirects to URLs not in your allow list

## Additional Resources

- [Supabase Google OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
