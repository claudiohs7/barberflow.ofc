const { execSync } = require("child_process");

function run(command, label) {
  console.log(`> ${command}`);
  execSync(command, { stdio: "inherit" });
  if (label) console.log(`${label} concluido.`);
}

function main() {
  if (process.env.SKIP_PRISMA_SETUP === "true") {
    console.log("SKIP_PRISMA_SETUP=true, pulando verificacao de banco.");
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL nao definida; pulando prisma migrate/push.");
    return;
  }

  try {
    run("npx prisma migrate deploy --schema prisma/schema.prisma", "Prisma migrate deploy");
    return;
  } catch (err) {
    console.warn("prisma migrate deploy falhou; tentando prisma db push...");
  }

  try {
    run("npx prisma db push --schema prisma/schema.prisma", "Prisma db push");
  } catch (err) {
    console.error("Prisma db push tambem falhou. Verifique DATABASE_URL e permissoes do banco.");
    throw err;
  }
}

main();
