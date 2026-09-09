import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

export const customerSchema = z.object({
  name: z.string().min(1),
  mobile: z.string().min(6),
  email: z.string().email().optional(),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  customerType: z.enum(["RETAIL", "WHOLESALE", "DISTRIBUTOR"]),
  address: z.string().optional(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  followUpDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const followUpSchema = z.object({
  note: z.string().min(1),
});

// POST /customers
export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await prisma.customer.create({ data: req.body });
  res.status(201).json(customer);
});

// GET /customers?search=&status=&page=&pageSize=
export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
  const search = (req.query.search as string) || "";
  const status = req.query.status as string | undefined;

  const where = {
    AND: [
      search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { mobile: { contains: search } },
              { businessName: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {},
      status ? { status: status as "LEAD" | "ACTIVE" | "INACTIVE" } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.count({ where }),
  ]);

  res.status(200).json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

// GET /customers/:id
export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: { followUps: { orderBy: { createdAt: "desc" } }, challans: true },
  });
  if (!customer) throw new ApiError(404, "Customer not found");
  res.status(200).json(customer);
});

// PUT /customers/:id
export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Customer not found");

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.status(200).json(customer);
});

// POST /customers/:id/follow-ups
export const addFollowUp = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Customer not found");

  const followUp = await prisma.followUp.create({
    data: {
      customerId: req.params.id,
      note: req.body.note,
      createdById: req.user!.id,
    },
  });
  res.status(201).json(followUp);
});
