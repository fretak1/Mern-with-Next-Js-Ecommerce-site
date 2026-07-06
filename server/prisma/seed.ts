import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// Use WebSocket so Prisma connects over port 443 (bypasses firewall blocks on port 5432)
neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || "admin@gmail.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "1234";
  const name = process.env.SUPER_ADMIN_NAME || "Super Admin";

  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
  });

  if (existingSuperAdmin) {
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const superAdminUser = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: "SUPER_ADMIN",
    },
  });

  console.log("super admin created successfully ", superAdminUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
