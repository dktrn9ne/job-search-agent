# Private candidate dashboard

`/private/` is an invite-only candidate portal. The legacy public research page is separate. Candidate profiles, roles, documents and decisions are loaded only through authenticated `/api/portal` requests. Sessions and invitation tokens are stored as hashes. Passwords use salted scrypt. Every candidate query uses the authenticated candidate ID; there is no shared account switcher.

Candidates review opportunities separately from immutable application/outreach packages. Pursuing a role does not approve an application. Package decisions require the current content digest and pending state, with an append-only audit record. Importing a newer version supersedes older outstanding approval. Historical imports require decision evidence. Profile edits never silently rewrite approved materials.

There is deliberately no employer transport or web-form submission endpoint. Approval means approved and unsent. Existing preparation workflows must supply verified, non-placeholder material; the portal additionally rejects placeholder documents and private job-search tooling references.

## Local setup

Use Node 22.13 or newer, `npm ci`, then `npm run build`. Set `PORTAL_LOCAL_DB` to an ignored private SQLite path, `PORTAL_ORIGIN` to `http://127.0.0.1:4173`, and start `npm run dev`. SQLite is refused in Vercel runtimes.

Create a private candidate input outside Git: `{ "id": "candidate-id", "email": "candidate@example.com", "name": "Candidate", "profile": {} }`. Run `node scripts/portal-admin.mjs invite PRIVATE_INPUT.json`. Give the resulting one-day, single-use activation URL privately to that candidate, who chooses their own password. Never commit or log activation links. Repeat separately for a second candidate; do not copy another candidate's profile or queue.

Run `node scripts/portal-admin.mjs import PRIVATE_BUNDLE.json` for an owner-specific bundle containing `candidate`, `roles` and `packages`. See `importBundle` and its tests for the schema. Import is idempotent for identical versions. PDFs remain private database content. New resume uploads save parsed content and a source hash, not the original file.

## CheckChaser on Vercel

Connect a persistent Postgres database to the existing project. Set server-only `DATABASE_URL`, exact HTTPS `PORTAL_ORIGIN`, and a random `PORTAL_OPERATOR_TOKEN` of at least 32 characters for operator invitations. Do not put secrets in public-prefixed variables. Run invitation/import commands against that database from a trusted operator environment. Missing configuration returns 503; there is no in-memory or temporary-file fallback.

Keep deployment protection enabled. Verify PostgreSQL migrations, invitation activation, login, isolation, document review and decisions against a protected deployment before onboarding another person. PostgreSQL support is implemented but needs verification against the actual connected database. Password reset, account recovery, scheduled producer-to-portal synchronization and candidate digest delivery are not implemented here. Existing daily search automation is unchanged; this import command does not automatically synchronize its queue.

`npm test` covers owner isolation, exact-version approval, concurrent decisions, immutable content/audits, invitations, session expiry, CSRF, logout, resume ownership, placeholder rejection and throttling. Login throttling is per account, not a substitute for platform-wide abuse controls.
