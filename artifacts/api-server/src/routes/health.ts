import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Full health check
router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Simple ping for Uptime Robot
router.get("/ping", (_req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.status(200).end("OK");
});

export default router;
