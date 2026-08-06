import "server-only"

interface ErrorContext {
  [key: string]: boolean | number | string | null | undefined
}

function getSafeErrorFields(error: unknown) {
  if (!(error instanceof Error)) {
    return { errorType: "UnknownError" }
  }

  const code =
    "code" in error && typeof error.code === "string" ? error.code : undefined

  return {
    errorType: error.name || "Error",
    errorCode: code,
  }
}

export function logServerError(
  event: string,
  error: unknown,
  context: ErrorContext = {},
) {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      ...getSafeErrorFields(error),
      ...context,
    }),
  )
}

export function logSecurityEvent(event: string, context: ErrorContext = {}) {
  console.warn(
    JSON.stringify({
      level: "warn",
      event,
      ...context,
    }),
  )
}
