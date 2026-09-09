import { Router } from "express";
import { login, me, loginSchema } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate.middleware";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/login", validateBody(loginSchema), login);
router.get("/me", authenticate, me);

export default router;
