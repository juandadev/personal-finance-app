import type { RecurringBill } from "@/lib/types"
import { BillTableRow, MobileBillRow } from "./bill-table-row"

interface BillsTableProps {
  bills: RecurringBill[]
}

export function BillsTable({ bills }: BillsTableProps) {
  return (
    <>
      {/* Mobile list view */}
      <ul className="divide-y divide-muted-foreground/10 md:hidden">
        {bills.map((bill) => (
          <MobileBillRow key={bill.id} bill={bill} />
        ))}
      </ul>

      {/* Desktop/Tablet table view */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-muted-foreground/10">
              <th className="pb-3 text-left text-xs font-normal text-muted-foreground">Bill Title</th>
              <th className="pb-3 text-left text-xs font-normal text-muted-foreground">Due Date</th>
              <th className="pb-3 text-right text-xs font-normal text-muted-foreground">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <BillTableRow key={bill.id} bill={bill} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
