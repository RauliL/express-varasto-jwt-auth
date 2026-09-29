import { Entry, Storage } from "@varasto/storage";
import bcrypt from "bcryptjs";
import { isValidSlug } from "is-valid-slug";

import {
  PublicUser,
  User,
  UserNotFoundError,
  UserValidationError,
} from "./types.js";

export const USERS_NAMESPACE = "users";
const BCRYPT_ROUNDS = 12;

export const toPublicUser = (user: User): PublicUser => ({
  username: user.username,
  isAdmin: user.isAdmin,
});

/**
 * Tests whether given username is valid or not. Any valid slug is considered
 * to be an valid username.
 */
export const isValidUsername = isValidSlug;

/**
 * Attempts to retrieve user based on it's username from given storage
 * instance.
 */
export const getUser = (
  storage: Storage,
  username: string,
): Promise<User | undefined> => storage.get<User>(USERS_NAMESPACE, username);

/**
 * Attempts to create new user account with given credentials.
 */
export const addUser = async (
  storage: Storage,
  username: string,
  password: string,
  isAdmin: boolean = false,
): Promise<PublicUser> => {
  if (!isValidUsername(username)) {
    throw new UserValidationError(
      "Username must be a valid slug (lowercase letters, numbers, and hyphens).",
    );
  } else if (password.length < 8) {
    throw new UserValidationError("Password must be at least 8 characters.");
  } else if (await storage.has(USERS_NAMESPACE, username)) {
    throw new UserValidationError("Username is already taken.");
  }

  await storage.set<User>(USERS_NAMESPACE, username, {
    isAdmin,
    username,
    passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
  });

  return { isAdmin, username };
};

/**
 * Tests whether any user account exists in the given storage.
 */
export const hasUsers = async (storage: Storage): Promise<boolean> => {
  for await (const _entry of storage.entries(USERS_NAMESPACE)) {
    return true;
  }

  return false;
};

/**
 * Lists all user accounts from given storage.
 */
export const listUsers = async (storage: Storage): Promise<PublicUser[]> => {
  const users: PublicUser[] = [];

  for await (const [, value] of storage.entries<User>(USERS_NAMESPACE)) {
    users.push(toPublicUser(value));
  }

  return users.sort((a, b) => a.username.localeCompare(b.username));
};

const countAdminUsers = (storage: Storage): Promise<number> =>
  Array.fromAsync(
    storage.filter<User>(USERS_NAMESPACE, (user) => user.isAdmin),
  ).then((result: Entry<User>[]) => result.length);

/**
 * Attempts to delete an user account from given storage.
 */
export const deleteUser = async (
  storage: Storage,
  username: string,
): Promise<void> => {
  const user = await getUser(storage, username);

  if (!user) {
    throw new UserNotFoundError();
  } else if (user.isAdmin && (await countAdminUsers(storage)) <= 1) {
    throw new UserValidationError("Cannot delete the last administrator.");
  }

  await storage.delete(USERS_NAMESPACE, username);
};

/**
 * Performs authentication. Returns user instance if the authentication was
 * successful.
 */
export const login = async (
  storage: Storage,
  username: string,
  password: string,
): Promise<User | undefined> => {
  const user = await getUser(storage, username);

  if (user && (await bcrypt.compare(password, user.passwordHash))) {
    return user;
  }
};
