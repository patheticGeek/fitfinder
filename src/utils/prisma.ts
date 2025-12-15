import { PrismaPg } from "@prisma/adapter-pg";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "~/prisma-generated/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
export const prismaClient = new PrismaClient({ adapter });

const cryptoPbkdf2Promise = promisify(crypto.pbkdf2);

export async function hashPassword(password: string) {
  if (!process.env.PASSWORD_SALT) {
    throw new Error("PASSWORD_SALT is not defined in environment variables");
  }

  const derivedKey = await cryptoPbkdf2Promise(
    password,
    process.env.PASSWORD_SALT,
    100000,
    64,
    "sha256"
  );

  return derivedKey.toString("hex");
}
