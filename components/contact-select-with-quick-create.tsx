"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { z } from "zod"

import { ContactAvatar } from "@/components/contact-avatar"
import {
  SelectWithCreate,
  type SelectWithCreateOption,
} from "@/components/select-with-create"
import { ThemeSelect } from "@/components/theme-select"
import { Button } from "@/components/ui/button"
import { FormField, FormStatusMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useDeferredInputFocus } from "@/hooks/use-deferred-input-focus"
import { useFinance } from "@/hooks/use-finance"
import { themeOptions } from "@/lib/finance/form-utils"
import {
  optionalTrimmedStringSchema,
  requiredStringSchema,
  themeColorSchema,
} from "@/lib/forms/validation"
import { filterSelectableCounterparties } from "@/lib/finance/contact-selection"
import { useStandardForm } from "@/lib/forms/use-standard-form"
import type { ThemeColor } from "@/lib/theme-colors"
import { getInitials } from "@/lib/utils"

const createContactValue = "__create-contact"

const quickContactSchema = z.object({
  displayName: requiredStringSchema("Enter a contact name.", 60),
  type: z.enum(["person", "merchant"]),
  themeColor: themeColorSchema,
  notes: optionalTrimmedStringSchema(240),
})

type QuickContactValues = z.input<typeof quickContactSchema>

type ContactSelectOption = SelectWithCreateOption & {
  contactAvatar: {
    name: string
    initials: string
    color: ThemeColor
    avatarUrl?: string
  }
}

interface ContactSelectWithQuickCreateProps {
  error?: string
  excludeAccountOwner?: boolean
  id: string
  label?: string
  onValueChange: (value: string) => void
  placeholder?: string
  value: string
}

