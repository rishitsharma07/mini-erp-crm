import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyToken } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";

// Verifies the Authorization: Bearer <token> header and attaches req.user.
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new ApiError(401, "Missing or malformed Authorization header"));
  }

  const token = header.split(" ")[1];
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
}

// Restricts a route to one or more roles. Use after `authenticate`.
// Example: router.post("/products", authenticate, authorize("ADMIN", "WAREHOUSE"), createProduct)
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, "Not authenticated"));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, `Role '${req.user.role}' is not permitted to perform this action`));
    }
    next();
  };
}
