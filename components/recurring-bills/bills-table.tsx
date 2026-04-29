import type { RecurringBill } from "@/lib/types"
import { BillTableRow, MobileBillRow } from "./bill-table-row"

interface BillsTableProps {
  bills: RecurringBill[]
}

export function BillsTable({ bills }: BillsTableProps) {
  return (
    <>
      {/* Mobile list view */}
      <ul className="divide-muted-foreground/10 divide-y md:hidden">
        {bills.map((bill) => (
          <MobileBillRow key={bill.id} bill={bill} />
        ))}
      </ul>

      {/* Desktop/Tablet table view */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-muted-foreground/10 border-b">
              <th className="text-muted-foreground pb-3 text-left text-xs font-normal">
                Bill Title
              </th>
              <th className="text-muted-foreground pb-3 text-left text-xs font-normal">
                Due Date
              </th>
              <th className="text-muted-foreground pb-3 text-right text-xs font-normal">
                Amount
              </th>
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
