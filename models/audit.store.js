const auditRecords = new Map();

class AuditStore {
  save(record) {
    auditRecords.set(record.computationId, record);
    return record;
  }

  getById(computationId) {
    return auditRecords.get(computationId) || null;
  }
}

module.exports = new AuditStore();
