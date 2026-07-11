"use client"

import { useMemo, useState, type ReactNode } from "react"
import { z } from "zod"
import { ItemActions } from "@/components/actions"
import { ContactAvatar } from "@/components/contact-avatar"
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
  AlertDialogTrigger,
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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { FormField, FormStatusMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
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
import {
  optionalTrimmedStringSchema,
  requiredStringSchema,
  themeColorSchema,
} from "@/lib/forms/validation"
import { useStandardForm } from "@/lib/forms/use-standard-form"
import type { CategoryRecord, CounterpartyRecord } from "@/lib/finance/types"
import { themeColorClasses } from "@/lib/theme-colors"
import { cn, getInitials } from "@/lib/utils"

const categoryDialogSchema = z.object({
  name: requiredStringSchema("Enter a category name.", 40),
  themeColor: themeColorSchema,
})

const contactDialogSchema = z.object({
  displayName: requiredStringSchema("Enter a contact name.", 60),
  type: z.enum(["person", "merchant"]),
  themeColor: themeColorSchema,
  notes: optionalTrimmedStringSchema(240),
})

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
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

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
      <ItemActions ariaLabel={`More options for ${category.name}`}>
        <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
          Edit Category
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => setIsDeleteOpen(true)}
        >
          Delete Category
        </DropdownMenuItem>
      </ItemActions>
      <CategoryDialog
        category={category}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
      <DeleteLibraryRecordDialog
        label={category.name}
        recordType="category"
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onDelete={(actions) => actions.deleteCategory(category.id)}
      />
    </div>
  )
}

function ContactRow({ counterparty }: { counterparty: CounterpartyRecord }) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

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
      <ItemActions ariaLabel={`More options for ${counterparty.display_name}`}>
        <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
          Edit Contact
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => setIsDeleteOpen(true)}
        >
          Delete Contact
        </DropdownMenuItem>
      </ItemActions>
      <ContactDialog
        counterparty={counterparty}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
      <DeleteLibraryRecordDialog
        label={counterparty.display_name}
        recordType="contact"
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onDelete={(actions) => actions.deleteCounterparty(counterparty.id)}
      />
    </div>
  )
}

