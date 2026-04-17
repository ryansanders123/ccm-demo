# New-client setup

## 1. Supabase Auth configuration
1. Dashboard → Authentication → Providers:
   - **Google:** paste client ID + secret from Google Cloud Console OAuth. Redirect URL: `https://<domain>/auth/callback` AND `https://<project-ref>.supabase.co/auth/v1/callback`.
   - **Azure (Microsoft):** paste client ID + secret from Entra app registration. Same redirects.
2. Dashboard → Authentication → Settings → enable **"Link accounts with same email"**.
3. Dashboard → Authentication → URL Configuration → Site URL = `https://<domain>`.

## 2. Google OAuth client (Google Cloud Console)
- Create OAuth consent screen (external, testing OK for dev).
- Create OAuth 2.0 Client ID (Web application).
- Authorized redirect URIs:
  - `https://<project-ref>.supabase.co/auth/v1/callback`

## 3. Microsoft Entra app registration
- Azure Portal → Entra ID → App registrations → New registration.
- Redirect URI (Web): `https://<project-ref>.supabase.co/auth/v1/callback`.
- Certificates & secrets → New client secret.
- API permissions → Microsoft Graph → User.Read (delegated), email, openid, profile.

## 4. Vercel env vars
See `.env.local.example`. Set all `NEXT_PUBLIC_*` and `SUPABASE_SERVICE_ROLE_KEY`.
