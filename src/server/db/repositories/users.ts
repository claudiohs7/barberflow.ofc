import bcrypt from "bcryptjs";
import prisma from "../client";

type CreateUserInput = {
  email: string;
  name?: string;
  phone?: string;
  password: string;
  role?: "SUPERADMIN" | "ADMIN" | "BARBER" | "CLIENT";
  avatarUrl?: string;
};

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function getUserById(id: string) {
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data: CreateUserInput) {
  const existing = await findUserByEmail(data.email);
  if (existing) {
    const ownedBarbershops = await prisma.barbershop.count({ where: { ownerId: existing.id } });
    if (ownedBarbershops === 0) {
      await prisma.user.delete({ where: { id: existing.id } });
    } else {
      throw new Error("E-mail já está em uso.");
    }
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  return prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: data.email.toLowerCase(),
      name: data.name,
      phone: data.phone,
      passwordHash,
      role: data.role ?? "CLIENT",
      avatarUrl: data.avatarUrl,
    },
  });
}

export async function verifyCredentials(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user || !user.passwordHash) return null;
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;
  return user;
}

export async function setRefreshToken(userId: string, token: string) {
  await prisma.user.update({ where: { id: userId }, data: { refreshToken: token } });
}

export async function clearRefreshToken(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
}

export async function findUserByRefreshToken(token: string) {
  if (!token) return null;
  return prisma.user.findFirst({ where: { refreshToken: token } });
}

export async function updateUserEmail(userId: string, email: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { email },
  });
}

export async function updateUserPassword(userId: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function updateUserAvatar(userId: string, avatarUrl: string | null) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
  });
}

export async function updateUserProfile(userId: string, data: { name?: string | null; phone?: string | null }) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name ?? undefined,
      phone: data.phone ?? undefined,
    },
  });
}
