import { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

type TxClient = Prisma.TransactionClient;

const challanItemInput = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
});

export const createChallanSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(challanItemInput).min(1, "At least one product line is required"),
});

async function generateChallanNumber(tx: TxClient): Promise<string> {
  const year = new Date().getFullYear();
  const countThisYear = await tx.challan.count({
    where: { challanNumber: { startsWith: `CH-${year}-` } },
  });
  const next = String(countThisYear + 1).padStart(4, "0");
  return `CH-${year}-${next}`;
}

// POST /challans
// Always creates as DRAFT. Stock is NOT touched at this stage.
export const createChallan = asyncHandler(async (req: Request, res: Response) => {
  const { customerId, items } = req.body;

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new ApiError(404, "Customer not found");

  const productIds = items.map((i: { productId: string }) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  if (products.length !== productIds.length) {
    throw new ApiError(400, "One or more products in the challan do not exist");
  }

  const productMap = new Map(products.map((p: (typeof products)[number]) => [p.id, p]));
  const totalQuantity = items.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);

  const challan = await prisma.$transaction(async (tx: TxClient) => {
    const challanNumber = await generateChallanNumber(tx);

    return tx.challan.create({
      data: {
        challanNumber,
        customerId,
        totalQuantity,
        status: "DRAFT",
        createdById: req.user!.id,
        items: {
          create: items.map((i: { productId: string; quantity: number }) => {
            const p = productMap.get(i.productId)!;
            return {
              productId: p.id,
              productNameSnapshot: p.name,
              skuSnapshot: p.sku,
              unitPriceSnapshot: p.unitPrice,
              quantity: i.quantity,
            };
          }),
        },
      },
      include: { items: true, customer: true },
    });
  });

  res.status(201).json(challan);
});

// GET /challans?status=&page=&pageSize=
export const listChallans = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
  const status = req.query.status as string | undefined;

  const where = status ? { status: status as "DRAFT" | "CONFIRMED" | "CANCELLED" } : {};

  const [items, total] = await Promise.all([
    prisma.challan.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { customer: true, items: true },
    }),
    prisma.challan.count({ where }),
  ]);

  res.status(200).json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

// GET /challans/:id
export const getChallan = asyncHandler(async (req: Request, res: Response) => {
  const challan = await prisma.challan.findUnique({
    where: { id: req.params.id },
    include: { items: true, customer: true },
  });
  if (!challan) throw new ApiError(404, "Challan not found");
  res.status(200).json(challan);
});

// POST /challans/:id/confirm
// This is where the core business rule lives: on confirmation, stock is
// deducted for every line item, inside one transaction, and stock must
// never go negative. If any item has insufficient stock, the ENTIRE
// confirmation fails and nothing is deducted.
export const confirmChallan = asyncHandler(async (req: Request, res: Response) => {
  const result = await prisma.$transaction(async (tx: TxClient) => {
    const challan = await tx.challan.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!challan) throw new ApiError(404, "Challan not found");
    if (challan.status !== "DRAFT") {
      throw new ApiError(400, `Only DRAFT challans can be confirmed (current status: ${challan.status})`);
    }

    for (const item of challan.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new ApiError(404, `Product ${item.skuSnapshot} no longer exists`);

      const newStock = product.currentStock - item.quantity;
      if (newStock < 0) {
        throw new ApiError(
          400,
          `Insufficient stock for '${product.name}' (SKU ${product.sku}): available ${product.currentStock}, required ${item.quantity}`
        );
      }

      await tx.product.update({ where: { id: product.id }, data: { currentStock: newStock } });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          quantity: item.quantity,
          movementType: "OUT",
          reason: `Sales challan ${challan.challanNumber} confirmed`,
          createdById: req.user!.id,
        },
      });
    }

    return tx.challan.update({
      where: { id: req.params.id },
      data: { status: "CONFIRMED" },
      include: { items: true, customer: true },
    });
  });

  res.status(200).json(result);
});

// POST /challans/:id/cancel
export const cancelChallan = asyncHandler(async (req: Request, res: Response) => {
  const challan = await prisma.challan.findUnique({ where: { id: req.params.id } });
  if (!challan) throw new ApiError(404, "Challan not found");
  if (challan.status === "CONFIRMED") {
    throw new ApiError(400, "Confirmed challans cannot be cancelled directly - use a stock return instead");
  }

  const updated = await prisma.challan.update({
    where: { id: req.params.id },
    data: { status: "CANCELLED" },
  });
  res.status(200).json(updated);
});
