import express from "express";
import cors from "cors";
import morgan from "morgan";
import { mountRoutes } from "./routes.js";

const PORT = Number(process.env.PORT || 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

const app = express();

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
// 20mb to fit a base64-encoded PDF roadmap upload (Anthropic doc limit ~32mb).
app.use(express.json({ limit: "20mb" }));
app.use(morgan("dev"));

app.use("/api", mountRoutes());

app.get("/", (_req, res) => {
  res.json({
    name: "life-os-api",
    health: "/api/health",
    bootstrap: "/api/bootstrap",
    resources: "/api/resources",
  });
});

app.listen(PORT, () => {
  console.log(`▲ life-os api → http://localhost:${PORT}`);
});
