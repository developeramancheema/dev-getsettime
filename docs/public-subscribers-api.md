# Public subscribers API (email signups)

Uses the same allowlist as the public plans API: `PUBLIC_PLANS_ALLOWED_ORIGINS` in the workspace app.

## Endpoint

```http
POST {APP_URL}/api/public/subscribers
Origin: https://www.example.com
Content-Type: application/json

{ "email": "user@example.com" }
```

Optional body field:

- `source` — string label (defaults to request `Origin` when omitted)

### Response shape

All JSON responses use:

```json
{ "status": true | false, "message": "…" }
```

**201 — success**

```json
{
  "status": true,
  "message": "Email subscribed successfully"
}
```

**409 — duplicate email**

```json
{
  "status": false,
  "message": "This email is already subscribed."
}
```

**400** — invalid or missing email (`status: false`, `message` describes the issue)

**403** — origin not allowlisted (`status: false`)

**500** — server error (`status: false`)

### Input hardening

- **SQL injection**: inserts use the Supabase client (bound parameters only; no string-built SQL).
- **Email**: trimmed, lowercased, max 254 chars, no control/null characters, rejects `<>'"\\;\`` and `..`, must match a strict ASCII `local@domain.tld` pattern.
- **`source`**: optional; control characters stripped, max 200 chars.
- **XSS in DB**: payloads are not executed in the API; escape output if you render subscriber emails in an admin UI later.

## Database

Table `public_subscribers` (migration `create_public_subscribers.sql`):

| Column | Type | Notes |
|--------|------|--------|
| `id` | bigserial | PK |
| `email` | text | unique (case-insensitive) |
| `created_at` | timestamptz | default `now()` |
| `source` | text | optional |

## Superadmin

List and filter in the superadmin app: **Subscribers** (`GET /api/public-subscribers?page=1&limit=25&email=…`).

## Local testing

```http
POST http://localhost:3001/api/public/subscribers
Origin: http://localhost:3003
Content-Type: application/json

{ "email": "test@example.com" }
```