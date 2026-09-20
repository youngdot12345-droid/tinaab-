import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes.js";

const app = express();
const port = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use("/api/", rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false
}));

registerRoutes(app);

app.listen(port, () => console.log("Tinaab API listening on port " + port));
