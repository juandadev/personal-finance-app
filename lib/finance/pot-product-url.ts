import { z } from "zod"

export const potProductUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === "" || (/^https?:\/\//i.test(value) && URL.canParse(value)),
    "Enter a valid product link starting with https:// or http://.",
  )
  .transform((value) => value || null)
