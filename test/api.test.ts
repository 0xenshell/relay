import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app, store } from "../src/index.js";

describe("Relay API", () => {
  const validHash = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

  afterEach(() => {
    store.destroy();
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
});
