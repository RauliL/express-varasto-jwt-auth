import { createMemoryStorage } from "@varasto/memory-storage";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { authRouter } from "./router";
import { USERS_NAMESPACE, addUser } from "./storage";

describe("authentication router", () => {
  const storage = createMemoryStorage();
  const app = express();

  app.use("/", authRouter(storage));

  beforeEach(async () => {
    storage.clear();
    await addUser(storage, "admin", "password123", true);
  });

  describe("/login", () => {
    it("returns a token and user for valid credentials", async () => {
      const response = await request(app)
        .post("/login")
        .send({ username: "admin", password: "password123" });

      expect(response.status).toBe(200);
      expect(response.body.token).toEqual(expect.any(String));
      expect(response.body.user).toEqual({
        username: "admin",
        isAdmin: true,
      });
    });

    it("returns 400 when username or password is missing", async () => {
      const response = await request(app)
        .post("/login")
        .send({ username: "admin" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Username and password are required.");
    });

    it("returns 401 for invalid credentials", async () => {
      const response = await request(app)
        .post("/login")
        .send({ username: "admin", password: "wrong-password" });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid username or password.");
    });
  });

  describe("/me", () => {
    it("returns the current user when authenticated", async () => {
      const loginResponse = await request(app)
        .post("/login")
        .send({ username: "admin", password: "password123" });
      const response = await request(app)
        .get("/me")
        .set("Authorization", `Bearer ${loginResponse.body.token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        username: "admin",
        isAdmin: true,
      });
    });

    it("returns 401 without a token", async () => {
      const response = await request(app).get("/me");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Authentication required.");
    });

    it("returns 401 for an invalid token", async () => {
      const response = await request(app)
        .get("/me")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid or expired token.");
    });

    it("returns 401 for user account that no longer exists", async () => {
      const loginResponse = await request(app)
        .post("/login")
        .send({ username: "admin", password: "password123" });

      await storage.delete(USERS_NAMESPACE, "admin");

      const response = await request(app)
        .get("/me")
        .set("Authorization", `Bearer ${loginResponse.body.token}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("User no longer exists.");
    });
  });
});
