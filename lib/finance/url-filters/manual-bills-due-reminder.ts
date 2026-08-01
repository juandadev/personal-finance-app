import { createSerializer } from "nuqs/server"

import { recurringBillQueryParsers } from "./query-state"

const serializeRecurringBillQuery = createSerializer(recurringBillQueryParsers)

export const MANUAL_BILLS_DUE_REMINDER_HREF = serializeRecurringBillQuery(
  "/recurring-bills",
  {
    source: ["bank_account"],
    status: ["overdue", "due-today", "due-soon"],
  },
)
