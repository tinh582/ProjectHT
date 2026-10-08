# HT Parking

Parking management for customers, staff and administrators. The frontend uses React/Vite; the Express API owns authorization and accesses Supabase Auth/PostgreSQL.

## Local setup

Use Node.js 22 or newer.

1. Install dependencies in each app:
   ```powershell
   cd backend
   npm install
   cd ../frontend
   npm install
   ```
2. Copy `backend/.env.example` to `backend/.env` and supply the Supabase URL, anonymous key and **server-only service-role key**. The API intentionally refuses to start without these settings. Never place the service-role key in a frontend/VITE variable.
3. Review and apply [001_parking_integrity.sql](backend/migrations/001_parking_integrity.sql) using the Supabase SQL editor as the database owner. See the migration notes below before applying it to an existing project.
4. Optionally copy `frontend/.env.example` to `frontend/.env`. Development requests use the Vite proxy to port 5000 by default.
5. Run `npm run dev` from `backend` and `frontend` in separate terminals. Open the URL printed by Vite.

Existing frontend Supabase environment variables are no longer used. In production, serve `frontend/dist` and proxy `/api` to Express, or set `VITE_API_BASE_URL` when building the frontend. Set `FRONTEND_ORIGIN` to the actual frontend origin.

## Database migration

The repository does not contain an export of the deployed database. The migration targets the tables and columns used by the original application: `profiles`, `vehicles`, `parking_zones`, `parking_slots`, `parking_sessions`, `pricing_configs`, `transactions`, and `notifications`. Verify compatibility with the real schema before applying it. The migration has been tested against the representative PostgreSQL schema in `backend/test/schema.sql`; that fixture is **not** a production schema installer.

The migration:

- Adds transactional functions for reservations, check-in/check-out, vehicle edits/deletion, zone creation/deletion and payment requests.
- Adds uniqueness constraints for normalized plates, assigned vehicle slots, active sessions and names within each zone. Existing duplicate data causes the migration to roll back; it does not silently delete records.
- Adds `transactions.confirmed_at`, preserving existing completed payments' original dates.
- Adds a database-side report function and indexes. Reports use `REPORT_TIME_ZONE` (default `Asia/Ho_Chi_Minh`).
- Revokes direct table access from `PUBLIC`, `anon` and `authenticated`. Only the backend service role may call the new mutation functions. Deploy this migration together with the updated API; older clients that access those tables directly will stop working.

Existing custom database functions, triggers and policies are outside this repository and must be checked against this access model. A profile with role `admin` must already exist for administration; registration always creates a regular user. Removing a profile blocks this API's access but does not delete its Supabase Auth account.

## Payment behavior

Submitting a plan creates a **pending payment request**, using its price from the database. Repeated submissions for the same pending plan and price reuse the request. A staff member must verify receipt of funds before confirming it. A request alone does not activate a parking subscription.

There is no payment-provider integration. Optional `VITE_PAYMENT_BANK` and `VITE_PAYMENT_ACCOUNT` settings display a VietQR for the configured receiving account; otherwise the screen directs customers to staff. The previous hardcoded bank account is not used.

Subscriptions retain the application's existing 30-day, account-level model, now starting at confirmation time. Staff can confirm pending payments or mark completed payments refunded; the latter records a status and does not transfer money through a bank.

## Code layout

- `backend/app.js`: app construction, route mounting, role gates and error handling.
- `backend/config/supabase.js`: private database client and separate per-request Auth clients.
- `backend/src/auth.js`, `http.js`: authentication, permission checks, validation, pagination and errors.
- `backend/src/components`: feature route handlers. Existing endpoint names are retained for compatibility.
- `backend/migrations`: atomic database operations and aggregate reports.
- `frontend/src/lib/api.js`: API URL, bearer tokens, shared refresh, timeouts and failure notifications.
- `frontend/src/lib/slots.js`: shared slot grouping/sorting.
- `frontend/src/components/shared`: shared UI including error notices and pagination.

The customer dashboard delegates vehicle cards and notifications to separate components. Role-specific dashboards load on demand, and user/transaction lists use server-side pagination.

## Verification

```powershell
cd backend
npm test
cd ../frontend
npm run build
```

Tests run without production credentials or access to the live database. They exercise Express authorization and validation, frontend token refresh/error handling, and SQL transactions/rollback in PGlite (embedded PostgreSQL). PGlite uses a single connection, so these tests do not replace a multi-connection concurrency/load test against the actual deployed schema.
