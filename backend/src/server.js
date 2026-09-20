import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pg from "pg";
import { registerRoutes } from "./routes.js";

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 3000);
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(process.env.MEDIA_STORAGE_DIR || "uploads", { maxAge: "1h" }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "youngdots12345@gmail.com";

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "tinaab-api", databaseConfigured: Boolean(pool), time: new Date().toISOString() });
});

app.get("/api/config", (_req, res) => {
  res.json({
    contactEmail: CONTACT_EMAIL,
    wallet: { withdrawalsPerCalendarDay: 2, currency: "NGN", bankAccountsEnabled: true },
    payout: { providerConfigured: Boolean(process.env.PAYOUT_PROVIDER) }
  });
});

app.post("/api/contact", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim();
  const message = String(req.body?.message || "").trim();

  if (!name || !message) return res.status(400).json({ error: "Name and message are required." });
  if (name.length > 100 || email.length > 200 || message.length > 5000) {
    return res.status(400).json({ error: "One or more fields are too long." });
  }

  // The form is intentionally first-party. Email delivery can be connected later.
  // Until then, messages are stored in the database when DATABASE_URL is configured.
  if (pool) {
    await pool.query(
      "INSERT INTO contact_messages (name,email,message) VALUES ($1,$2,$3)",
      [name, email || null, message]
    );
  }

  res.status(201).json({
    ok: true,
    message: "Message received.",
    contactEmail: CONTACT_EMAIL
  });
});

// Register the modular Tinaab API routes after the core service routes above.
// This keeps authentication, profiles and social features connected to the server.
registerRoutes(app);


app.use((error, _req, res, _next) => {
  console.error("Tinaab API error:", error);
  if (res.headersSent) return;
  res.status(500).json({ ok: false, error: "Internal server error." });
});

const server = app.listen(port, () => {
  console.log("Tinaab API listening on port " + port);
});

function shutdown(signal) {
  console.log("Tinaab API shutting down: " + signal);
  server.close(async () => {
    if (pool) await pool.end();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
