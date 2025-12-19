import { NextResponse } from "next/server";
import { clearRefreshToken, findUserByRefreshToken } from "@/server/db/repositories/users";

export async function POST(req: Request) {
  try {
    const refresh = req.cookies.get("refresh_token");
    if (refresh) {
      const user = await findUserByRefreshToken(refresh.value);
      if (user) {
        await clearRefreshToken(user.id);
      }
    }
    const res = NextResponse.json({ success: true });
    res.cookies.set("refresh_token", "", { maxAge: -1, path: "/" });
    return res;
  } catch (error: any) {
    console.error("POST /api/auth/logout error:", error);
    return NextResponse.json({ error: "Não foi possível sair" }, { status: 500 });
  }
}
