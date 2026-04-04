import express from "express";
import cors from "cors";
import { RelayStore } from "./store.js";

const PORT = parseInt(process.env.PORT || "3100", 10);
const TTL_MS = parseInt(process.env.TTL_MS || String(24 * 60 * 60 * 1000), 10);

const app = express();
const store = new RelayStore(TTL_MS);

app.use(cors());
app.use(express.json({ limit: "64kb" }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", entries: store.size() });
});

// Store an encrypted payload
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

  const created = store.put(hash, encryptedPayload);
  if (!created) {
    res.status(409).json({ error: "Payload already exists for this hash" });
    return;
  }

  res.status(201).json({ hash, stored: true });
});

// Retrieve an encrypted payload
app.get("/relay/:hash", (req, res) => {
  const { hash } = req.params;

  const encryptedPayload = store.get(hash);
  if (!encryptedPayload) {
    res.status(404).json({ error: "Not found or expired" });
    return;
  }

  res.json({ hash, encryptedPayload });
});

app.listen(PORT, () => {
  console.log(`ENShell Relay listening on port ${PORT}`);
  console.log(`TTL: ${TTL_MS / 1000}s`);
});

export { app, store };
