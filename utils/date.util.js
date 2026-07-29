function parseDate(value, fieldName) {
  if (!value) {
    throw Object.assign(new Error(`${fieldName} is required`), { statusCode: 400 });
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw Object.assign(new Error(`${fieldName} must be a valid ISO date`), { statusCode: 400 });
  }

  return date;
}

function normalizeRange(startDate, endDate) {
  const start = parseDate(startDate, "quarter.startDate");
  const end = parseDate(endDate, "quarter.endDate");

  if (start > end) {
    throw Object.assign(new Error("quarter.startDate must be before or equal to quarter.endDate"), {
      statusCode: 400
    });
  }

  return { start, end };
}

function parseOptionalDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw Object.assign(new Error("Configuration contains invalid effective date"), {
      statusCode: 500
    });
  }

  return date;
}

module.exports = {
  parseDate,
  normalizeRange,
  parseOptionalDate
};
