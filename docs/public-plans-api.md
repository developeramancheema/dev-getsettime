# Public plans catalog (external pricing pages)

## Environment (workspace app)

| Variable | Description |
|----------|-------------|
| `PUBLIC_PLANS_ALLOWED_ORIGINS` | Comma-separated origins allowed to call the API via browser CORS (e.g. `https://www.getsettime.com,https://getsettime.com`) |
| `PUBLIC_PLANS_ALLOW_REQUEST_HOST` | Set to `true` to accept requests when `Origin` is missing but Host matches the allowlist (default: enabled in development only) |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_URL` | Required for server-side reads (`getSupabaseAdmin`) |

Set env in **`apps/workspace/.env.local`**, then **restart** the workspace dev server. Origins are compared **without trailing slashes**.

## Endpoint

Read-only. No authentication required; access is limited by **Origin** allowlist.

```http
GET {APP_URL}/api/public/plans
Origin: https://www.example.com
```

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

**403** — `Origin` missing (production), env empty, or origin not in `PUBLIC_PLANS_ALLOWED_ORIGINS`.

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

Email-only signups from the same allowlist: [public-subscribers-api.md](./public-subscribers-api.md) (`POST /api/public/subscribers`).

## Superadmin fields

Edit plans in the superadmin **Plans** UI (or `/api/plans`):

- **Description** — one-liner on the `plans` row
- **Annual discount (%)** — `annual_discount_percent` (0–100)