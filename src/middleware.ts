import { NextFunction, Request, Response } from "express";

import { verifyAuthToken } from "./jwt.js";

export type AuthenticatedRequest = Request & {
  user: {
    username: string;
    isAdmin: boolean;
  };
};

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = await verifyAuthToken(token);

    (req as AuthenticatedRequest).user = {
      username: payload.sub,
      isAdmin: payload.isAdmin,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const user = (req as AuthenticatedRequest).user;

  if (!user?.isAdmin) {
    res.status(403).json({ error: "Administrator access required." });
    return;
  }

  next();
};
