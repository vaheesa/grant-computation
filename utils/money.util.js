function toCents(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function fromCents(cents) {
  return Number((cents / 100).toFixed(2));
}

function normalizeToPercentageMap(splitMap) {
  const total = Object.values(splitMap).reduce((sum, value) => sum + Number(value || 0), 0);

  if (Math.abs(total - 1) > 0.000001) {
    throw Object.assign(new Error("Funding split percentages must add up to 1.0"), { statusCode: 400 });
  }

  return splitMap;
}

function splitCents(totalCents, splitMap) {
  normalizeToPercentageMap(splitMap);

  const parties = Object.entries(splitMap).map(([name, percentage]) => {
    const raw = totalCents * percentage;

    return {
      name,
      percentage,
      amountCents: Math.floor(raw),
      fraction: raw - Math.floor(raw)
    };
  });

  let allocated = parties.reduce((sum, party) => sum + party.amountCents, 0);
  let remainder = totalCents - allocated;

  parties
    .sort((a, b) => b.fraction - a.fraction)
    .forEach((party) => {
      if (remainder <= 0) {
        return;
      }

      party.amountCents += 1;
      remainder -= 1;
      allocated += 1;
    });

  if (allocated !== totalCents) {
    throw Object.assign(new Error("Unable to allocate funding split without rounding drift"), { statusCode: 500 });
  }

  return parties.reduce((result, party) => {
    result[party.name] = fromCents(party.amountCents);
    return result;
  }, {});
}

module.exports = {
  toCents,
  fromCents,
  splitCents
};
