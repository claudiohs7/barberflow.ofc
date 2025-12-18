import { PrismaConfig } from "@prisma/cli";
import dotenv from "dotenv";

dotenv.config();

const config: PrismaConfig = {
  datasources: {
    db: {
      provider: "mysql",
      url: process.env.DATABASE_URL,
    },
  },
};

export default config;
