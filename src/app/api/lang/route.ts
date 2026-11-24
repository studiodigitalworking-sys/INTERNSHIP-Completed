import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const l = req.nextUrl.searchParams.get("l") === "hi" ? "hi" : "en";
  const back = req.headers.get("referer") || "/";
  const res = NextResponse.redirect(new URL(back, req.url));
  res.cookies.set("lang", l, { path: "/", maxAge: 31536000, sameSite: "lax" });
  return res;
}
