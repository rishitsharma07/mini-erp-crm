import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

// Validates req.body against a Zod schema. On failure, responds 400 with
// field-level error messages instead of letting bad data reach the DB layer.
export function validateBody(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: err.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
        });
      }
      next(err);
    }
  };
}