export function ContactSelectWithQuickCreate({
  error,
  excludeAccountOwner = false,
  id,
  label = "Contact",
  onValueChange,
  placeholder = "Select a contact",
  value,
}: ContactSelectWithQuickCreateProps) {
  const { actions, state } = useFinance()
  const [showQuickContactForm, setShowQuickContactForm] = useState(false)
  const [createdContactOption, setCreatedContactOption] =
    useState<ContactSelectOption | null>(null)
  const [pendingContactSelectionId, setPendingContactSelectionId] = useState<
    string | null
  >(null)
  const quickContactDefaultValues = useMemo(
    () =>
      ({
        displayName: "",
        type: "person",
        themeColor: themeOptions[1]?.value ?? themeOptions[0].value,
        notes: "",
      }) satisfies QuickContactValues,
    [],
  )
  const contactOptions = useMemo(
    () =>
      withFallbackOption(
        filterSelectableCounterparties(state.counterparties, {
          excludeAccountOwner,
          selectedId: value,
        }).map((counterparty) => ({
          value: counterparty.id,
          label: counterparty.display_name,
          contactAvatar: {
            name: counterparty.display_name,
            initials: getInitials(counterparty.display_name),
            color: counterparty.theme_color,
            avatarUrl: counterparty.avatar_url ?? undefined,
          },
        })),
        createdContactOption,
      ),
    [createdContactOption, excludeAccountOwner, state.counterparties, value],
  )
  const quickContactForm = useStandardForm({
    defaultValues: quickContactDefaultValues,
    schema: quickContactSchema,
    onSubmit: async ({ applyActionResult, resetForm, value }) => {
      const id = crypto.randomUUID()
      const displayName = value.displayName.trim()
      const result = await actions.addCounterparty({
        id,
        display_name: displayName,
        type: value.type,
        theme_color: value.themeColor,
        notes: value.notes,
      })

      if (!applyActionResult(result) || !result.ok) {
        return
      }

      setCreatedContactOption({
        value: id,
        label: displayName,
        contactAvatar: {
          name: displayName,
          initials: getInitials(displayName),
          color: value.themeColor,
        },
      })
      setPendingContactSelectionId(id)
      setShowQuickContactForm(false)
      resetForm(quickContactDefaultValues)
    },
  })

  useEffect(() => {
    if (!pendingContactSelectionId) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      onValueChange(pendingContactSelectionId)
      setPendingContactSelectionId(null)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [onValueChange, pendingContactSelectionId])

  return (
    <div className="space-y-3">
      <SelectWithCreate
        id={id}
        label={label}
        value={
          pendingContactSelectionId ?? createdContactOption?.value ?? value
        }
        onValueChange={(nextValue) => {
          setCreatedContactOption(null)
          setPendingContactSelectionId(null)
          onValueChange(nextValue)
          setShowQuickContactForm(false)
        }}
        options={contactOptions}
        placeholder={placeholder}
        renderOption={(option) => <ContactSelectOptionLabel option={option} />}
        createItem={{
          value: createContactValue,
          label: "Add a new contact",
          onSelect: () => setShowQuickContactForm(true),
        }}
        error={error}
      />

      {showQuickContactForm ? (
        <QuickContactPanel
          form={quickContactForm}
          onCancel={() => setShowQuickContactForm(false)}
        />
      ) : null}
    </div>
  )
}

function QuickContactPanel({
  form,
  onCancel,
}: {
  form: ReturnType<
    typeof useStandardForm<
      QuickContactValues,
      z.output<typeof quickContactSchema>
    >
  >
  onCancel: () => void
}) {
  const nameInputRef = useRef<HTMLInputElement>(null)

  useDeferredInputFocus(nameInputRef)

  return (
    <div className="bg-background space-y-3 rounded-lg p-3">
      <p className="text-muted-foreground text-xs font-bold">
        Quick Create Contact
      </p>
      <form.form.Field name="displayName">
        {(field) => (
          <FormField
            id="quick-contact-name"
            label="Name"
            error={form.fieldErrors.displayName}
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                ref={nameInputRef}
                value={field.state.value}
                onChange={(event) =>
                  form.setValue("displayName", event.target.value)
                }
                onBlur={field.handleBlur}
                placeholder="New contact name"
              />
            )}
          </FormField>
        )}
      </form.form.Field>
      <form.form.Field name="type">
        {(field) => (
          <ContactTypeSelect
            id="quick-contact-type"
            value={field.state.value}
            onValueChange={(nextValue) => form.setValue("type", nextValue)}
            error={form.fieldErrors.type}
          />
        )}
      </form.form.Field>
      <form.form.Field name="themeColor">
        {(field) => (
          <ThemeSelect
            id="quick-contact-theme"
            value={field.state.value}
            onValueChange={(nextValue) =>
              form.setValue("themeColor", nextValue)
            }
          />
        )}
      </form.form.Field>
      <form.form.Field name="notes">
        {(field) => (
          <FormField
            id="quick-contact-notes"
            label="Notes"
            error={form.fieldErrors.notes}
          >
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                value={field.state.value}
                onChange={(event) => form.setValue("notes", event.target.value)}
                onBlur={field.handleBlur}
                placeholder="Optional notes"
              />
            )}
          </FormField>
        )}
      </form.form.Field>
      {form.status?.message ? (
        <FormStatusMessage variant={form.status.variant}>
          {form.status.message}
        </FormStatusMessage>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <form.form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={() => void form.form.handleSubmit()}
            >
              {isSubmitting ? "Adding..." : "Add Contact"}
            </Button>
          )}
        </form.form.Subscribe>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function ContactTypeSelect({
  error,
  id,
  onValueChange,
  value,
}: {
  error?: string
  id: string
  onValueChange: (value: "person" | "merchant") => void
  value: "person" | "merchant"
}) {
  return (
    <FormField id={id} label="Contact Type" error={error}>
      {(fieldProps) => (
        <Select
          value={value}
          onValueChange={(nextValue) =>
            onValueChange(nextValue as "person" | "merchant")
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
  )
}

function ContactSelectOptionLabel({ option }: { option: ContactSelectOption }) {
  return (
    <span className="flex items-center gap-3">
      <ContactAvatar
        className="size-8"
        name={option.contactAvatar.name}
        initials={option.contactAvatar.initials}
        color={option.contactAvatar.color}
        avatarUrl={option.contactAvatar.avatarUrl}
      />
      <span>{option.label}</span>
    </span>
  )
}

function withFallbackOption(
  options: ContactSelectOption[],
  fallbackOption: ContactSelectOption | null,
) {
  if (
    !fallbackOption ||
    options.some((option) => option.value === fallbackOption.value)
  ) {
    return options
  }

  return [...options, fallbackOption]
}
