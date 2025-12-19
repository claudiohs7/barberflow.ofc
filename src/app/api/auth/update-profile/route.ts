import { NextResponse } from "next/server";
import { verifyAccessToken, signAccessToken } from "@/lib/jwt";
import { verifyCredentials, updateUserEmail, updateUserPassword, updateUserAvatar, updateUserProfile } from "@/server/db/repositories/users";

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  name?: string | null;
  avatarUrl?: string | null;
}

type UpdateProfileBody = {
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  avatarUrl?: string | null;
  name?: string | null;
  phone?: string | null;
};

export async function PATCH(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Token ausente" }, { status: 401 });
    }
    const payload = verifyAccessToken(token) as JwtPayload | null;
    if (!payload || typeof payload === "string") {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const { email, currentPassword, newPassword, avatarUrl, name, phone } = (await req.json()) as UpdateProfileBody;
    if (!email && !newPassword && avatarUrl === undefined && name === undefined && phone === undefined) {
      return NextResponse.json({ error: "Nenhuma alteração informada" }, { status: 400 });
    }

    // Email/senha exigem confirmar senha; avatar pode ser trocado sem senha
    if (email || newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Informe a senha atual para continuar" }, { status: 401 });
      }
      const credentialsValid = await verifyCredentials(payload.email, currentPassword);
      if (!credentialsValid) {
        return NextResponse.json({ error: "Senha atual inválida" }, { status: 401 });
      }
    }

    let updatedEmail = payload.email;
    if (email && email !== payload.email) {
      await updateUserEmail(payload.userId, email);
      updatedEmail = email;
    }

    if (newPassword) {
      await updateUserPassword(payload.userId, newPassword);
    }

    let updatedAvatar = payload.avatarUrl ?? null;
    if (avatarUrl !== undefined) {
      try {
        await updateUserAvatar(payload.userId, avatarUrl);
        updatedAvatar = avatarUrl ?? null;
      } catch (err: any) {
        // Se o campo avatar nÃ£o existir na base (sem migraÃ§Ã£o), ignora para nÃ£o quebrar o endpoint
        const msg = err?.message || "";
        if (msg.includes("Unknown argument `avatarUrl`") || msg.includes("Unknown field")) {
          updatedAvatar = payload.avatarUrl ?? null;
        } else {
          throw err;
        }
      }
    }

    // Atualiza nome/telefone sem exigir senha
    if (name !== undefined || phone !== undefined) {
      await updateUserProfile(payload.userId, { name: name ?? null, phone: phone ?? null });
    }

    const updatedUser = {
      id: payload.userId,
      email: updatedEmail,
      name: name ?? payload.name ?? null,
      role: payload.role,
      phone: phone ?? payload.phone ?? null,
      avatarUrl: updatedAvatar,
    };

    const accessToken = signAccessToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      name: updatedUser.name,
      phone: updatedUser.phone,
      avatarUrl: updatedUser.avatarUrl,
    });

    return NextResponse.json({ data: { user: updatedUser, accessToken } });
  } catch (error: any) {
    console.error("PATCH /api/auth/update-profile error:", error);
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
  }
}
