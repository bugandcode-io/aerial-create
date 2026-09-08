# Aerial Create

A desktop-first React / TypeScript / Vite / Konva editor with Zustand state, an Express API, and MySQL-owned projects. Milestone 6 adds authentication and account storage without redesigning the editor. Precision editing is deferred.

## Local prerequisites and setup

Use Node.js 22.13+ (or a current supported LTS), npm, and a running MySQL 8.0+ server. MySQL Workbench alone is a client, not a database server.

From PowerShell in `D:\aerial-create`:

```powershell
npm install
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Put the generated value into SESSION_SECRET in .env. Edit the MYSQL_* values for your local database. Do not commit .env. The example contains placeholders, not working credentials. Only VITE_API_URL is exposed to frontend code.

Connect to your local MySQL server as an administrator using Workbench or `mysql -u root -p`, then run (choose your own local password):

```sql
CREATE DATABASE aerial_create CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'aerial_app'@'127.0.0.1' IDENTIFIED BY 'replace-with-your-local-password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, REFERENCES, INDEX
  ON aerial_create.* TO 'aerial_app'@'127.0.0.1';
```

MySQL host matching may require a localhost account instead, depending on your server configuration. Put the matching user/password into .env. The migration creates only application tables in the configured database; it never creates users or changes server configuration.

```powershell
npm run db:migrate
npm run api:dev
```

In a second terminal:

```powershell
npm run dev -- --host 127.0.0.1
```

Open http://127.0.0.1:5173, choose Create an account, enter an email and a 12–128 character password, and click Register. Registration signs you in. Add text or shapes, rename the design, and choose Document menu → Save to account. Log out from that menu, log in again, and reopen it through Open saved design. For cross-device simulation, use another browser with the same development origin and account.

Use 127.0.0.1 consistently, not a mixture of localhost and 127.0.0.1. If Vite selects a different port, update FRONTEND_ORIGIN and restart the API. Restart Vite after changing VITE_API_URL.

## Environment variables

| Variable | Purpose |
| --- | --- |
| MYSQL_HOST | Database host; local example 127.0.0.1 |
| MYSQL_PORT | Database port; default 3306 |
| MYSQL_DATABASE | Existing application database |
| MYSQL_USER | Database account |
| MYSQL_PASSWORD | Database password; backend only |
| SESSION_SECRET | Random secret of at least 32 characters; HMACs session tokens |
| API_PORT | API loopback port; default 3001 |
| FRONTEND_ORIGIN | Exact permitted browser origin, including development port |
| VITE_API_URL | API base URL without /api, e.g. http://127.0.0.1:3001; omit for same-origin /api |
| NODE_ENV | Set production for Secure cookies and HTTPS origin validation |

The API binds to loopback. Production requires HTTPS and the frontend/API on the same site for SameSite=Lax cookies. No production routing, proxy, DNS, or process-manager settings are changed or provided by this milestone. Do not put MySQL credentials in VITE_* variables.

## Architecture

The editor's components, Konva rendering, Zustand model, element operations, and history remain in src/. AuthScreen adds a small login/register boundary; App restores the cookie session before mounting Editor. API calls live in services, with no fetch scattered through UI components.

- server/app.ts: Express routes, authentication, request validation, safe errors, CORS/CSRF checks.
- server/mysqlRepository.ts: parameterized MySQL queries, always scoped by the session user for project access.
- server/repository.ts: typed storage boundary (the in-memory implementation is test-only).
- server/config.ts, index.ts, migrate.ts: environment validation, local API startup, initialization.
- src/services/api.ts, auth.ts, remoteProjects.ts: credentialed HTTP access and remote document validation.
- src/services/projectSession.ts: explicit cloud saves and safe project switching.
- src/services/documentFormat.ts, documentStorage.ts, documentPersistence.ts: unchanged v1 format and local recovery coordination.
- src/hooks/useDocumentPersistence.ts: per-account recovery lifecycle.

## Authentication and security

Email accounts are normalized to lowercase, validated, and uniquely indexed. Passwords are 12–128 characters, stored only as salted Argon2id hashes (19 MiB, two iterations, one lane). Login errors do not distinguish missing accounts from incorrect passwords. Auth routes are rate-limited in process.

Sessions use random 256-bit opaque tokens in HttpOnly, SameSite=Lax cookies. Production cookies are Secure and use the __Host- prefix. Only HMAC-SHA256 token digests are stored in MySQL, with seven-day absolute expiry; login rotates the session, logout revokes it. Tokens are never stored in localStorage. Expired sessions are rejected and cleaned on session creation.

Mutating browser requests require the configured Origin and X-Aerial-Request header. Credentialed CORS allows only FRONTEND_ORIGIN. All project routes authenticate before database access. Ownership comes from the session, never request user_id. Missing and foreign projects return the same 404. An optional expected-account header also prevents an editor tab from saving under a different account after another tab signs in.

Security references: [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) and [Express production security](https://expressjs.com/en/advanced/best-practice-security/).

## Database schema and migration

server/migrations/001_initial.sql initializes InnoDB tables idempotently with CREATE TABLE IF NOT EXISTS:

- users: UUID id, unique email, password_hash, created_at, updated_at.
- projects: id, user_id foreign key, name, document_json JSON, document_version, width, height, created_at, updated_at; owner/date index.
- sessions: token_hash, user_id foreign key, expires_at; expiry index.

Projects contain complete validated v1 documents; canvas elements are not relational rows. Server timestamps are authoritative for cloud saves. Future schema changes need additional migrations; rerunning initialization does not alter existing columns. For a deployed database use separate migration/runtime privileges. This milestone does not deploy anything.

## API

| Method | Route | Result |
| --- | --- | --- |
| POST | /api/auth/register | {email,password} → session and public user |
| POST | /api/auth/login | {email,password} → rotated session and public user |
| POST | /api/auth/logout | Revoke session and clear cookie |
| GET | /api/auth/me | Current public user (id,email) |
| GET | /api/projects | Current user's summaries |
| GET | /api/projects/:id | Current user's complete document |
| POST | /api/projects | Create an owned project from a v1 document |
| PUT | /api/projects/:id | Replace owned project; body document ID must match |
| DELETE | /api/projects/:id | Delete owned project |

Project create/update bodies are the AerialDocument itself, not a wrapper. Additional user_id fields are rejected. Validation failures return 400, unauthenticated requests 401, invalid origins/CSRF 403, missing/foreign projects 404, duplicates 409, and oversized requests 413. Internal errors never return SQL details or hashes.

## Local recovery versus account saves

Local drafts autosave after a 600 ms debounce; continuous edits wait for interaction completion. Page hide/exit flushes pending local edits. Recovery is namespaced by account ID and does not restore selection, clipboard, history, or inline editing state. Local recovery remains available when remote saves fail, but initial access to the editor requires a valid authenticated session.

Save to account writes the current design to MySQL for cross-device access. It is explicit, not continuous cloud autosave. New, import, and switching save the previous project to the account first and block on failure. Opening validates the remote target before replacing the current document. Renaming updates local recovery immediately and reaches the server on Save to account or a project switch. The top bar distinguishes local save status from account save status. Logout flushes local recovery but does not implicitly save to the account.

Open saved design lists only the signed-in user's server projects. Delete requires an explicit in-app confirmation. Deleting the current project opens a new blank local recovery draft. A failed remote save leaves local content available for retry or JSON export. Import creates a fresh project ID, so it cannot overwrite an existing account project by importing an ID.

Anonymous Milestone 4–5 records are retained under their original keys but are not automatically assigned or exposed to a signed-in account. Import a previously exported JSON file to claim a design explicitly. No legacy-record migration UI is included. Local drafts are not encrypted; account separation is application-level, not protection against someone with access to the browser profile. Clearing browser data removes recovery drafts, but not account-saved MySQL projects.

## Editor capabilities retained

Text presets, six system font families, bold/italic, alignment, color, opacity, position, rotation, dragging/resizing, and inline editing. Double-click text; Enter commits, Shift+Enter adds a line, Escape cancels. Shapes include rectangles, circles/ellipses, lines, triangles, and arrows. Layers support ordering, drag reorder, visibility, and locks.

Ctrl/Command Z, Shift-Z/Y, C/V, D, Delete/Backspace, Escape, and bracket ordering shortcuts remain available outside form controls. History stores up to 100 element snapshots and groups continuous interactions into one undo step. Project names are persisted outside element undo history.

PNG export uses the document's actual dimensions/background, excluding workspace, hidden layers, and selection controls. JSON v1 contains only id, name, width, height, solid background, ordered elements, version, createdAt, and updatedAt. The shared validator caps documents at 5,000 elements and 8,192 pixels per dimension; import/request limits are approximately 10 MB.

## Checks

```powershell
npm run typecheck
npm run build
npm run lint
npm test
```

The default suite runs all previous editor/document tests plus account recovery/project-session tests and real HTTP authentication/ownership tests against a test-only repository. MySQL integration is opt-in and requires the migrated local database:

```powershell
$env:MYSQL_INTEGRATION='1'
node --env-file=.env --import tsx --test server/tests/mysql.test.ts
Remove-Item Env:MYSQL_INTEGRATION
```

The integration test creates uniquely named test users/projects and removes only those fixtures. It is skipped in the default suite. The existing Vite bundle-size advisory is non-blocking.

## Roadmap and limitations

Milestones 1–3 delivered the editor, text, shapes, and layers. Milestones 4–5 delivered versioned local documents and reopening. Milestone 6 adds Express/MySQL authentication and owned account projects. Precision editing is deferred.

No email verification, password reset, multi-factor authentication, multi-device conflict resolution, or distributed rate limiting yet. Concurrent saves to the same project use last-write-wins; an older tab can recreate a deleted project if explicitly saved. Storage and quota failures retain local drafts and report errors; there is no automatic cloud retry queue. Legacy anonymous documents require an exported JSON file to migrate through the UI. There are no uploads, templates, video, collaboration, or AI features.

Recommended Milestone 7: account recovery and reliability—verified email, password reset, and conflict-aware cloud saves. Do not start it automatically.

## DigitalOcean MySQL verification

Use the cluster hostname and port from DigitalOcean Connection Details (typically 25060), with MYSQL_DATABASE=aerial_create and MYSQL_USER=aerial_app. Keep the actual password in the ignored .env file. A valid SESSION_SECRET must contain at least 32 characters.

Remote MySQL hosts now always use TLS with certificate-chain and hostname verification. If the cluster uses its own CA, download its CA certificate from DigitalOcean and set:

```dotenv
MYSQL_SSL_CA_FILE=C:/path/to/ca-certificate.crt
```

The path is read by the backend only. Do not disable certificate verification. Loopback MySQL remains compatible without TLS; MYSQL_SSL=true enables verified TLS for loopback too. See [DigitalOcean connection instructions](https://docs.digitalocean.com/products/databases/mysql/how-to/connect/).

With .env configured and the certificate present, run:

```powershell
npm run db:migrate
$env:MYSQL_INTEGRATION='1'
node --env-file=.env --import tsx --test server/tests/mysql.test.ts server/tests/mysqlHttp.test.ts
Remove-Item Env:MYSQL_INTEGRATION
```

The HTTP integration suite starts disposable local API child processes against the actual database, registers two uniquely named test accounts, verifies their stored Argon2id hashes, exercises project CRUD and ownership rejection in both directions, restarts the API process, and verifies the same session cookies and documents still work. It also verifies logout revocation. It removes only its own uniquely named fixtures. No production API process or infrastructure is restarted.

Real-database tests remain opt-in; a skipped test is not evidence that database integration passed. The default local regression suite independently covers account-scoped recovery isolation.

### Real-database verification completed (2026-09-08)

The schema initialization completed against DigitalOcean MySQL on port 25060 with CA-chain and hostname verification enabled. The users, projects, and sessions tables are initialized with foreign keys. The migration account requires REFERENCES as well as the other documented privileges.

Both opt-in real-MySQL tests passed, including real HTTP registration, stored Argon2id verification, login/logout, two-user ownership rejection, project creation/update/rename/retrieval/deletion, and persistence of sessions and documents across an actual API child-process restart. Temporary test fixtures were cleaned up. The 32 default regression tests also passed, including account-scoped local recovery isolation. TypeScript, Oxlint, and production build passed; the existing Vite bundle-size advisory remains. No deployment configuration was changed.
