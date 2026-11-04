import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Checagem otimista: só olha se existe o cookie de sessão (sem consultar o banco).
 * A validação real continua em requireUser/requireParoquia dentro de cada página e action.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const login = new URL("/login", request.url);
    const { pathname, search } = request.nextUrl;
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/painel/:path*",
};
