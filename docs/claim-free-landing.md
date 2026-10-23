# Claim-free workspace (external landing)

## Environment (workspace app)

| Variable | Description |
|----------|-------------|
| `CLAIM_FREE_MINT_BEARER_TOKEN` | **Required** secret for `GET /api/public/claim-free/link` (`Authorization: Bearer …`) |
| `CLAIM_FREE_ALLOWED_ORIGINS` | Comma-separated origins for CORS + `claimed_codes.origin` (e.g. `https://www.example.com`) |
| `CLAIM_FREE_CODE_TTL_HOURS` | Code lifetime in hours (default `24`) |
| `NEXT_PUBLIC_APP_URL` | App base URL for generated register links |
| `SELF_SERVE_REGISTRATION_PLAN_SLUG` | Plan for direct `/register` without claim (default `starter`) |

**Do not** put `CLAIM_FREE_MINT_BEARER_TOKEN` in public browser JavaScript. Call the mint API from your **landing backend** (or serverless function) and return `redirectUrl` to the browser.

## Landing button flow

Your server (or edge function) on the marketing site:

```http
GET {APP_URL}/api/public/claim-free/link
Authorization: Bearer {CLAIM_FREE_MINT_BEARER_TOKEN}
Origin: https://your-landing.example.com
```

The `Origin` header is still used for CORS (if the browser ever calls directly) and stored on the claim row; **minting is authorized by the Bearer token**, not by `Origin` alone.

**200 — spots available**

```json
{
  "available": true,
  "redirectUrl": "https://app.example.com/register?claim_code=Ab3xK9mN2pQr7sT4",
  "expiresAt": "2026-04-09T12:00:00.000Z"
}
```

Redirect the user to `redirectUrl`.

**200 — cap full**

```json
{
  "available": false,
  "waitlist": true,
  "used": 50,
  "user_limit": 50,
  "remaining": 0
}
```

Show waitlist UI and `POST {APP_URL}/api/public/claim-free/waitlist` with `{ "email": "..." }`.

**401** — missing/invalid Bearer token.

**403** — `Origin` not in `CLAIM_FREE_ALLOWED_ORIGINS`, env empty, or (production) missing `Origin` header.

### Postman / local testing

```http
GET http://localhost:3001/api/public/claim-free/link
Authorization: Bearer your-secret-token
Origin: http://localhost:3003
```

In **development**, if `Origin` is omitted, the API may accept the request when the **Host** matches a whitelisted origin (see `claim-free-http.ts`). Bearer is **always** required.

After changing `.env.local`, **restart** the workspace dev server.

Set env in **`apps/workspace/.env.local`**, then **restart** `yarn dev:workspace`. Origins are compared **without trailing slashes** (`https://www.getsettime.com/` = `https://www.getsettime.com`).

## Status (optional)

```http
GET {APP_URL}/api/public/claim-free/status
Origin: https://your-landing.example.com
```

(No Bearer required for status.)

## Registration rules

- Each `claim_code` is **consumed once** when the user completes signup (email/password or Google).
- Invalid or reused codes show: **Your claim is not valid.**
- Direct signup: `/register` with no `claim_code` → `SELF_SERVE_REGISTRATION_PLAN_SLUG` (default `starter`).
- Claim signup → **free** plan, `workspaces.signup_type = free_claimed`.

## Superadmin

On the **free** plan, set **User limit** to cap claim signups (e.g. 50). `-1` / unlimited = no cap.
