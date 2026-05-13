import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// Full health check
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Simple ping for Uptime Robot — responds instantly with minimal overhead
router.get("/ping", (_req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.status(200).end("OK");
});

export default router;
