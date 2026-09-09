import { Router } from "express";
import {
  createChallan,
  listChallans,
  getChallan,
  confirmChallan,
  cancelChallan,
  createChallanSchema,
} from "../controllers/challan.controller";
import { validateBody } from "../middleware/validate.middleware";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", listChallans);
router.get("/:id", getChallan);
router.post("/", authorize("ADMIN", "SALES"), validateBody(createChallanSchema), createChallan);
router.post("/:id/confirm", authorize("ADMIN", "SALES"), confirmChallan);
router.post("/:id/cancel", authorize("ADMIN", "SALES"), cancelChallan);

export default router;
