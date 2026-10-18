# Private candidate dashboard

`/private/` is an invite-only candidate portal. The legacy public research page is separate. Candidate profiles, roles, documents and decisions are loaded only through authenticated `/api/portal` requests. Sessions and invitation tokens are stored as hashes. Passwords use salted scrypt. Every candidate query uses the authenticated candidate ID; there is no shared account switcher.

Candidates review opportunities separately from immutable application/outreach packages. Pursuing a role does not approve an application. Package decisions require the current content digest and pending state, with an append-only audit record. Importing a newer version supersedes older outstanding approval. Historical imports require decision evidence. Profile edits never silently rewrite approved materials.

There is deliberately no employer transport or web-form submission endpoint. Approval means approved and unsent. Existing preparation workflows must supply verified, non-placeholder material; the portal additionally rejects placeholder documents and private job-search tooling references.

## Local setup

Use Node 22.13 or newer, `npm ci`, then `npm run build`. Set `PORTAL_LOCAL_DB` to an ignored private SQLite path, `PORTAL_ORIGIN` to `http://127.0.0.1:4173`, and start `npm run dev`. SQLite is refused in Vercel runtimes.

Create a private candidate input outside Git: `{ "id": "candidate-id", "email": "candidate@example.com", "name": "Candidate", "profile": {} }`. Run `node scripts/portal-admin.mjs invite PRIVATE_INPUT.json`. Give the resulting one-day, single-use activation URL privately to that candidate, who chooses their own password. Never commit or log activation links. Repeat separately for a second candidate; do not copy another candidate's profile or queue.

Run `node scripts/portal-admin.mjs import PRIVATE_BUNDLE.json` for an owner-specific bundle containing `candidate`, `roles` and `packages`. See `importBundle` and its tests for the schema. Import is idempotent for identical versions. PDFs remain private database content. New resume uploads save parsed content and a source hash, not the original file.

## CheckChaser on Vercel

Connect a persistent Postgres database to the existing project. Set server-only `DATABASE_URL` (or the integration's `POSTGRES_URL`), exact HTTPS `PORTAL_ORIGIN`, and a random `PORTAL_OPERATOR_TOKEN` of at least 32 characters for operator invitations/imports. Do not put secrets in public-prefixed variables. Missing configuration returns 503; there is no in-memory or temporary-file fallback. Supabase connections verify its published root CA and the server hostname. The bundled certificate came from the download linked in Supabase Database Settings: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt.

Keep preview deployment protection enabled and production database credentials scoped to production. Production uses candidate login; no public endpoint returns candidate data. All seven portal tables enable RLS with no client access policies, while trusted server connections enforce candidate ownership.

For an existing local workspace, use `node scripts/portal-sync.mjs PRIVATE_BUNDLE LOCAL_DB PRIVATE_OPERATOR_JSON HTTPS_ORIGIN`. The operator JSON contains a server token under `token`. The command preserves the existing salted password hash on first migration, never overwrites existing hosted profile/credentials, and atomically imports verified versions. Only trusted operators may call `operator-import`; ordinary candidate sessions have no access. Import responses never include credentials. Keep bundle, database and operator files outside Git. Producer synchronization remains an explicit workflow step; there is no scheduler embedded in this app. Hosted decisions do not yet write back to an external preparation ledger.

The connected hosted PostgreSQL flow passed 28 checks on October 18, 2026: authentication/cookies, two-candidate isolation, private documents, exact-version and concurrent decisions, audit events, invitations, CSRF, and logout. Test accounts contain synthetic data and random credentials; their sessions were logged out. Password reset/account recovery and candidate digest delivery are not implemented in this portal. Existing external search/digest schedules are unchanged.

`npm test` covers owner isolation, exact-version approval, concurrent decisions, immutable content/audits, invitations, session expiry, CSRF, logout, resume ownership, placeholder rejection and throttling. Login throttling is per account, not a substitute for platform-wide abuse controls.
