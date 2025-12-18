require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = "claudiohs@hotmail.com";
  const password = "baiano00";
  const username = "claudiohs";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Usuário ${email} já existe (ID: ${existing.id}).`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name: username,
      passwordHash,
      role: "SUPERADMIN",
    },
  });

  console.log("Super admin criado:", {
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

main()
  .catch((error) => {
    console.error("Erro:", error);
  })
  .finally(() => prisma.$disconnect());
