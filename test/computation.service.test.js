const test = require("node:test");
const assert = require("node:assert/strict");

const computationService = require("../services/computation.service");

function buildBaseRequest() {
  return {
    schemeId: "familySupportGrant",
    quarter: {
      startDate: "2026-07-01",
      endDate: "2026-09-30"
    },
    rateResolution: {
      asOfDate: "2026-07-01"
    },
    centre: {
      id: "CTR-B",
      type: "Rural",
      caseload: 38,
      licenceActiveFullQuarter: true,
      coFunding: 4500,
      roles: [
        { name: "Senior Social Worker", count: 1, qualifiedCount: 1 },
        { name: "Social Worker", count: 2 },
        { name: "Programme Assistant", count: 1 }
      ]
    }
  };
}

test("compute returns expected happy-path grant outputs", () => {
  const request = buildBaseRequest();
  const result = computationService.compute(request);

  assert.equal(result.eligible, true);
  assert.equal(result.calculation.normativeCost, 56100);
  assert.equal(result.calculation.grossGrant, 50490);
  assert.equal(result.calculation.netGrant, 45990);
  assert.equal(result.calculation.funding.Ministry, 27594);
});

test("compute persists retrievable audit record", () => {
  const request = buildBaseRequest();
  const result = computationService.compute(request);
  const auditRecord = computationService.getAuditRecord(result.computationId);

  assert.ok(auditRecord);
  assert.equal(auditRecord.computationId, result.computationId);
});

test("compute returns ineligible response with null calculation", () => {
  const request = buildBaseRequest();
  request.centre.licenceActiveFullQuarter = false;

  const result = computationService.compute(request);

  assert.equal(result.eligible, false);
  assert.equal(result.calculation, null);
  assert.ok(Array.isArray(result.failures));
  assert.ok(result.failures.length > 0);
});

test("compute rejects invalid caseload", () => {
  const request = buildBaseRequest();
  request.centre.caseload = -3;

  assert.throws(() => computationService.compute(request), (error) => {
    assert.equal(error.statusCode, 400);
    assert.match(error.message, /centre\.caseload must be a non-negative number/);
    return true;
  });
});

test("compute rejects unknown role in salary schedule", () => {
  const request = buildBaseRequest();
  request.centre.roles.push({ name: "Unmapped Role", count: 1 });

  assert.throws(() => computationService.compute(request), (error) => {
    assert.equal(error.statusCode, 400);
    assert.match(error.message, /Unknown funded role in salary schedule/);
    return true;
  });
});
