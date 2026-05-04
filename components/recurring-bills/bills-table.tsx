import type { RecurringBill } from "@/lib/types"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill Title</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.map((bill) => (
              <BillTableRow key={bill.id} bill={bill} />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
