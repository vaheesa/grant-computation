const express = require("express");
const grantRouter = require("./controllers/grant.controller");
const logger = require("./utils/logger.util");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use((req, _res, next) => {
  const startedAt = Date.now();

  logger.info("Incoming request", {
    method: req.method,
    path: req.path
  });

  _res.on("finish", () => {
    logger.info("Request completed", {
      method: req.method,
      path: req.path,
      statusCode: _res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });

  logger.debug("Incoming request", {
    method: req.method,
    path: req.path,
    query: req.query,
    bodyKeys: req.body && typeof req.body === "object" ? Object.keys(req.body) : []
  });
  next();
});

app.use("/grant", grantRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;

  logger.error("Request failed", {
    statusCode,
    message: err.message
  });

  res.status(statusCode).json({
    error: err.message || "Internal Server Error"
  });
});

app.listen(port, () => {
  logger.info("Grant service started", {
    port,
    logLevel: process.env.LOG_LEVEL || "info"
  });
});
