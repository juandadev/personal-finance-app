import { auth } from "@/lib/auth/server"
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy"

const handlers = auth.handler()

export const GET = handlers.GET

interface AuthRouteContext {
  params: Promise<{ path: string[] }>
}

export async function POST(request: Request, context: AuthRouteContext) {
  const { path } = await context.params

  if (path.join("/") === "sign-up/email") {
    let body: unknown

    try {
      body = await request.clone().json()
    } catch {
      return Response.json(
        {
          code: "INVALID_SIGN_UP_REQUEST",
          message: "Enter valid account details.",
        },
        { status: 400 },
      )
    }

    const password =
      typeof body === "object" &&
      body !== null &&
      "password" in body &&
      typeof body.password === "string"
        ? body.password
        : ""

    if (password.length < PASSWORD_MIN_LENGTH) {
      return Response.json(
        {
          code: "PASSWORD_TOO_SHORT",
          message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
        },
        { status: 400 },
      )
    }
  }

  return handlers.POST(request, context)
}
