import "dotenv/config";
import express from "express";
import { clerkAuth } from "./middleware/auth.js";
import authRouter from "./routes/auth.js";
import decisionsRouter from "./routes/decisions.js";
import meRouter from "./routes/me.js";
import notesRouter from "./routes/notes.js";
import tagsRouter from "./routes/tags.js";
import pushRouter from "./routes/push.js";
import { startScheduler } from "./services/scheduler.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT ?? 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(clerkAuth);

app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/decisions", decisionsRouter);
app.use("/api/decisions/:decisionId/notes", notesRouter);
app.use("/api/tags", tagsRouter);
app.use("/api/push", pushRouter);

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const frontendDist = path.join(__dirname, "../../frontend/dist");
  app.use(express.static(frontendDist));
  app.get("*path", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

startScheduler();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
