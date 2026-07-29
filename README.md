# Grant Computation Service

Configuration-driven Node.js service for repeatable, auditable grant calculations.

## What it supports

- Multi-gate eligibility checks
- Effective-dated salary schedules
- Tier band lookup by centre type
- Co-funding deduction with floor-at-zero behavior
- Effective-dated funding splits
- In-memory audit record retrieval by computation ID

## Project structure

```text
grant-computation/
├── app.js
├── package.json
├── config/
│   └── grant-rules.js
├── controllers/
│   └── grant.controller.js
├── services/
│   ├── computation.service.js
│   ├── eligibility.service.js
│   └── rules.service.js
├── models/
│   └── audit.store.js
└── utils/
    ├── date.util.js
    └── money.util.js
```

## Setup

```bash
npm install
npm start
```

Service runs on `http://localhost:3000` by default.

## Logging configuration

Logging is configurable through `LOG_LEVEL`:

- `info` (default): startup and important operational logs.
- `debug`: includes request-level debug logs.

Supported levels: `error`, `info`, `debug`.

Current behavior:

- `info` logs are emitted for startup, incoming requests, and request completion.
- `error` logs are emitted by centralized error handling.
- `debug` logs include additional request detail and are shown only when `LOG_LEVEL=debug`.

### Examples

```bash
# Default (info)
npm start

# Explicit info level
LOG_LEVEL=info npm start

# Verbose debug logs
LOG_LEVEL=debug npm start
```

For Windows PowerShell:

```powershell
$env:LOG_LEVEL="debug"
npm start
```

## Endpoints

- `GET /health`
- `POST /grant/compute`
- `GET /grant/audit/:computationId`

## Sample compute request (Scenario 1)

```json
{
  "schemeId": "familySupportGrant",
  "quarter": {
    "startDate": "2026-07-01",
    "endDate": "2026-09-30"
  },
  "rateResolution": {
    "asOfDate": "2026-07-01"
  },
  "centre": {
    "id": "CTR-B",
    "type": "Rural",
    "caseload": 38,
    "licenceActiveFullQuarter": true,
    "coFunding": 4500,
    "roles": [
      {
        "name": "Senior Social Worker",
        "count": 1,
        "qualifiedCount": 1
      },
      {
        "name": "Social Worker",
        "count": 2
      },
      {
        "name": "Programme Assistant",
        "count": 1
      }
    ]
  }
}
```

## Sample curl

```bash
curl -X POST http://localhost:3000/grant/compute \
  -H "Content-Type: application/json" \
  -d @sample-request.json
```

## Expected key outputs for Scenario 1

- `normativeCost`: `56100.00`
- `tier.percentage`: `0.9`
- `grossGrant`: `50490.00`
- `deduction.coFunding`: `4500.00`
- `netGrant`: `45990.00`
- `funding.Ministry`: `27594.00`
- `funding["Community Chest"]`: `11497.50`
- `funding["Town Council Social Support"]`: `6898.50`

## Notes

- Monetary math is handled in cents to reduce floating-point drift.
- Rules are defined in `config/grant-rules.js` and can be extended for new schemes.
- Audit storage is in-memory for now (`models/audit.store.js`) and can be replaced with a database-backed store.

## Configuration explained

All grant logic is configuration-driven in `config/grant-rules.js`. The service reads this config at runtime and applies the matching rule set for the request.

Each scheme (for example `familySupportGrant`) contains:

- `eligibility`: Gate checks such as minimum caseload, licence requirement, and required qualified roles.
- `salarySchedules`: Effective-dated monthly rates per role.
- `tiers`: Percentage bands by `centreType` and caseload range.
- `deductions`: Post-calculation behavior such as `floorAtZero`.
- `fundingSplits`: Effective-dated distribution percentages across funding parties.

For effective-dated arrays (`salarySchedules`, `fundingSplits`):

- `effectiveFrom`: Start date when the record becomes valid.
- `effectiveTo`: End date when the record stops being valid.
- `effectiveTo: null`: Open-ended record (no end date), so it remains active until a newer dated rule is introduced.

At compute time, the system resolves the active record using `rateResolution.asOfDate` (or falls back to `quarter.startDate`) and selects the matching config entry.

## How to configure (with scenarios)

Use this checklist when updating `config/grant-rules.js`:

1. Define or update the target scheme key (for example `familySupportGrant`).
2. Keep eligibility gates explicit under `eligibility`.
3. Add salary and funding changes as new effective-dated records (do not overwrite history).
4. Ensure `tiers` cover all caseload ranges you expect.
5. Run a compute request with `rateResolution.asOfDate` to verify the intended rule set is selected.

### Scenario A: Annual salary revision (Jan 2027)

