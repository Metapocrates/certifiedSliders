---
name: Self-managed OAuth
description: User prefers managing their own Google OAuth credentials via Google Cloud Console + Supabase, not Lovable Cloud managed OAuth
type: preference
---
Do NOT use lovable.auth.signInWithOAuth(). Use supabaseBrowser().auth.signInWithOAuth() with direct Supabase OAuth flow.
The user manages their own Google Cloud Console credentials and Supabase auth configuration.
External Supabase project ref: sczxkekhouglmvjoukdb
