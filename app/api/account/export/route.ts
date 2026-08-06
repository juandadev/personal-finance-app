import { getVerifiedUserId } from "@/lib/auth/session"
import { createFinanceExportResponse } from "@/lib/privacy/export-response"
import { loadFinanceDataExport } from "@/lib/privacy/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  return createFinanceExportResponse({
    getAuthenticatedUserId: async () => {
      return getVerifiedUserId()
    },
    loadDataExport: loadFinanceDataExport,
  })
}
