export type User = {
  username: string;
  isAdmin: boolean;
  passwordHash: string;
};

export type PublicUser = Pick<User, "username" | "isAdmin">;

export type AuthTokenPayload = {
  sub: string;
  isAdmin: boolean;
};

export class UserValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserValidationError";
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("User not found.");
    this.name = "UserNotFoundError";
  }
}
