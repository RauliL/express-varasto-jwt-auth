import { Storage } from "@varasto/storage";
import { Request, Response, Router, json } from "express";

import { AuthenticatedRequest, requireAuth } from "./middleware.js";
import { getUser, login, toPublicUser } from "./storage.js";
import { signAuthToken } from "./jwt.js";

export const authRouter = (storage: Storage): Router => {
  const router = Router();

  router.use(json());

  router.post("/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required." });
      return;
    }

    const user = await login(storage, username, password);

    if (!user) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }

    res.json({
      token: await signAuthToken({ sub: user.username, isAdmin: user.isAdmin }),
      user: toPublicUser(user),
    });
  });

  router.get("/me", requireAuth, async (req: Request, res: Response) => {
    const { username } = (req as AuthenticatedRequest).user;
    const user = await getUser(storage, username);

    if (!user) {
      res.status(401).json({ error: "User no longer exists." });
      return;
    }

    res.json({ user: toPublicUser(user) });
  });

  return router;
};
