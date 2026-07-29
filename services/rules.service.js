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
    const bands = tiers[centreType];

    if (!bands) {
      throw Object.assign(new Error(`No tier bands configured for centre type: ${centreType}`), {
        statusCode: 400
      });
    }

    const band = bands.find((candidate) => {
      const min = Number(candidate.min);
      const max = candidate.max === null ? null : Number(candidate.max);
      return Number(caseload) >= min && (max === null || Number(caseload) <= max);
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

    const matched = records.find((record) => {
      const from = parseDate(record.effectiveFrom, `${recordName}.effectiveFrom`);
      const to = parseOptionalDate(record.effectiveTo);
      return asOfDate >= from && (!to || asOfDate <= to);
    });

    if (!matched) {
      throw Object.assign(new Error(`No active ${recordName} found for ${asOfDateIso}`), {
        statusCode: 400
      });
    }

    return matched;
  }
}

module.exports = new RulesService();
