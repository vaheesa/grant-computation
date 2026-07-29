const test = require("node:test");
const assert = require("node:assert/strict");

const rulesService = require("../services/rules.service");
const { normalizeRange } = require("../utils/date.util");

test("normalizeRange accepts same start and end date", () => {
  const range = normalizeRange("2026-07-01", "2026-07-01");
  assert.ok(range.start instanceof Date);
  assert.ok(range.end instanceof Date);
});

test("normalizeRange rejects start date after end date", () => {
  assert.throws(() => normalizeRange("2026-10-01", "2026-09-30"), (error) => {
    assert.equal(error.statusCode, 400);
    assert.match(error.message, /quarter\.startDate must be before or equal to quarter\.endDate/);
    return true;
  });
});

test("findTier uses inclusive boundaries", () => {
  const tiers = {
    Rural: [
      { min: 10, max: 19, percentage: 0.8 },
      { min: 20, max: 39, percentage: 0.9 },
      { min: 40, max: null, percentage: 1 }
    ]
  };

  const band = rulesService.findTier("Rural", 39, tiers);
  assert.equal(band.percentage, 0.9);
});

test("findTier rejects invalid caseload", () => {
  const tiers = {
    Standard: [{ min: 10, max: null, percentage: 1 }]
  };

  assert.throws(() => rulesService.findTier("Standard", -1, tiers), (error) => {
    assert.equal(error.statusCode, 400);
    assert.match(error.message, /Invalid caseload value/);
    return true;
  });
});

test("resolveEffectiveRecord rejects overlapping effective-dated entries", () => {
  const records = [
    { effectiveFrom: "2026-01-01", effectiveTo: null, monthlyRates: {} },
    { effectiveFrom: "2026-06-01", effectiveTo: null, monthlyRates: {} }
  ];

  assert.throws(() => rulesService.resolveEffectiveRecord(records, "2026-07-01", "salary schedule"), (error) => {
    assert.equal(error.statusCode, 500);
    assert.match(error.message, /overlapping salary schedule records/);
    return true;
  });
});

test("resolveEffectiveRecord rejects invalid effective range", () => {
  const records = [
    { effectiveFrom: "2026-12-31", effectiveTo: "2026-01-01", parties: {} }
  ];

  assert.throws(() => rulesService.resolveEffectiveRecord(records, "2026-07-01", "funding split"), (error) => {
    assert.equal(error.statusCode, 500);
    assert.match(error.message, /effectiveTo is before effectiveFrom/);
    return true;
  });
});
