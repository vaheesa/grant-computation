const express = require("express");
const computationService = require("../services/computation.service");

const router = express.Router();

router.post("/compute", (req, res, next) => {
  try {
    const result = computationService.compute(req.body);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.get("/audit/:computationId", (req, res) => {
  const record = computationService.getAuditRecord(req.params.computationId);

  if (!record) {
    return res.status(404).json({ error: "Computation record not found" });
  }

  return res.json(record);
});

module.exports = router;
