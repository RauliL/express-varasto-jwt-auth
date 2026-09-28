import { createMemoryStorage } from "@varasto/memory-storage";
import { beforeEach, describe, expect, it } from "vitest";

import {
  USERS_NAMESPACE,
  addUser,
  deleteUser,
  getUser,
  hasUsers,
  isValidUsername,
  listUsers,
  login,
  toPublicUser,
} from "./storage";
import { UserNotFoundError, UserValidationError } from "./types";

describe("storage functions", () => {
  const storage = createMemoryStorage();

  beforeEach(() => {
    storage.clear();
  });

  describe("toPublicUser", () => {
    it("returns only the public fields", () => {
      expect(
        toPublicUser({
          username: "alice",
          isAdmin: true,
          passwordHash: "secret-hash",
        }),
      ).toEqual({
        username: "alice",
        isAdmin: true,
      });
    });
  });

  describe("isValidUsername", () => {
    it("accepts valid slugs", () => {
      expect(isValidUsername("admin")).toBe(true);
      expect(isValidUsername("user-1")).toBe(true);
      expect(isValidUsername("a")).toBe(true);
    });

    it("rejects invalid usernames", () => {
      expect(isValidUsername("Admin")).toBe(false);
      expect(isValidUsername("user_name")).toBe(false);
      expect(isValidUsername("user name")).toBe(false);
      expect(isValidUsername("")).toBe(false);
    });
  });

  describe("getUser", () => {
    it("returns undefined when the user does not exist", async () => {
      await expect(getUser(storage, "missing")).resolves.toBeUndefined();
    });

    it("returns the stored user", async () => {
      await addUser(storage, "alice", "password123", false);

      const user = await getUser(storage, "alice");

      expect(user).toEqual({
        username: "alice",
        isAdmin: false,
        passwordHash: expect.any(String),
      });
    });
  });

  describe("addUser", () => {
    it("stores a hashed password and defaults isAdmin to false", async () => {
      await addUser(storage, "bob", "password123");

      const user = await storage.get(USERS_NAMESPACE, "bob");

      expect(user).toEqual({
        username: "bob",
        isAdmin: false,
        passwordHash: expect.any(String),
      });
      expect(user?.passwordHash).not.toBe("password123");
    });

    it("can create an administrator", async () => {
      await addUser(storage, "admin", "password123", true);

      await expect(getUser(storage, "admin")).resolves.toMatchObject({
        username: "admin",
        isAdmin: true,
      });
    });

    it("rejects an invalid username", async () => {
      await expect(
        addUser(storage, "Invalid User", "password123"),
      ).rejects.toThrow(UserValidationError);
      await expect(
        addUser(storage, "Invalid User", "password123"),
      ).rejects.toThrow(
        "Username must be a valid slug (lowercase letters, numbers, and hyphens).",
      );
    });

    it("rejects a password shorter than 8 characters", async () => {
      await expect(addUser(storage, "bob", "short")).rejects.toThrow(
        UserValidationError,
      );
      await expect(addUser(storage, "bob", "short")).rejects.toThrow(
        "Password must be at least 8 characters.",
      );
    });

    it("rejects a username that is already taken", async () => {
      await addUser(storage, "bob", "password123");

      await expect(addUser(storage, "bob", "password456")).rejects.toThrow(
        UserValidationError,
      );
      await expect(addUser(storage, "bob", "password456")).rejects.toThrow(
        "Username is already taken.",
      );
    });
  });

  describe("hasUsers", () => {
    it("returns false when storage has no users", async () => {
      await expect(hasUsers(storage)).resolves.toBe(false);
    });

    it("returns true when at least one user exists", async () => {
      await addUser(storage, "alice", "password123");

      await expect(hasUsers(storage)).resolves.toBe(true);
    });
  });

  describe("listUsers", () => {
    it("returns an empty array when there are no users", async () => {
      await expect(listUsers(storage)).resolves.toEqual([]);
    });

    it("returns public users sorted by username", async () => {
      await addUser(storage, "zoe", "password123", false);
      await addUser(storage, "alice", "password123", true);
      await addUser(storage, "bob", "password123", false);

      await expect(listUsers(storage)).resolves.toEqual([
        { username: "alice", isAdmin: true },
        { username: "bob", isAdmin: false },
        { username: "zoe", isAdmin: false },
      ]);
    });

    it("omits password hashes from the result", async () => {
      await addUser(storage, "alice", "password123");

      const users = await listUsers(storage);

      expect(users).toHaveLength(1);
      expect(users[0]).not.toHaveProperty("passwordHash");
    });
  });

  describe("deleteUser", () => {
    it("deletes an existing non-admin user", async () => {
      await addUser(storage, "admin", "password123", true);
      await addUser(storage, "bob", "password123");

      await deleteUser(storage, "bob");

      await expect(getUser(storage, "bob")).resolves.toBeUndefined();
    });

    it("deletes an admin when another admin still exists", async () => {
      await addUser(storage, "admin", "password123", true);
      await addUser(storage, "admin2", "password123", true);

      await deleteUser(storage, "admin");

      await expect(getUser(storage, "admin")).resolves.toBeUndefined();
      await expect(getUser(storage, "admin2")).resolves.toMatchObject({
        isAdmin: true,
      });
    });

    it("throws when the user does not exist", async () => {
      await expect(deleteUser(storage, "missing")).rejects.toThrow(
        UserNotFoundError,
      );
      await expect(deleteUser(storage, "missing")).rejects.toThrow(
        "User not found.",
      );
    });

    it("refuses to delete the last administrator", async () => {
      await addUser(storage, "admin", "password123", true);
      await addUser(storage, "bob", "password123");

      await expect(deleteUser(storage, "admin")).rejects.toThrow(
        UserValidationError,
      );
      await expect(deleteUser(storage, "admin")).rejects.toThrow(
        "Cannot delete the last administrator.",
      );
      await expect(getUser(storage, "admin")).resolves.toMatchObject({
        username: "admin",
        isAdmin: true,
      });
    });
  });

  describe("login", () => {
    beforeEach(async () => {
      await addUser(storage, "alice", "password123", false);
    });

    it("returns the user for valid credentials", async () => {
      await expect(login(storage, "alice", "password123")).resolves.toEqual({
        username: "alice",
        isAdmin: false,
        passwordHash: expect.any(String),
      });
    });

    it("returns undefined for an unknown username", async () => {
      await expect(
        login(storage, "missing", "password123"),
      ).resolves.toBeUndefined();
    });

    it("returns undefined for an incorrect password", async () => {
      await expect(
        login(storage, "alice", "wrong-password"),
      ).resolves.toBeUndefined();
    });
  });
});
