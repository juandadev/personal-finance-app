"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { z } from "zod"

import {
  SelectWithCreate,
  type SelectWithCreateOption,
} from "@/components/select-with-create"
import { ThemeSelect } from "@/components/theme-select"
import { Button } from "@/components/ui/button"
import { FormField, FormStatusMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useDeferredInputFocus } from "@/hooks/use-deferred-input-focus"
import { useFinance } from "@/hooks/use-finance"
import { themeOptions } from "@/lib/finance/form-utils"
import { requiredStringSchema, themeColorSchema } from "@/lib/forms/validation"
import { useStandardForm } from "@/lib/forms/use-standard-form"

const createCategoryValue = "__create-category"

const quickCategorySchema = z.object({
  name: requiredStringSchema("Enter a category name.", 40),
  themeColor: themeColorSchema,
})

type QuickCategoryValues = z.input<typeof quickCategorySchema>

interface CategorySelectWithQuickCreateProps {
  error?: string
  id: string
  label?: string
  onValueChange: (value: string) => void
  placeholder?: string
  value: string
}

export function CategorySelectWithQuickCreate({
  error,
  id,
  label = "Category",
  onValueChange,
  placeholder = "Select a category",
  value,
}: CategorySelectWithQuickCreateProps) {
  const { actions, state } = useFinance()
  const [showQuickCategoryForm, setShowQuickCategoryForm] = useState(false)
  const [createdCategoryOption, setCreatedCategoryOption] =
    useState<SelectWithCreateOption | null>(null)
  const [pendingCategorySelectionId, setPendingCategorySelectionId] = useState<
    string | null
  >(null)
  const quickCategoryDefaultValues = useMemo(
    () =>
      ({
        name: "",
        themeColor: themeOptions[0].value,
      }) satisfies QuickCategoryValues,
    [],
  )
  const categoryOptions = useMemo(
    () =>
      withFallbackOption(
        state.categories.map((category) => ({
          value: category.id,
          label: category.name,
        })),
        createdCategoryOption,
      ),
    [createdCategoryOption, state.categories],
  )
  const quickCategoryForm = useStandardForm({
    defaultValues: quickCategoryDefaultValues,
    schema: quickCategorySchema,
    onSubmit: async ({ applyActionResult, resetForm, value }) => {
      const id = crypto.randomUUID()
      const name = value.name.trim()
      const result = await actions.addCategory({
        id,
        name,
        theme_color: value.themeColor,
      })

      if (!applyActionResult(result) || !result.ok) {
        return
      }

      setCreatedCategoryOption({ value: id, label: name })
      setPendingCategorySelectionId(id)
      setShowQuickCategoryForm(false)
      resetForm(quickCategoryDefaultValues)
    },
  })

  useEffect(() => {
    if (!pendingCategorySelectionId) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      onValueChange(pendingCategorySelectionId)
      setPendingCategorySelectionId(null)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [onValueChange, pendingCategorySelectionId])

  return (
    <div className="space-y-3">
      <SelectWithCreate
        id={id}
        label={label}
        value={
          pendingCategorySelectionId ?? createdCategoryOption?.value ?? value
        }
        onValueChange={(nextValue) => {
          setCreatedCategoryOption(null)
          setPendingCategorySelectionId(null)
          onValueChange(nextValue)
          setShowQuickCategoryForm(false)
        }}
        options={categoryOptions}
        placeholder={placeholder}
        createItem={{
          value: createCategoryValue,
          label: "Add a new category",
          onSelect: () => setShowQuickCategoryForm(true),
        }}
        error={error}
      />

      {showQuickCategoryForm ? (
        <QuickCategoryPanel
          form={quickCategoryForm}
          onCancel={() => setShowQuickCategoryForm(false)}
        />
      ) : null}
    </div>
  )
}

function QuickCategoryPanel({
  form,
  onCancel,
}: {
  form: ReturnType<
    typeof useStandardForm<
      QuickCategoryValues,
      z.output<typeof quickCategorySchema>
    >
  >
  onCancel: () => void
}) {
  const nameInputRef = useRef<HTMLInputElement>(null)

  useDeferredInputFocus(nameInputRef)

  return (
    <div className="bg-background space-y-3 rounded-lg p-3">
      <p className="text-muted-foreground text-xs font-bold">
        Quick Create Category
      </p>
      <form.form.Field name="name">
        {(field) => (
          <FormField
            id="quick-category-name"
            label="Name"
            error={form.fieldErrors.name}
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                ref={nameInputRef}
                value={field.state.value}
                onChange={(event) => form.setValue("name", event.target.value)}
                onBlur={field.handleBlur}
                placeholder="New category name"
              />
            )}
          </FormField>
        )}
      </form.form.Field>
      <form.form.Field name="themeColor">
        {(field) => (
          <ThemeSelect
            id="quick-category-theme"
            value={field.state.value}
            onValueChange={(nextValue) =>
              form.setValue("themeColor", nextValue)
            }
          />
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
              {isSubmitting ? "Adding..." : "Add Category"}
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

function withFallbackOption(
  options: SelectWithCreateOption[],
  fallbackOption: SelectWithCreateOption | null,
) {
  if (
    !fallbackOption ||
    options.some((option) => option.value === fallbackOption.value)
  ) {
    return options
  }

  return [...options, fallbackOption]
}
