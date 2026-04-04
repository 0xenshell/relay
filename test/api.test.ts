import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app, relayStore, analysisStore } from "../src/index.js";

describe("Relay API", () => {
  const validHash = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

  afterEach(() => {
    relayStore.destroy();
    analysisStore.destroy();
  });

  describe("GET /health", () => {
    it("returns status ok", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });

  describe("PUT /relay/:hash", () => {
    it("stores an encrypted payload", async () => {
      const res = await request(app)
        .put(`/relay/${validHash}`)
        .send({ encryptedPayload: "encrypted_data_here" });

      expect(res.status).toBe(201);
      expect(res.body.stored).toBe(true);
    });

    it("rejects invalid hash format", async () => {
      const res = await request(app)
        .put("/relay/not-a-hash")
        .send({ encryptedPayload: "data" });

      expect(res.status).toBe(400);
    });

    it("rejects missing payload", async () => {
      const res = await request(app)
        .put(`/relay/${validHash}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it("rejects duplicate hash", async () => {
      await request(app)
        .put(`/relay/${validHash}`)
        .send({ encryptedPayload: "first" });

      const res = await request(app)
        .put(`/relay/${validHash}`)
        .send({ encryptedPayload: "second" });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /relay/:hash", () => {
    it("retrieves a stored payload", async () => {
      await request(app)
        .put(`/relay/${validHash}`)
        .send({ encryptedPayload: "encrypted_data_here" });

      const res = await request(app).get(`/relay/${validHash}`);

      expect(res.status).toBe(200);
      expect(res.body.encryptedPayload).toBe("encrypted_data_here");
    });

    it("returns 404 for non-existent hash", async () => {
      const res = await request(app).get(`/relay/${validHash}`);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /analysis/:actionId", () => {
    const analysis = {
      agentId: "trader",
      actionId: 0,
      score: 75000,
      decision: 3,
      reasoning: "ADDRESS PATTERN: Critical fail - burn address detected.",
      instruction: "Send 0.05 ETH to treasury",
      target: "0x1111111111111111111111111111111111111111",
      value: "50000000000000000",
    };

    it("stores an analysis result", async () => {
      const res = await request(app).post("/analysis/0").send(analysis);
      expect(res.status).toBe(201);
      expect(res.body.stored).toBe(true);
    });

    it("rejects missing fields", async () => {
      const res = await request(app).post("/analysis/0").send({ agentId: "trader" });
      expect(res.status).toBe(400);
    });

    it("rejects duplicate actionId", async () => {
      await request(app).post("/analysis/1").send(analysis);
      const res = await request(app).post("/analysis/1").send(analysis);
      expect(res.status).toBe(409);
    });
  });

  describe("GET /analysis/:actionId", () => {
    it("retrieves a stored analysis", async () => {
      await request(app).post("/analysis/2").send({
        agentId: "trader",
        actionId: 2,
        score: 12000,
        decision: 1,
        reasoning: "All checks passed.",
        instruction: "Stake 0.1 ETH",
        target: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
        value: "100000000000000000",
      });

      const res = await request(app).get("/analysis/2");
      expect(res.status).toBe(200);
      expect(res.body.agentId).toBe("trader");
      expect(res.body.reasoning).toBe("All checks passed.");
    });

    it("returns 404 for non-existent analysis", async () => {
      const res = await request(app).get("/analysis/999");
      expect(res.status).toBe(404);
    });
  });
});
