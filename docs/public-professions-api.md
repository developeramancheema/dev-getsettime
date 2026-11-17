# Public professions catalog

Read-only list of **enabled** rows from `professions_list` for external marketing / form dropdowns.

Same access rules as [public-plans-api.md](./public-plans-api.md): `PUBLIC_PLANS_ALLOWED_ORIGINS` and/or `Authorization: Bearer <CLAIM_FREE_MINT_BEARER_TOKEN>`. Enforced via workspace `proxy.ts`.

## Endpoint

```http
GET {APP_URL}/api/public/professions
```

**200**

```json
{
  "professions": [
    {
      "name": "Dentist"
    }
  ]
}
```

Only `name` is returned. Results are sorted by name. Disabled catalog entries are excluded.

**403 / 401 / 500** — same as other public marketing APIs.

### Local testing

```http
GET http://localhost:3001/api/public/professions
Authorization: Bearer <CLAIM_FREE_MINT_BEARER_TOKEN>
```

Or from an allowlisted origin in the browser (e.g. `http://localhost:3000`).