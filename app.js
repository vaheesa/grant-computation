const express = require("express");
const grantRouter = require("./controllers/grant.controller");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use("/grant", grantRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    error: err.message || "Internal Server Error"
  });
});

app.listen(port, () => {
  console.log(`Grant service running on port ${port}`);
});
