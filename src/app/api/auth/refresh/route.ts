import { NextResponse } from "next/server";
import { findUserByRefreshToken, setRefreshToken } from "@/server/db/repositories/users";
import { signAccessToken } from "@/lib/jwt";
import { isSuperAdminEmail } from "@/lib/super-admin";

export async function POST(req: Request) {
  try {
    const refreshToken = req.cookies.get("refresh_token");
    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token ausente." }, { status: 401 });
    }

    const user = await findUserByRefreshToken(refreshToken.value);
    if (!user) {
      return NextResponse.json({ error: "Refresh token inválido." }, { status: 401 });
    }

    const newRefreshToken = crypto.randomUUID();
    await setRefreshToken(user.id, newRefreshToken);

    const effectiveRole = isSuperAdminEmail(user.email) ? "SUPERADMIN" : user.role;
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: effectiveRole,
      name: user.name ?? null,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
    });

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
    res.cookies.set("refresh_token", newRefreshToken, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
    return res;
  } catch (error: any) {
    console.error("POST /api/auth/refresh error:", error);
    return NextResponse.json({ error: "Falha ao renovar sessão" }, { status: 500 });
  }
}
