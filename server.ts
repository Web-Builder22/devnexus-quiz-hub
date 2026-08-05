import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { authRouter } from "./src/api/auth.ts";
import { quizzesRouter } from "./src/api/quizzes.ts";
import { studentRouter } from "./src/api/student.ts";
import { analyticsRouter } from "./src/api/analytics.ts";
import { certificatesRouter } from "./src/api/certificates.ts";
import { requireAdmin } from "./src/middleware/auth.ts";
import { setupSocketIO } from "./src/socket.ts";
import { initDbSchema } from "./src/db/index.ts";

async function startServer() {
  await initDbSchema();
  const app = express();
  const server = createServer(app);
  const PORT = 3000;

  setupSocketIO(server);

  app.use(express.json({ limit: '10mb' }));

  // Add API routes here later
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/quizzes", requireAdmin, quizzesRouter);
  app.use("/api/v1/student", studentRouter);
  app.use("/api/v1/analytics", requireAdmin, analyticsRouter);
  app.use("/api/v1/certificates", certificatesRouter);

  app.use("/api", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  // Global API error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For Express 4.x
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
