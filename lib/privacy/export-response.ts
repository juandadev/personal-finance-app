import {
  FinanceExportTooLargeError,
  getFinanceExportHeaders,
  serializeFinanceDataExport,
  type FinanceDataExport,
} from "@/lib/privacy/data-export"

interface FinanceExportResponseDependencies {
  getAuthenticatedUserId: () => Promise<string | null>
  loadDataExport: (
    userId: string,
    generatedAt: Date,
  ) => Promise<FinanceDataExport>
  now?: () => Date
}

const privateResponseHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
}

export async function createFinanceExportResponse({
  getAuthenticatedUserId,
  loadDataExport,
  now = () => new Date(),
}: FinanceExportResponseDependencies) {
  const userId = await getAuthenticatedUserId()

  if (!userId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: privateResponseHeaders },
    )
  }

  try {
    const generatedAt = now()
    const dataExport = await loadDataExport(userId, generatedAt)
    const body = serializeFinanceDataExport(dataExport)

    return new Response(body, {
      status: 200,
      headers: getFinanceExportHeaders(generatedAt),
    })
  } catch (error) {
    if (error instanceof FinanceExportTooLargeError) {
      return Response.json(
        {
          error:
            "Your export is too large for the closed beta download. Contact support for help.",
        },
        { status: 413, headers: privateResponseHeaders },
      )
    }

    return Response.json(
      { error: "We could not prepare your export. Try again." },
      { status: 500, headers: privateResponseHeaders },
    )
  }
}
