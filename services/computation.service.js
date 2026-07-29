const crypto = require("crypto");

const grantRules = require("../config/grant-rules");
const eligibilityService = require("./eligibility.service");
const rulesService = require("./rules.service");
const auditStore = require("../models/audit.store");
const { normalizeRange } = require("../utils/date.util");
const { toCents, fromCents, splitCents } = require("../utils/money.util");

class ComputationService {
  compute(request) {
    this.validateRequestShape(request);

    const schemeId = request.schemeId || "familySupportGrant";
    const scheme = rulesService.getSchemeRules(grantRules, schemeId);
    const { start } = normalizeRange(request.quarter.startDate, request.quarter.endDate);
    const asOfDate = request.rateResolution?.asOfDate || request.quarter.startDate;

    const salarySchedule = rulesService.resolveEffectiveRecord(
      scheme.salarySchedules,
      asOfDate,
      "salary schedule"
    );

    const fundingSplit = rulesService.resolveEffectiveRecord(
      scheme.fundingSplits,
      asOfDate,
      "funding split"
    );

    const eligibility = eligibilityService.validate(request.centre, scheme.eligibility);

    if (!eligibility.eligible) {
      const failedResponse = {
        computationId: crypto.randomUUID(),
        schemeId,
        quarter: request.quarter,
        eligible: false,
        eligibility: eligibility.gateResults,
        failures: eligibility.failures,
        calculation: null,
        resolvedRules: {
          salaryScheduleEffectiveFrom: salarySchedule.effectiveFrom,
          fundingSplitEffectiveFrom: fundingSplit.effectiveFrom,
          asOfDate
        },
        computedAt: new Date().toISOString()
      };

      auditStore.save(failedResponse);
      return failedResponse;
    }

    const normativeBreakdown = request.centre.roles.map((role) => {
      const monthlyRate = salarySchedule.monthlyRates[role.name];

      if (monthlyRate === undefined) {
        throw Object.assign(new Error(`Unknown funded role in salary schedule: ${role.name}`), {
          statusCode: 400
        });
      }

      const count = Number(role.count || 0);
      const quarterlyCostCents = toCents(monthlyRate) * 3 * count;

      return {
        role: role.name,
        count,
        monthlyRate: fromCents(toCents(monthlyRate)),
        quarterlyCost: fromCents(quarterlyCostCents),
        quarterlyCostCents
      };
    });

    const normativeCostCents = normativeBreakdown.reduce((sum, item) => sum + item.quarterlyCostCents, 0);

    const tierBand = rulesService.findTier(request.centre.type, request.centre.caseload, scheme.tiers);
    const grossGrantCents = Math.round(normativeCostCents * Number(tierBand.percentage));

    const coFundingCents = toCents(request.centre.coFunding || 0);
    const netGrantCents = scheme.deductions.floorAtZero
      ? Math.max(0, grossGrantCents - coFundingCents)
      : grossGrantCents - coFundingCents;

    const funding = splitCents(netGrantCents, fundingSplit.parties);

    const result = {
      computationId: crypto.randomUUID(),
      schemeId,
      quarter: {
        startDate: start.toISOString().slice(0, 10),
        endDate: request.quarter.endDate
      },
      eligible: true,
      eligibility: eligibility.gateResults,
      resolvedRules: {
        salaryScheduleEffectiveFrom: salarySchedule.effectiveFrom,
        fundingSplitEffectiveFrom: fundingSplit.effectiveFrom,
        asOfDate
      },
      calculation: {
        normativeBreakdown: normativeBreakdown.map(({ quarterlyCostCents, ...safe }) => safe),
        normativeCost: fromCents(normativeCostCents),
        tier: {
          centreType: request.centre.type,
          caseload: Number(request.centre.caseload),
          min: tierBand.min,
          max: tierBand.max,
          percentage: tierBand.percentage
        },
        grossGrant: fromCents(grossGrantCents),
        deduction: {
          coFunding: fromCents(coFundingCents)
        },
        netGrant: fromCents(netGrantCents),
        funding
      },
      computedAt: new Date().toISOString()
    };

    auditStore.save(result);
    return result;
  }

  getAuditRecord(computationId) {
    return auditStore.getById(computationId);
  }

  validateRequestShape(request) {
    if (!request || typeof request !== "object") {
      throw Object.assign(new Error("Request body must be a JSON object"), { statusCode: 400 });
    }

    if (!request.quarter || typeof request.quarter !== "object") {
      throw Object.assign(new Error("quarter is required"), { statusCode: 400 });
    }

    if (!request.centre || typeof request.centre !== "object") {
      throw Object.assign(new Error("centre is required"), { statusCode: 400 });
    }

    if (!Array.isArray(request.centre.roles)) {
      throw Object.assign(new Error("centre.roles must be an array"), { statusCode: 400 });
    }

    const invalidRole = request.centre.roles.find((role) => !role.name || Number(role.count) < 0);
    if (invalidRole) {
      throw Object.assign(new Error("Each role must include a name and non-negative count"), {
        statusCode: 400
      });
    }
  }
}

module.exports = new ComputationService();
