# Public plans catalog (external pricing pages)

## Environment (workspace app)

| Variable | Description |
|----------|-------------|
| `PUBLIC_PLANS_ALLOWED_ORIGINS` | Comma-separated origins allowed to call the API via browser CORS (e.g. `https://www.getsettime.com,https://getsettime.com`) |
| `PUBLIC_PLANS_ALLOW_REQUEST_HOST` | Set to `true` only for deliberate same-host API testing (Host must be in the allowlist). **Default: off** — avoids curl/Postman hitting the API port without Bearer |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_URL` | Required for server-side reads (`getSupabaseAdmin`) |
| `CLAIM_FREE_MINT_BEARER_TOKEN` | Same secret as claim-free mint; server-side callers send `Authorization: Bearer …` (never expose in browser JS) |

Set env in **`apps/workspace/.env.local`**, then **restart** the workspace dev server. Origins are compared **without trailing slashes**.

## Endpoint

Read-only. No authentication required; access is limited by an allowlist.

### How the caller is verified

The API **does not** treat a bare `Origin` header as proof of where the request came from (Postman/curl can forge `Origin`).

1. **`Referer`** — origin taken from the referer URL when present.
2. **`Origin` + `Sec-Fetch-Site`** — only when the browser sends Fetch Metadata (typical `fetch` from a real page).
3. **`PUBLIC_PLANS_ALLOW_REQUEST_HOST=true`** — request **Host** may match the allowlist (advanced local testing only).

**Do not** list the workspace API origin (e.g. `http://localhost:3001`) in `PUBLIC_PLANS_ALLOWED_ORIGINS` unless you intentionally allow direct server-to-self calls. List the **marketing site** origin (e.g. `http://localhost:3000`).

Access is allowed when **either**:

1. **`Authorization: Bearer &lt;CLAIM_FREE_MINT_BEARER_TOKEN&gt;`** (landing **server** / Postman backend tests — same token as claim-free mint), or  
2. **Browser** from an allowlisted origin (Referer, or `Origin` with `Sec-Fetch-Site`).

New routes under `/api/public/*` are gated in workspace **proxy.ts** (except `/api/public/claim-free/*`, which keeps its own rules).

```http
GET {APP_URL}/api/public/plans
```

(Browsers send `Origin` / `Referer` automatically; do not rely on manually setting `Origin` in API clients.)

**200**

```json
{
  "plans": [
    {
      "name": "Starter",
      "slug": "starter",
      "description": "Perfect for solo providers and small teams launching online booking.",
      "price": 999,
      "annual_discount_percent": 20,
      "booking_limit": 250,
      "booking_limit_period": "monthly",
      "service_provider_limit": 2,
      "extra_service_provider_seat_price": 0,
      "google_calendar_sync": true,
      "email_notifications": true,
      "public_booking_page": true,
      "whatsapp_automation": false,
      "online_payments": false,
      "additional_locations": false,
      "is_active": true,
      "billing_interval": "month",
      "metadata": null,
      "display_order": 0,
      "content": {
        "context": "upgrade_modal",
        "subtitle": null,
        "features": ["250 bookings"],
        "cta_label": "Get started",
        "cta_variant": "primary",
        "badge_label": null,
        "is_highlighted": false
      }
    }
  ]
}
```

Same shape as superadmin `GET /api/plans` (plan row + nested `content` for `upgrade_modal`), but only **active** plans, without `id`, `user_limit`, `workspace_limit`, or `admin_limit` on the plan, and without `id`, `plan_id`, `created_at`, `updated_at`, or `display_order` on `content` (and without `id`, `created_at`, or `updated_at` on the plan). Limit fields stored as `-1` are returned as `"unlimited"`. The `free` plan (`slug: "free"`) is **excluded**.

Annual price (client-side): `price * 12 * (1 - annual_discount_percent / 100)`.

**403** — env empty, caller not allowlisted, or only a forged `Origin` header without browser Fetch Metadata / Referer (`reason: origin_header_spoofed`).

**500** — missing service role configuration or database error.

### Local testing

```http
GET http://localhost:3001/api/public/plans
Origin: http://localhost:3003
```

CORS preflight:

```http
OPTIONS http://localhost:3001/api/public/plans
Origin: http://localhost:3003
```

## Related

- [public-subscribers-api.md](./public-subscribers-api.md) — `POST /api/public/subscribers`
- [public-professions-api.md](./public-professions-api.md) — `GET /api/public/professions`
- [public-submit-forms-api.md](./public-submit-forms-api.md) — `POST /api/public/submit-forms`

## Superadmin fields

Edit plans in the superadmin **Plans** UI (or `/api/plans`):

- **Description** — one-liner on the `plans` row
- **Annual discount (%)** — `annual_discount_percent` (0–100)