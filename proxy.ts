import { auth } from "@/lib/auth/server"

export default auth.middleware({
  loginUrl: "/login",
})

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|images|login|sign-up).*)",
  ],
}
