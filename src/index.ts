import express from "express";
import cors from "cors";
import { TTLStore } from "./store.js";
import { StatsTracker } from "./stats.js";
import { AgentTracker } from "./agents.js";

const PORT = parseInt(process.env.PORT || "3100", 10);
const TTL_MS = parseInt(process.env.TTL_MS || String(24 * 60 * 60 * 1000), 10);

export interface AnalysisResult {
  agentId: string;
  actionId: number;
  score: number;
  decision: number;
  reasoning: string;
  instruction: string;
  target: string;
  value: string;
}

const app = express();
const relayStore = new TTLStore<string>(TTL_MS);
const analysisStore = new TTLStore<AnalysisResult>(TTL_MS);
const stats = new StatsTracker();
const agentTracker = new AgentTracker();

app.use(cors());
app.use(express.json({ limit: "64kb" }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", relayEntries: relayStore.size(), analysisEntries: analysisStore.size() });
});

// Stats
app.get("/stats", (_req, res) => {
  res.json(stats.getStats());
});

// ── Encrypted Payloads ──────────────────────────────────────

app.put("/relay/:hash", (req, res) => {
  const { hash } = req.params;
  const { encryptedPayload } = req.body;

  if (!hash || !hash.startsWith("0x") || hash.length !== 66) {
    res.status(400).json({ error: "Invalid hash (expected bytes32 hex)" });
    return;
  }

  if (!encryptedPayload || typeof encryptedPayload !== "string") {
    res.status(400).json({ error: "Missing encryptedPayload" });
    return;
  }

  const created = relayStore.put(hash, encryptedPayload);
  if (!created) {
    res.status(409).json({ error: "Payload already exists for this hash" });
    return;
  }

  res.status(201).json({ hash, stored: true });
});

app.get("/relay/:hash", (req, res) => {
  const { hash } = req.params;

  const encryptedPayload = relayStore.get(hash);
  if (!encryptedPayload) {
    res.status(404).json({ error: "Not found or expired" });
    return;
  }

  res.json({ hash, encryptedPayload });
});

// ── Analysis Results ────────────────────────────────────────

app.post("/analysis/:actionId", (req, res) => {
  const { actionId } = req.params;
  const body = req.body as AnalysisResult;

  if (!body.reasoning || body.score === undefined || body.decision === undefined) {
    res.status(400).json({ error: "Missing required fields (reasoning, score, decision)" });
    return;
  }

  const created = analysisStore.put(actionId, body);
  if (!created) {
    res.status(409).json({ error: "Analysis already exists for this action" });
    return;
  }

  stats.recordAnalysis(body.agentId, body.decision);
  agentTracker.updateFromAnalysis(body.agentId, body.score, body.decision, body.instruction || "");
  res.status(201).json({ actionId, stored: true });
});

app.get("/analysis/:actionId", (req, res) => {
  const { actionId } = req.params;

  const analysis = analysisStore.get(actionId);
  if (!analysis) {
    res.status(404).json({ error: "Not found or expired" });
    return;
  }

  res.json(analysis);
});

// ── Agent Registry ──────────────────────────────────────────

app.post("/agents/:agentId", (req, res) => {
  const { agentId } = req.params;
  const body = req.body;

  agentTracker.register(agentId, body);
  res.status(201).json({ agentId, registered: true });
});

app.patch("/agents/:agentId", (req, res) => {
  const { agentId } = req.params;
  const updated = agentTracker.update(agentId, req.body);
  if (!updated) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  res.json({ agentId, updated: true });
});

app.get("/agents", (_req, res) => {
  res.json(agentTracker.getAll());
});

app.listen(PORT, () => {
  console.log(`ENShell Relay listening on port ${PORT}`);
  console.log(`TTL: ${TTL_MS / 1000}s`);
});

export { app, relayStore, analysisStore };
