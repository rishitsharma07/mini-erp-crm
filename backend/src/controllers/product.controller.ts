import { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

type TxClient = Prisma.TransactionClient;

export const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().optional(),
  unitPrice: z.coerce.number().positive(),
  currentStock: z.coerce.number().int().min(0).optional(),
  minStockAlert: z.coerce.number().int().min(0).optional(),
  location: z.string().optional(),
});

export const stockMovementSchema = z.object({
  quantity: z.coerce.number().int().positive(),
  movementType: z.enum(["IN", "OUT"]),
  reason: z.string().min(1),
});

// POST /products
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.product.findUnique({ where: { sku: req.body.sku } });
  if (existing) throw new ApiError(409, `SKU '${req.body.sku}' already exists`);

  const product = await prisma.product.create({ data: req.body });
  res.status(201).json(product);
});

// GET /products?search=&category=&page=&pageSize=&lowStock=true
export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
  const search = (req.query.search as string) || "";
  const category = req.query.category as string | undefined;

  const where = {
    AND: [
      search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { sku: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {},
      category ? { category } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
    prisma.product.count({ where }),
  ]);

  const lowStockOnly = req.query.lowStock === "true";
  const filtered = lowStockOnly
    ? items.filter((p: (typeof items)[number]) => p.currentStock <= p.minStockAlert)
    : items;

  res.status(200).json({ items: filtered, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

// GET /products/:id
export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { stockMovements: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
  if (!product) throw new ApiError(404, "Product not found");
  res.status(200).json(product);
});

// PUT /products/:id
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Product not found");

  // currentStock is intentionally NOT editable here - it must only change
  // via the stock-movement endpoint so every change is logged.
  const { currentStock, ...rest } = req.body;
  const product = await prisma.product.update({ where: { id: req.params.id }, data: rest });
  res.status(200).json(product);
});

// POST /products/:id/stock-movements
// Records an IN/OUT movement and atomically updates currentStock.
export const recordStockMovement = asyncHandler(async (req: Request, res: Response) => {
  const { quantity, movementType, reason } = req.body;

  const result = await prisma.$transaction(async (tx: TxClient) => {
    const product = await tx.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw new ApiError(404, "Product not found");

    const delta = movementType === "IN" ? quantity : -quantity;
    const newStock = product.currentStock + delta;

    if (newStock < 0) {
      throw new ApiError(400, `Insufficient stock: current stock is ${product.currentStock}, cannot remove ${quantity}`);
    }

    const updatedProduct = await tx.product.update({
      where: { id: req.params.id },
      data: { currentStock: newStock },
    });

    const movement = await tx.stockMovement.create({
      data: {
        productId: req.params.id,
        quantity,
        movementType,
        reason,
        createdById: req.user!.id,
      },
    });

    return { product: updatedProduct, movement };
  });

  res.status(201).json(result);
});
