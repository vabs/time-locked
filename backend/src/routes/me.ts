import { getAuth } from "@clerk/express";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", (req, res) => {
  const auth = getAuth(req);
  res.json({
    userId: auth.userId,
    sessionId: auth.sessionId ?? null,
  });
});

export default router;
