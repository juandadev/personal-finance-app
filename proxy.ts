import { auth } from "@/lib/auth/server"

export default auth.middleware({
  loginUrl: "/login",
})

export const config = {
  matcher: [
    {
      source:
        "/((?!api/auth|_next/static|_next/image|favicon.ico|images|login|sign-up).*)",
      // Server Actions POST to the current page URL. If middleware redirects
      // that request (e.g. to /login), the browser follows the redirect and
      // returns HTML instead of the action response, which Next.js cannot
      // parse ("An unexpected response was received from the server."). Skip
      // this middleware for action requests and let each Server Action
      // enforce its own auth check (see getUserId() in lib/finance/actions.ts)
      // so unauthenticated calls fail with a clean, serializable error.
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
}
