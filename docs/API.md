# Hourguard REST API

Base path: `/api/v1`

All endpoints require a Bearer token generated in the dashboard under **Settings → API Keys**:

```
Authorization: Bearer hg_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

The key is hashed (SHA-256) at rest; only its prefix is stored in plaintext. Every request
is scoped to the organization that owns the key — you can never read or write another org's data.

Common responses:

- `401` — missing/invalid `Authorization` header or unknown/revoked key
- `400` — malformed JSON body or failed validation
- `404` — a referenced record (e.g. `member_id`) doesn't exist in your org
- `201` — resource created

Pagination (GET list endpoints): `?page=1&limit=50` (limit capped at 100). Responses are
`{ data, total, limit, offset }`.

Date filters (`from`/`to`/`date`, `YYYY-MM-DD`) are bounded in **UTC** — the full
UTC day `00:00:00.000Z`–`23:59:59.999Z`. (The dashboard bounds by the viewer's local
day, so counts near midnight can differ between the API and the UI.)

---

## Time entries

### `GET /time-entries`
Query params: `from` (YYYY-MM-DD), `to` (YYYY-MM-DD), `member_id`, `project_id`, `page`, `limit`.
Returns entries joined with member and project names.

### `POST /time-entries`
Create a time entry. Body:

| field | required | notes |
|-------|----------|-------|
| `member_id` | yes | must belong to your org |
| `started_at` | yes | ISO 8601 timestamp |
| `project_id` | no | |
| `stopped_at` | no | ISO 8601; omit for an in-progress entry |

Returns `{ data }` with the created row.

---

## Screenshots

### `GET /screenshots`
Query params: `date` (YYYY-MM-DD), `member_id`, `page`, `limit`.
Each item includes a short-lived `signed_url` for the image.

### `POST /screenshots`
Register a screenshot record (upload the image to the `screenshots` storage bucket first). Body:

| field | required | notes |
|-------|----------|-------|
| `member_id` | yes | must belong to your org |
| `time_entry_id` | yes | the entry this capture belongs to |
| `storage_path` | yes | path within the `screenshots` bucket |
| `captured_at` | yes | ISO 8601 timestamp |
| `activity_percent` | no | 0–100, defaults to 0 |

---

## Invoices

### `GET /invoices`
Lists invoices (joined with project name), newest first.

### `POST /invoices`
Generates an invoice by summing completed time entries in the date range. Body:

| field | required | notes |
|-------|----------|-------|
| `from_date` | yes | YYYY-MM-DD |
| `to_date` | yes | YYYY-MM-DD |
| `hourly_rate` | yes | non-negative number |
| `project_id` | no | restrict to one project |
| `title` | no | defaults to `Invoice <from> to <to>` |
| `currency` | no | defaults to `USD` |

The invoice is attributed to an owner/manager of the org.

---

## Projects & Members

### `GET /projects`
Lists the org's projects (paginated).

### `GET /members`
Lists the org's members (paginated).

---

Errors return a generic `{ "error": "Internal server error" }` (details are logged
server-side, not returned). UUID query params (`member_id`, `project_id`) are
validated and return `400` if malformed.
