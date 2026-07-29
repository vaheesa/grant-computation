module.exports = {
  familySupportGrant: {
    id: "familySupportGrant",
    name: "Family Support Grant",
    eligibility: {
      minimumCaseload: 10,
      licenceMustBeActiveFullQuarter: true,
      requiredRole: "Senior Social Worker",
      minimumQualifiedSeniorWorkers: 1
    },
    salarySchedules: [
      {
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
        monthlyRates: {
          "Senior Social Worker": 6200,
          "Social Worker": 4800,
          "Programme Assistant": 2900
        }
      }
    ],
    tiers: {
      Standard: [
        { min: 10, max: 29, percentage: 0.7 },
        { min: 30, max: 49, percentage: 0.85 },
        { min: 50, max: null, percentage: 1 }
      ],
      Rural: [
        { min: 10, max: 19, percentage: 0.8 },
        { min: 20, max: 39, percentage: 0.9 },
        { min: 40, max: null, percentage: 1 }
      ]
    },
    fundingSplits: [
      {
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
        parties: {
          Ministry: 0.6,
          "Community Chest": 0.25,
          "Town Council Social Support": 0.15
        }
      }
    ],
    deductions: {
      floorAtZero: true
    }
  }
};
