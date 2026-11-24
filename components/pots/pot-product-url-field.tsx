import type { ComponentProps } from "react"

import { FormField } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

type PotProductUrlFieldProps = Pick<
  ComponentProps<typeof Input>,
  "onBlur" | "onChange" | "value"
> & {
  id: string
  error?: string
}

export function PotProductUrlField({
  id,
  error,
  ...inputProps
}: PotProductUrlFieldProps) {
  return (
    <FormField id={id} label="Product Link (optional)" error={error}>
      {(fieldProps) => (
        <Input
          {...inputProps}
          {...fieldProps}
          name="productUrl"
          type="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://example.com/product"
        />
      )}
    </FormField>
  )
}
