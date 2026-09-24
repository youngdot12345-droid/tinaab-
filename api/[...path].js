import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "../backend/src/routes.js";

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false
}));

registerRoutes(app);

app.use((error, _req, res, _next) => {
  console.error("Tinaab API error:", error);
  if (res.headersSent) return;
  const status = Number(error?.statusCode) || 500;
  res.status(status).json({
    ok: false,
    error: status === 503 ? "Tinaab database is not configured yet." : "Internal server error."
  });
});

export default app;
