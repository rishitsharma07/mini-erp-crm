import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const roles = ["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"] as const;

  for (const role of roles) {
    const email = `${role.toLowerCase()}@erp.test`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `${role.charAt(0)}${role.slice(1).toLowerCase()} User`,
        email,
        passwordHash: password,
        role,
      },
    });
    console.log(`Seeded user: ${email} / password123`);
  }

  // A couple of sample products so the challan flow can be demoed immediately.
  await prisma.product.upsert({
    where: { sku: "SKU-001" },
    update: {},
    create: {
      name: "Steel Pipe 2-inch",
      sku: "SKU-001",
      category: "Hardware",
      unitPrice: 450.0,
      currentStock: 100,
      minStockAlert: 10,
      location: "Warehouse A",
    },
  });

  await prisma.product.upsert({
    where: { sku: "SKU-002" },
    update: {},
    create: {
      name: "PVC Fitting 1-inch",
      sku: "SKU-002",
      category: "Hardware",
      unitPrice: 75.0,
      currentStock: 5,
      minStockAlert: 10,
      location: "Warehouse A",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
