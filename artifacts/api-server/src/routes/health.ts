import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Uptime Robot ping endpoint
router.get("/ping", (_req, res) => {
  res.status(200).send("OK");
});

export default router;
