"use client"

import { useState, type FormEvent } from "react"
import { ContactAvatar } from "@/components/contact-avatar"
import { AuthStatusMessage } from "@/components/auth/auth-page-shell"
import { ThemeSelect } from "@/components/theme-select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useFinance } from "@/hooks/use-finance"
import { themeOptions } from "@/lib/finance/form-utils"
import type { CategoryRecord, CounterpartyRecord } from "@/lib/finance/types"
import { themeColorClasses, type ThemeColor } from "@/lib/theme-colors"
import { cn } from "@/lib/utils"

export function TransactionLibraryContent() {
  const { state } = useFinance()

  return (
    <Card className="space-y-6">
      <Tabs defaultValue="categories" className="gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Categories</h2>
              <p className="text-muted-foreground text-sm">
                Reusable transaction and budget categories.
              </p>
            </div>
            <CategoryDialog />
          </div>

          <div className="divide-muted-foreground/10 divide-y">
            {state.categories.map((category) => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Contacts</h2>
              <p className="text-muted-foreground text-sm">
                People and merchants used by transactions.
              </p>
            </div>
            <ContactDialog />
          </div>

          <div className="divide-muted-foreground/10 divide-y">
            {state.counterparties.map((counterparty) => (
              <ContactRow key={counterparty.id} counterparty={counterparty} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
}

function CategoryRow({ category }: { category: CategoryRecord }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "size-4 rounded-full border-2",
            themeColorClasses[category.theme_color].bg,
            themeColorClasses[category.theme_color].border,
          )}
        />
        <div className="min-w-0">
          <p className="text-foreground truncate text-sm font-bold">
            {category.name}
          </p>
          <p className="text-muted-foreground text-xs">{category.slug}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <CategoryDialog category={category} />
        <DeleteLibraryRecordDialog
          label={category.name}
          recordType="category"
          onDelete={(actions) => actions.deleteCategory(category.id)}
        />
      </div>
    </div>
  )
}

function ContactRow({ counterparty }: { counterparty: CounterpartyRecord }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <ContactAvatar
          name={counterparty.display_name}
          initials={getInitials(counterparty.display_name)}
          color={counterparty.theme_color}
          avatarUrl={counterparty.avatar_url ?? undefined}
        />
        <div className="min-w-0">
          <p className="text-foreground truncate text-sm font-bold">
            {counterparty.display_name}
          </p>
          <p className="text-muted-foreground text-xs capitalize">
            {counterparty.type}
            {counterparty.notes ? ` · ${counterparty.notes}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ContactDialog counterparty={counterparty} />
        <DeleteLibraryRecordDialog
          label={counterparty.display_name}
          recordType="contact"
          onDelete={(actions) => actions.deleteCounterparty(counterparty.id)}
        />
      </div>
    </div>
  )
}

function CategoryDialog({ category }: { category?: CategoryRecord }) {
  const { actions } = useFinance()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(category?.name ?? "")
  const [themeColor, setThemeColor] = useState<ThemeColor>(
    category?.theme_color ?? themeOptions[0].value,
  )
  const [statusMessage, setStatusMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatusMessage("")

    if (!name.trim()) {
      setStatusMessage("Enter a category name.")
      return
    }

    setIsSaving(true)

    const result = category
      ? await actions.updateCategory(category.id, {
          name,
          theme_color: themeColor,
        })
      : await actions.addCategory({
          id: crypto.randomUUID(),
          name,
          theme_color: themeColor,
        })

    setIsSaving(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    setOpen(false)

    if (!category) {
      setName("")
      setThemeColor(themeOptions[0].value)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={category ? "ghost" : "default"} size="sm">
          {category ? "Edit" : "Add Category"}
        </Button>
      </DialogTrigger>
      <DialogContent variant="finance" showCloseButton={false}>
        <DialogHeader className="text-left">
          <DialogTitle variant="finance">
            {category ? "Edit Category" : "Add Category"}
          </DialogTitle>
          <DialogDescription variant="finance">
            Categories classify transactions and can be used for budgets.
          </DialogDescription>
        </DialogHeader>
        <DialogCloseButton aria-label="Close category dialog" />
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label
              htmlFor="library-category-name"
              className="text-muted-foreground text-xs font-bold"
            >
              Name
            </Label>
            <Input
              id="library-category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <ThemeSelect
            id="library-category-theme"
            value={themeColor}
            onValueChange={setThemeColor}
          />
          <Button type="submit" size="finance-submit" disabled={isSaving}>
            {isSaving
              ? "Saving..."
              : category
                ? "Save Category"
                : "Add Category"}
          </Button>
          {statusMessage ? (
            <AuthStatusMessage variant="error">
              {statusMessage}
            </AuthStatusMessage>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ContactDialog({
  counterparty,
}: {
  counterparty?: CounterpartyRecord
}) {
  const { actions } = useFinance()
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState(
    counterparty?.display_name ?? "",
  )
  const [type, setType] = useState<"person" | "merchant">(
    counterparty?.type ?? "person",
  )
  const [themeColor, setThemeColor] = useState<ThemeColor>(
    counterparty?.theme_color ??
      themeOptions[1]?.value ??
      themeOptions[0].value,
  )
  const [notes, setNotes] = useState(counterparty?.notes ?? "")
  const [statusMessage, setStatusMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatusMessage("")

    if (!displayName.trim()) {
      setStatusMessage("Enter a contact name.")
      return
    }

    setIsSaving(true)

    const payload = {
      display_name: displayName,
      type,
      theme_color: themeColor,
      notes,
    }
    const result = counterparty
      ? await actions.updateCounterparty(counterparty.id, payload)
      : await actions.addCounterparty({
          id: crypto.randomUUID(),
          ...payload,
        })

    setIsSaving(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    setOpen(false)

    if (!counterparty) {
      setDisplayName("")
      setNotes("")
      setThemeColor(themeOptions[1]?.value ?? themeOptions[0].value)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={counterparty ? "ghost" : "default"} size="sm">
          {counterparty ? "Edit" : "Add Contact"}
        </Button>
      </DialogTrigger>
      <DialogContent variant="finance" showCloseButton={false}>
        <DialogHeader className="text-left">
          <DialogTitle variant="finance">
            {counterparty ? "Edit Contact" : "Add Contact"}
          </DialogTitle>
          <DialogDescription variant="finance">
            Contacts identify who a transaction involved.
          </DialogDescription>
        </DialogHeader>
        <DialogCloseButton aria-label="Close contact dialog" />
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label
              htmlFor="library-contact-name"
              className="text-muted-foreground text-xs font-bold"
            >
              Name
            </Label>
            <Input
              id="library-contact-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="library-contact-type"
              className="text-muted-foreground text-xs font-bold"
            >
              Type
            </Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as "person" | "merchant")}
            >
              <SelectTrigger id="library-contact-type" variant="form">
                <SelectValue />
              </SelectTrigger>
              <SelectContent matchTriggerWidth>
                <SelectItem value="person" variant="form">
                  Person
                </SelectItem>
                <SelectItem value="merchant" variant="form">
                  Merchant
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ThemeSelect
            id="library-contact-theme"
            value={themeColor}
            onValueChange={setThemeColor}
          />
          <div className="space-y-2">
            <Label
              htmlFor="library-contact-notes"
              className="text-muted-foreground text-xs font-bold"
            >
              Notes
            </Label>
            <Textarea
              id="library-contact-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional details"
            />
          </div>
          <Button type="submit" size="finance-submit" disabled={isSaving}>
            {isSaving
              ? "Saving..."
              : counterparty
                ? "Save Contact"
                : "Add Contact"}
          </Button>
          {statusMessage ? (
            <AuthStatusMessage variant="error">
              {statusMessage}
            </AuthStatusMessage>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteLibraryRecordDialog({
  label,
  recordType,
  onDelete,
}: {
  label: string
  recordType: "category" | "contact"
  onDelete: (actions: ReturnType<typeof useFinance>["actions"]) => Promise<{
    ok: boolean
    message: string
  }>
}) {
  const { actions } = useFinance()
  const [open, setOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    setStatusMessage("")

    const result = await onDelete(actions)

    setIsDeleting(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    setOpen(false)
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent variant="finance">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle variant="finance">
              Delete {recordType}?
            </AlertDialogTitle>
            <AlertDialogDescription variant="finance">
              Delete &lsquo;{label}&rsquo; from your transaction library. This
              is only allowed when it is not used by finance records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCloseButton
            aria-label={`Close delete ${recordType} dialog`}
          />
          <div className="mt-5 flex flex-col gap-5">
            <AlertDialogAction
              variant="destructive"
              size="finance-submit"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
            >
              {isDeleting ? "Deleting..." : `Delete ${recordType}`}
            </AlertDialogAction>
            {statusMessage ? (
              <AuthStatusMessage variant="error">
                {statusMessage}
              </AuthStatusMessage>
            ) : null}
            <AlertDialogCancel
              variant="muted-link"
              size="text-link"
              className="mx-auto"
            >
              Keep {recordType}
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  return initials || "?"
}
