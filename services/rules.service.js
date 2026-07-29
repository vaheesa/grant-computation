const { parseDate, parseOptionalDate } = require("../utils/date.util");

class RulesService {
  getSchemeRules(allRules, schemeId) {
    const schemeRules = allRules[schemeId];

    if (!schemeRules) {
      throw Object.assign(new Error(`Unknown schemeId: ${schemeId}`), { statusCode: 400 });
    }

    return schemeRules;
  }

  findTier(centreType, caseload, tiers) {
    if (!tiers || typeof tiers !== "object") {
      throw Object.assign(new Error("Tier configuration is missing or invalid"), {
        statusCode: 500
      });
    }

    const caseloadNumber = Number(caseload);
    if (!Number.isFinite(caseloadNumber) || caseloadNumber < 0) {
      throw Object.assign(new Error(`Invalid caseload value: ${caseload}`), {
        statusCode: 400
      });
    }

    const bands = tiers[centreType];

    if (!bands) {
      throw Object.assign(new Error(`No tier bands configured for centre type: ${centreType}`), {
        statusCode: 400
      });
    }

    const band = bands.find((candidate) => {
      const min = Number(candidate.min);
      const max = candidate.max === null ? null : Number(candidate.max);
      return caseloadNumber >= min && (max === null || caseloadNumber <= max);
    });

    if (!band) {
      throw Object.assign(new Error(`No tier found for caseload ${caseload} and centre type ${centreType}`), {
        statusCode: 400
      });
    }

    return band;
  }

  resolveEffectiveRecord(records, asOfDateIso, recordName) {
    const asOfDate = parseDate(asOfDateIso, "rateResolution.asOfDate");

    if (!Array.isArray(records) || records.length === 0) {
      throw Object.assign(new Error(`No ${recordName} records configured`), {
        statusCode: 500
      });
    }

    const matched = records.filter((record) => {
      const from = parseDate(record.effectiveFrom, `${recordName}.effectiveFrom`);
      const to = parseOptionalDate(record.effectiveTo);

      if (to && to < from) {
        throw Object.assign(new Error(`Configuration error: ${recordName}.effectiveTo is before effectiveFrom`), {
          statusCode: 500
        });
      }

      return asOfDate >= from && (!to || asOfDate <= to);
    });

    if (matched.length === 0) {
      throw Object.assign(new Error(`No active ${recordName} found for ${asOfDateIso}`), {
        statusCode: 400
      });
    }

    if (matched.length > 1) {
      throw Object.assign(new Error(`Configuration error: overlapping ${recordName} records for ${asOfDateIso}`), {
        statusCode: 500
      });
    }

    return matched[0];
  }
}

module.exports = new RulesService();
