class EligibilityService {
  validate(centre, eligibilityRules) {
    const failures = [];
    const gateResults = [];

    const gate1 = !eligibilityRules.licenceMustBeActiveFullQuarter || Boolean(centre.licenceActiveFullQuarter);
    gateResults.push({ gate: "G1", passed: gate1, reason: gate1 ? null : "Programme licence is not active for full quarter" });
    if (!gate1) {
      failures.push("G1 failed: Programme licence is not active for full quarter");
    }

    const requiredRole = centre.roles.find((role) => role.name === eligibilityRules.requiredRole);
    const qualifiedCount = requiredRole ? Number(requiredRole.qualifiedCount ?? requiredRole.count ?? 0) : 0;
    const gate2 = qualifiedCount >= Number(eligibilityRules.minimumQualifiedSeniorWorkers || 1);
    gateResults.push({
      gate: "G2",
      passed: gate2,
      reason: gate2 ? null : `At least ${eligibilityRules.minimumQualifiedSeniorWorkers} qualified ${eligibilityRules.requiredRole} required`
    });
    if (!gate2) {
      failures.push(`G2 failed: Missing required qualified ${eligibilityRules.requiredRole}`);
    }

    const gate3 = Number(centre.caseload || 0) >= Number(eligibilityRules.minimumCaseload || 0);
    gateResults.push({ gate: "G3", passed: gate3, reason: gate3 ? null : `Caseload must be at least ${eligibilityRules.minimumCaseload}` });
    if (!gate3) {
      failures.push("G3 failed: Caseload below minimum threshold");
    }

    return {
      eligible: failures.length === 0,
      failures,
      gateResults
    };
  }
}

module.exports = new EligibilityService();
