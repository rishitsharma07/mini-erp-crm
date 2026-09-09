import { Router } from "express";
import {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  addFollowUp,
  customerSchema,
  followUpSchema,
} from "../controllers/customer.controller";
import { validateBody } from "../middleware/validate.middleware";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

// All customer routes require login. Sales + Admin can create/edit;
// everyone authenticated can view (warehouse/accounts may need to look up a customer).
router.use(authenticate);

router.get("/", listCustomers);
router.get("/:id", getCustomer);
router.post("/", authorize("ADMIN", "SALES"), validateBody(customerSchema), createCustomer);
router.put("/:id", authorize("ADMIN", "SALES"), validateBody(customerSchema.partial()), updateCustomer);
router.post("/:id/follow-ups", authorize("ADMIN", "SALES"), validateBody(followUpSchema), addFollowUp);

export default router;
