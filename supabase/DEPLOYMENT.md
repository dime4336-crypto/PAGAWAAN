# Supabase and Render deployment

The Express server talks to Supabase from the server only. Configure these Render
environment variables:

- `SUPABASE_URL`: the Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: the project's service-role secret. Never set this
  as a `VITE_` variable or expose it in the browser.
- `FRONTEND_ORIGIN`: the exact Vercel site origin, such as
  `https://your-site.vercel.app`.

For an existing Supabase project, run
`supabase/migrations/003_marketplace_and_request_rpc.sql` in the Supabase SQL
Editor after the existing schema migrations. It adds marketplace storage and an
atomic function for creating a request with its items. The migration does not
delete or reseed existing catalog, settings, or request data.

On Vercel, set `VITE_API_BASE_URL` to the Render service URL and redeploy. The
Supabase service-role key belongs only in Render.
