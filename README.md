# express-varasto-jwt-auth [![github-url][github-image]][github-url] [![coveralls][coveralls-image]][coveralls-url] [![npm][npm-image]][npm-url]

[github-image]: https://github.com/RauliL/express-varasto-jwt-auth/actions/workflows/build.yml/badge.svg
[github-url]: https://github.com/RauliL/express-varasto-jwt-auth/actions/workflows/build.yml
[coveralls-image]: https://coveralls.io/repos/github/RauliL/express-varasto-jwt-auth/badge.svg
[coveralls-url]: https://coveralls.io/github/RauliL/express-varasto-jwt-auth
[npm-image]: https://img.shields.io/npm/v/express-varasto-jwt-auth.svg
[npm-url]: https://npmjs.org/package/express-varasto-jwt-auth

JWT authentication for [Express.js](https://expressjs.com/) that stores users
in [Varasto](https://github.com/RauliL/varasto) storage.

## Requirements

- Node.js 22+
- Peer dependencies: `express` ^5 and `@varasto/storage` ^6

## Install

```bash
yarn add express-varasto-jwt-auth
```

## Usage

```ts
import express, { Request, Response } from "express";
import { createMemoryStorage } from "@varasto/memory-storage";
import {
  addUser,
  authRouter,
  AuthenticatedRequest,
  requireAuth,
  requireAdmin,
} from "express-varasto-jwt-auth";

const storage = createMemoryStorage();
const app = express();

// Mount login and /me routes
app.use("/auth", authRouter(storage));

// Protect routes with middleware
app.get("/private", requireAuth, (req: Request, res: Response) => {
  res.json({ user: (req as AuthenticatedRequest).user });
});

app.get("/admin", requireAuth, requireAdmin, (_req, res) => {
  res.json({ ok: true });
});

// Create a user
await addUser(storage, "admin", "password123", true);

app.listen(3000);
```

### Auth routes

| Method | Path     | Description                                     |
| ------ | -------- | ----------------------------------------------- |
| `POST` | `/login` | Authenticate with `username` and `password`     |
| `GET`  | `/me`    | Return the current user (requires Bearer token) |

Successful login response:

```json
{
  "token": "<jwt>",
  "user": { "username": "admin", "isAdmin": true }
}
```

Send the token as `Authorization: Bearer <jwt>` on protected requests.

### User helpers

| Function       | Description                                  |
| -------------- | -------------------------------------------- |
| `addUser`      | Create a user (password hashed with bcrypt)  |
| `getUser`      | Fetch a user by username                     |
| `listUsers`    | List all users (public fields only)          |
| `deleteUser`   | Delete a user (cannot remove the last admin) |
| `hasUsers`     | Check whether any users exist                |
| `login`        | Verify credentials and return the user       |
| `toPublicUser` | Strip `passwordHash` from a user object      |

Usernames must be valid slugs (lowercase letters, numbers, hyphens). Passwords
must be at least 8 characters.

## Environment

| Variable         | Default                                 | Description      |
| ---------------- | --------------------------------------- | ---------------- |
| `JWT_SECRET`     | `teese-dev-secret-change-in-production` | HMAC signing key |
| `JWT_EXPIRES_IN` | `30d`                                   | Token lifetime   |

Set a strong `JWT_SECRET` in production.
