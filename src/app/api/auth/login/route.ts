import { NextResponse } from "next/server";
import { verifyCredentials, setRefreshToken } from "@/server/db/repositories/users";
import { signAccessToken } from "@/lib/jwt";
import { isSuperAdminEmail } from "@/lib/super-admin";

type LoginBody = {
  email: string;
  password: string;
};

export async function POST(req: Request) {
  try {
    const body: LoginBody = await req.json();
    const email = body.email.trim().toLowerCase();
    const user = await verifyCredentials(email, body.password);
    if (!user) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }
    const effectiveRole = isSuperAdminEmail(user.email) ? "SUPERADMIN" : user.role;
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: effectiveRole,
      name: user.name ?? null,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
    });
    const refreshToken = crypto.randomUUID();
    await setRefreshToken(user.id, refreshToken);
    const responsePayload = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        role: effectiveRole,
        phone: user.phone ?? null,
        avatarUrl: user.avatarUrl ?? null,
      },
      accessToken,
    };
    const res = NextResponse.json({ data: responsePayload });
    res.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
    return res;
  } catch (error: any) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json({ error: "Falha ao autenticar" }, { status: 500 });
  }
}
