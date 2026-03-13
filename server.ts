import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("logs.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT,
    path TEXT,
    result TEXT,
    failure_reason TEXT,
    how_to_reproduce TEXT,
    fix_owner TEXT,
    fix_description TEXT,
    severity TEXT,
    notes TEXT,
    raw_payload TEXT,
    is_analyzed INTEGER DEFAULT 0
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(cors());

  // SalesIQ webhook validation ping
  app.head("/api/webhook", (req, res) => {
    res.status(200).end();
  });

  app.get("/api/webhook", (req, res) => {
    res.status(200).send("Webhook endpoint is active. Please use POST for data.");
  });

  // Webhook endpoint
  app.post("/api/webhook", (req, res) => {
    try {
      console.log(`[${new Date().toISOString()}] Incoming Webhook:`, JSON.stringify(req.body, null, 2));
      const payload = JSON.stringify(req.body);
      const id = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      const stmt = db.prepare(`
        INSERT INTO logs (id, timestamp, raw_payload, is_analyzed)
        VALUES (?, ?, ?, 0)
      `);
      stmt.run(id, timestamp, payload);
      
      res.status(200).json({ status: "ok", id });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).json({ error: "Failed to store webhook" });
    }
  });

  // Get all logs
  app.get("/api/logs", (req, res) => {
    try {
      const logs = db.prepare("SELECT * FROM logs ORDER BY timestamp DESC").all();
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  // Save/Update analyzed log
  app.post("/api/logs", (req, res) => {
    try {
      const { 
        id, timestamp, path, result, failure_reason, 
        how_to_reproduce, fix_owner, fix_description, 
        severity, notes, raw_payload 
      } = req.body;

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO logs (
          id, timestamp, path, result, failure_reason, 
          how_to_reproduce, fix_owner, fix_description, 
          severity, notes, raw_payload, is_analyzed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);
      
      stmt.run(
        id, timestamp, path, result, failure_reason, 
        how_to_reproduce, fix_owner, fix_description, 
        severity, notes, raw_payload
      );
      
      res.json({ status: "ok" });
    } catch (err) {
      console.error("Save log error:", err);
      res.status(500).json({ error: "Failed to save log" });
    }
  });

  // Delete log
  app.delete("/api/logs/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM logs WHERE id = ?").run(req.params.id);
      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete log" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();