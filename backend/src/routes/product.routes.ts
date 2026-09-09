import { Router } from "express";
import {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  recordStockMovement,
  productSchema,
  stockMovementSchema,
} from "../controllers/product.controller";
import { validateBody } from "../middleware/validate.middleware";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", listProducts);
router.get("/:id", getProduct);
router.post("/", authorize("ADMIN", "WAREHOUSE"), validateBody(productSchema), createProduct);
router.put("/:id", authorize("ADMIN", "WAREHOUSE"), validateBody(productSchema.partial()), updateProduct);
router.post(
  "/:id/stock-movements",
  authorize("ADMIN", "WAREHOUSE"),
  validateBody(stockMovementSchema),
  recordStockMovement
);

export default router;
