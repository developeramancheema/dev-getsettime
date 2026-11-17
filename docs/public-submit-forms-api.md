# Public submit-forms API

Unified endpoint for marketing forms: **contact**, **solutions**, and **claim_free** (landing lead form — not workspace claim-code mint).

Uses the same protection as [public-plans-api.md](./public-plans-api.md): `PUBLIC_PLANS_ALLOWED_ORIGINS` and/or `Authorization: Bearer <CLAIM_FREE_MINT_BEARER_TOKEN>`.

## Endpoint

```http
POST {APP_URL}/api/public/submit-forms
Content-Type: application/json
```

Flat JSON body: set `form_type` plus common fields and form-specific keys.

**201**

```json
{
  "status": true,
  "message": "Form submitted successfully"
}
```

**400 / 401 / 403 / 500**

```json
{
  "status": false,
  "message": "…"
}
```

## Common fields (all types)

| Field | Required | Notes |
|-------|----------|--------|
| `form_type` | yes | `contact` \| `solutions` \| `claim_free` |
| `name` | yes | |
| `email` | yes | validated like subscribers API |
| `phone` | yes | |
| `source` | no | defaults to caller origin |

## 1. Contact (`form_type: "contact"`)

| Field | Required |
|-------|----------|
| `message` | yes |
| `profession` | yes (stored in `metadata`) |

Example:

```json
{
  "form_type": "contact",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+919876543210",
  "profession": "Dentist",
  "message": "I would like a demo."
}
```

## 2. Solutions (`form_type: "solutions"`)

| Field | Required |
|-------|----------|
| `business_name` | yes |
| `business_type` | yes |
| `team_size` | no |
| `current_booking_method` | no |
| `improvement_goals` | no |
| `additional_notes` | no |

## 3. Claim free lead (`form_type: "claim_free"`)

| Field | Required |
|-------|----------|
| `business_name` | yes |
| `business_type` | yes |
| `country` | yes |
| `current_booking_method` | yes |
| `staff_provider_count` | yes |
| `preferred_call_demo_time` | yes |
| `main_services` | yes |
| `website` | no |

## Superadmin

- UI: **Form submissions** (`/form-submissions`)
- API: `GET /api/public-form-submissions?page=1&limit=25&q=…&form_type=contact`

Search `q` matches name, email, phone, message, and metadata (contains, case-insensitive).

## Database

Table `public_form_submissions` — migration `create_public_form_submissions.sql`.