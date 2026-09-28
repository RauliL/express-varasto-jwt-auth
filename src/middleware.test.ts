import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { signAuthToken } from "./jwt";
import { AuthenticatedRequest, requireAdmin, requireAuth } from "./middleware";

describe("middleware functions", () => {
  describe("requireAuth", () => {
    const app = express();

    app.get("/protected", requireAuth, (req, res) => {
      res.json({ user: (req as AuthenticatedRequest).user });
    });

    it("attaches the user for a valid Bearer token", async () => {
      const token = await signAuthToken({ sub: "alice", isAdmin: false });
      const response = await request(app)
        .get("/protected")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        username: "alice",
        isAdmin: false,
      });
    });

    it("returns 401 when the Authorization header is missing", async () => {
      const response = await request(app).get("/protected");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Authentication required.");
    });

    it("returns 401 when the Authorization scheme is not Bearer", async () => {
      const response = await request(app)
        .get("/protected")
        .set("Authorization", "Basic credentials");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Authentication required.");
    });

    it("returns 401 for an invalid token", async () => {
      const response = await request(app)
        .get("/protected")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid or expired token.");
    });
  });

  describe("requireAdmin", () => {
    const app = express();

    app.get(
      "/admin",
      (req, _res, next) => {
        const isAdmin = req.query.isAdmin === "true";
        const hasUser = req.query.hasUser !== "false";

        if (hasUser) {
          (req as AuthenticatedRequest).user = {
            username: "tester",
            isAdmin,
          };
        }

        next();
      },
      requireAdmin,
      (_req, res) => {
        res.json({ ok: true });
      },
    );

    it("allows an administrator through", async () => {
      const response = await request(app).get("/admin?isAdmin=true");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });

    it("returns 403 for a non-admin user", async () => {
      const response = await request(app).get("/admin?isAdmin=false");

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Administrator access required.");
    });

    it("returns 403 when no user is attached", async () => {
      const response = await request(app).get("/admin?hasUser=false");

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Administrator access required.");
    });
  });

  describe("requireAuth and requireAdmin together", () => {
    const app = express();

    app.get("/admin", requireAuth, requireAdmin, (req, res) => {
      res.json({ user: (req as AuthenticatedRequest).user });
    });

    it("allows an authenticated administrator", async () => {
      const token = await signAuthToken({ sub: "admin", isAdmin: true });
      const response = await request(app)
        .get("/admin")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        username: "admin",
        isAdmin: true,
      });
    });

    it("returns 403 for an authenticated non-admin", async () => {
      const token = await signAuthToken({ sub: "alice", isAdmin: false });
      const response = await request(app)
        .get("/admin")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Administrator access required.");
    });
  });
});
