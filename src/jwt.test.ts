import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { signAuthToken, verifyAuthToken } from "./jwt";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "teese-dev-secret-change-in-production",
);

describe("jwt functions", () => {
  describe("signAuthToken", () => {
    it("returns a JWT string", async () => {
      const token = await signAuthToken({ sub: "alice", isAdmin: false });

      expect(token).toEqual(expect.any(String));
      expect(token.split(".")).toHaveLength(3);
    });

    it("embeds the subject and isAdmin claim", async () => {
      const token = await signAuthToken({ sub: "admin", isAdmin: true });
      const payload = await verifyAuthToken(token);

      expect(payload).toEqual({
        sub: "admin",
        isAdmin: true,
      });
    });
  });

  describe("verifyAuthToken", () => {
    it("returns the payload for a valid token", async () => {
      const token = await signAuthToken({ sub: "bob", isAdmin: false });

      await expect(verifyAuthToken(token)).resolves.toEqual({
        sub: "bob",
        isAdmin: false,
      });
    });

    it("treats non-true isAdmin values as false", async () => {
      const token = await new SignJWT({ isAdmin: "true" })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject("alice")
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(JWT_SECRET);

      await expect(verifyAuthToken(token)).resolves.toEqual({
        sub: "alice",
        isAdmin: false,
      });
    });

    it("rejects an invalid token", async () => {
      await expect(verifyAuthToken("not-a-valid-token")).rejects.toThrow();
    });

    it("rejects a token signed with a different secret", async () => {
      const token = await new SignJWT({ isAdmin: true })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject("alice")
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(new TextEncoder().encode("different-secret"));

      await expect(verifyAuthToken(token)).rejects.toThrow();
    });

    it("rejects a token without a string subject", async () => {
      const token = await new SignJWT({ isAdmin: false })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(JWT_SECRET);

      await expect(verifyAuthToken(token)).rejects.toThrow(
        "Invalid token subject.",
      );
    });
  });
});