If rates are revised in January, add a new record in `salarySchedules`:

```javascript
salarySchedules: [
  {
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    monthlyRates: {
      "Senior Social Worker": 6200,
      "Social Worker": 4800,
      "Programme Assistant": 2900
    }
  },
  {
    effectiveFrom: "2027-01-01",
    effectiveTo: null,
    monthlyRates: {
      "Senior Social Worker": 6450,
      "Social Worker": 5000,
      "Programme Assistant": 3050
    }
  }
]
```

Why this works:

- The 2026 record remains preserved for historical recomputation.
- The 2027 record becomes the new open-ended default.

### Scenario B: Re-run Q3 2026 in Feb 2027 (appeal/recompute)

When recomputing a past quarter after a revision, send an explicit `rateResolution.asOfDate` from the original period:

```json
"quarter": {
  "startDate": "2026-07-01",
  "endDate": "2026-09-30"
},
"rateResolution": {
  "asOfDate": "2026-07-01"
}
```

Result:

- The service resolves the 2026 salary/funding records, not the newer 2027 records.
- Audit output keeps traceability of which effective records were used.

### Scenario C: Changing funding split from a future date

To adjust party percentages from a future quarter, append a new `fundingSplits` entry with a future `effectiveFrom` and close the previous entry with `effectiveTo`.

This prevents historical computations from shifting unexpectedly.

### Scenario D: Eligibility policy tightening

If policy requires stricter staffing, update `eligibility.minimumQualifiedSeniorWorkers`.

Expected behavior:

- Ineligible requests return `eligible: false` and populate `failures`.
- No grant calculation is produced (`calculation: null`).

## Edge cases handled

- Reject non-object request bodies with `400`.
- Reject missing `quarter`, missing `centre`, or non-array `centre.roles`.
- Reject invalid `quarter` date range (`startDate > endDate`).
- Reject invalid `centre.type`, negative/non-numeric `centre.caseload`, and invalid `centre.coFunding`.
- Reject role entries with missing/blank `name`, invalid `count`, or invalid `qualifiedCount`.
- Reject unknown `schemeId`, unknown centre tier mapping, and unknown funded role names.
- Reject missing active effective-dated records for the requested `asOfDate`.
- Fail fast on config issues: empty effective-dated arrays, `effectiveTo < effectiveFrom`, and overlapping active records.

## AI usage and my corrections

1. **Project bootstrap**
   - AI helped scaffold the Express service structure (`app.js`, `controllers`, `services`, `utils`, `models`).
   - I corrected naming/layout to keep domain logic in service modules instead of route handlers.

2. **API surface design**
   - AI proposed endpoint shapes for compute, health, and audit retrieval.
   - I adjusted endpoint paths to the final contract: `GET /health`, `POST /grant/compute`, `GET /grant/audit/:computationId`.

3. **Request validation**
   - AI generated initial request-shape validation.
   - I tightened validation for `centre.type`, `centre.caseload`, `centre.coFunding`, and `centre.roles` (including non-empty names and non-negative numeric counts), and ensured invalid requests return `400`.

4. **Eligibility gates**
   - AI drafted baseline eligibility checks.
   - I corrected business gates to include licence status, minimum caseload, required role presence, and qualified senior worker thresholds.

5. **Effective-dated rules resolution**
   - AI suggested date-based rule matching.
   - I corrected the approach to resolve by `rateResolution.asOfDate` with fallback to `quarter.startDate` for deterministic re-runs.

6. **Tier band logic**
   - AI proposed caseload-to-tier mapping.
   - I corrected boundary handling so min/max comparisons are inclusive and produce clear `400` errors when no tier matches.

7. **Monetary computation strategy**
   - AI suggested arithmetic flow for normative, gross, and net grant.
   - I corrected implementation to compute in cents (`toCents`/`fromCents`) to reduce floating-point drift.

8. **Funding split distribution**
   - AI drafted proportional split output across funding parties.
   - I corrected rounding behavior using cent-based splitting so totals reconcile exactly to `netGrant`.

9. **Auditability outputs**
   - AI proposed returning only final grant values.
   - I corrected response/audit payload to include `resolvedRules` effective dates, eligibility gates, and timestamp for traceability.

10. **Operational logging controls**
    - AI initially used basic console logging.
    - I corrected this by introducing configurable log levels via `LOG_LEVEL` (`error`, `info`, `debug`) so runtime verbosity can be tuned without code changes.

11. **Date consistency safeguards**
    - AI assumed quarter and rule dates would always be well-formed and non-conflicting.
    - I corrected this by enforcing quarter range validation, rejecting invalid effective ranges (`effectiveTo < effectiveFrom`), and failing fast on overlapping active effective-dated records.

