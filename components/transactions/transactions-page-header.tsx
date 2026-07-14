"use client"

import { useState } from "react"
import Link from "next/link"

import { HeaderMenuItem, ModuleHeaderActions } from "@/components/actions"
import { PageHeading } from "@/components/overview/page-heading"
import { AddTransactionDialog } from "@/components/transactions/transaction-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

export function TransactionsPageHeader() {
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  return (
    <>
      <PageHeading title="Transactions">
        <ModuleHeaderActions
          primaryAction={
            <Button onClick={() => setAddDialogOpen(true)}>
              Add Transaction
            </Button>
          }
          primaryMenuItem={
            <HeaderMenuItem onSelect={() => setAddDialogOpen(true)}>
              Add Transaction
            </HeaderMenuItem>
          }
          ariaLabel="More transaction actions"
        >
          <DropdownMenuItem asChild>
            <Link href="/transactions/library">Manage Library</Link>
          </DropdownMenuItem>
        </ModuleHeaderActions>
      </PageHeading>
      <AddTransactionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </>
  )
}
