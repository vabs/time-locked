import { Router } from "express";
import { getCliAuthConfigFromEnv } from "../services/authConfig.js";

const router = Router();

router.get("/config", (_req, res) => {
  try {
    res.json(getCliAuthConfigFromEnv());
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "CLI auth is not configured",
    });
  }
});

export default router;