function CategoryDialog({
  category,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  category?: CategoryRecord
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { actions } = useFinance()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)
  }
  const defaultValues = useMemo(
    () => ({
      name: category?.name ?? "",
      themeColor: category?.theme_color ?? themeOptions[0].value,
    }),
    [category?.name, category?.theme_color],
  )
  const standardForm = useStandardForm({
    defaultValues,
    schema: categoryDialogSchema,
    onSubmit: async ({ applyActionResult, resetForm, value }) => {
      const result = category
        ? await actions.updateCategory(category.id, {
            name: value.name,
            theme_color: value.themeColor,
          })
        : await actions.addCategory({
            id: crypto.randomUUID(),
            name: value.name,
            theme_color: value.themeColor,
          })

      if (!applyActionResult(result)) {
        return
      }

      setOpen(false)

      if (!category) {
        resetForm(defaultValues)
      }
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (nextOpen) {
      standardForm.reset(defaultValues)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled ? (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant={category ? "ghost" : "default"} size="sm">
              {category ? "Edit" : "Add Category"}
            </Button>
          )}
        </DialogTrigger>
      ) : null}
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
        <form className="mt-6 space-y-5" onSubmit={standardForm.handleSubmit}>
          <standardForm.form.Field name="name">
            {(field) => (
              <FormField
                id="library-category-name"
                label="Name"
                error={standardForm.fieldErrors.name}
              >
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={field.state.value}
                    onChange={(event) =>
                      standardForm.setValue("name", event.target.value)
                    }
                    onBlur={field.handleBlur}
                  />
                )}
              </FormField>
            )}
          </standardForm.form.Field>
          <standardForm.form.Field name="themeColor">
            {(field) => (
              <ThemeSelect
                id="library-category-theme"
                value={field.state.value}
                onValueChange={(value) =>
                  standardForm.setValue("themeColor", value)
                }
              />
            )}
          </standardForm.form.Field>
          {standardForm.status?.message ? (
            <FormStatusMessage variant={standardForm.status.variant}>
              {standardForm.status.message}
            </FormStatusMessage>
          ) : null}
          <standardForm.form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                size="finance-submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : category
                    ? "Save Category"
                    : "Add Category"}
              </Button>
            )}
          </standardForm.form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ContactDialog({
  counterparty,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  counterparty?: CounterpartyRecord
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { actions } = useFinance()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)
  }
  const defaultValues = useMemo(
    () => ({
      displayName: counterparty?.display_name ?? "",
      type: counterparty?.type ?? "person",
      themeColor:
        counterparty?.theme_color ??
        themeOptions[1]?.value ??
        themeOptions[0].value,
      notes: counterparty?.notes ?? "",
    }),
    [
      counterparty?.display_name,
      counterparty?.notes,
      counterparty?.theme_color,
      counterparty?.type,
    ],
  )
  const standardForm = useStandardForm({
    defaultValues,
    schema: contactDialogSchema,
    onSubmit: async ({ applyActionResult, resetForm, value }) => {
      const payload = {
        display_name: value.displayName,
        type: value.type,
        theme_color: value.themeColor,
        notes: value.notes,
      }
      const result = counterparty
        ? await actions.updateCounterparty(counterparty.id, payload)
        : await actions.addCounterparty({
            id: crypto.randomUUID(),
            ...payload,
          })

      if (!applyActionResult(result)) {
        return
      }

      setOpen(false)

      if (!counterparty) {
        resetForm(defaultValues)
      }
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (nextOpen) {
      standardForm.reset(defaultValues)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled ? (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant={counterparty ? "ghost" : "default"} size="sm">
              {counterparty ? "Edit" : "Add Contact"}
            </Button>
          )}
        </DialogTrigger>
      ) : null}
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
        <form className="mt-6 space-y-5" onSubmit={standardForm.handleSubmit}>
          <standardForm.form.Field name="displayName">
            {(field) => (
              <FormField
                id="library-contact-name"
                label="Name"
                error={standardForm.fieldErrors.displayName}
              >
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={field.state.value}
                    onChange={(event) =>
                      standardForm.setValue("displayName", event.target.value)
                    }
                    onBlur={field.handleBlur}
                  />
                )}
              </FormField>
            )}
          </standardForm.form.Field>
          <standardForm.form.Field name="type">
            {(field) => (
              <FormField
                id="library-contact-type"
                label="Type"
                error={standardForm.fieldErrors.type}
              >
                {(fieldProps) => (
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      standardForm.setValue(
                        "type",
                        value as "person" | "merchant",
                      )
                    }
                  >
                    <SelectTrigger {...fieldProps} variant="form">
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
                )}
              </FormField>
            )}
          </standardForm.form.Field>
          <standardForm.form.Field name="themeColor">
            {(field) => (
              <ThemeSelect
                id="library-contact-theme"
                value={field.state.value}
                onValueChange={(value) =>
                  standardForm.setValue("themeColor", value)
                }
              />
            )}
          </standardForm.form.Field>
          <standardForm.form.Field name="notes">
            {(field) => (
              <FormField
                id="library-contact-notes"
                label="Notes"
                error={standardForm.fieldErrors.notes}
              >
                {(fieldProps) => (
                  <Textarea
                    {...fieldProps}
                    value={field.state.value}
                    onChange={(event) =>
                      standardForm.setValue("notes", event.target.value)
                    }
                    onBlur={field.handleBlur}
                    placeholder="Optional details"
                  />
                )}
              </FormField>
            )}
          </standardForm.form.Field>
          {standardForm.status?.message ? (
            <FormStatusMessage variant={standardForm.status.variant}>
              {standardForm.status.message}
            </FormStatusMessage>
          ) : null}
          <standardForm.form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                size="finance-submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : counterparty
                    ? "Save Contact"
                    : "Add Contact"}
              </Button>
            )}
          </standardForm.form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteLibraryRecordDialog({
  label,
  recordType,
  onDelete,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  label: string
  recordType: "category" | "contact"
  onDelete: (actions: ReturnType<typeof useFinance>["actions"]) => Promise<{
    ok: boolean
    message: string
  }>
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { actions } = useFinance()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)

    if (!nextOpen) {
      setStatusMessage("")
    }
  }

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
    <AlertDialog open={open} onOpenChange={setOpen}>
      {!isControlled ? (
        <AlertDialogTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="sm">
              Delete
            </Button>
          )}
        </AlertDialogTrigger>
      ) : null}
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle variant="finance">
            Delete {recordType}?
          </AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            Delete &lsquo;{label}&rsquo; from your transaction library. This is
            only allowed when it is not used by finance records.
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
            <FormStatusMessage variant="error">
              {statusMessage}
            </FormStatusMessage>
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
  )
}
