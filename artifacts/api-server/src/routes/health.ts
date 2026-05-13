import { Router, type IRouter } from "express";
import { ensureConnected } from "../bot/start.js";

const router: IRouter = Router();

// Full health check
router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Uptime Robot pings this — also triggers Discord reconnect if needed
router.get("/ping", (_req, res) => {
  // Fire-and-forget reconnect check on every ping (handles Render wake-up)
  ensureConnected().catch(() => {});
  res.setHeader("Content-Type", "text/plain");
  res.status(200).end("OK");
});

export default router;
