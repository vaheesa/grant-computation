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
