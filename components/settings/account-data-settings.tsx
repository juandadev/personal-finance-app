"use client"

import { useState } from "react"
import Link from "next/link"
import {
  DownloadSimpleIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@phosphor-icons/react"

import { deleteCurrentAccount } from "@/app/(app)/settings/actions"
import {
  ACCOUNT_DELETION_CONFIRMATION,
  accountDeletionSchema,
  type AccountDeletionInput,
} from "@/lib/privacy/account-deletion"
import { useStandardForm } from "@/lib/forms/use-standard-form"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FormField, FormStatusMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

interface AccountDataSettingsProps {
  requiresPassword: boolean
}

export function AccountDataSettings({
  requiresPassword,
}: AccountDataSettingsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const standardForm = useStandardForm({
    defaultValues: {
      confirmationPhrase: "",
      currentPassword: "",
    } satisfies AccountDeletionInput,
    schema: accountDeletionSchema,
    onSubmit: async ({ applyActionResult, value }) => {
      const result = await deleteCurrentAccount(value)

      if (!applyActionResult(result)) {
        return
      }

      window.location.assign("/login?accountDeleted=1")
    },
  })

  const handleDeleteDialogChange = (open: boolean) => {
    setDeleteDialogOpen(open)

    if (!open) {
      standardForm.reset()
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card asChild>
        <section aria-labelledby="data-export-heading">
          <CardHeader className="items-start">
            <div className="space-y-2">
              <CardTitle id="data-export-heading">
                <DownloadSimpleIcon
                  className="size-5"
                  weight="fill"
                  aria-hidden
                />
                Data Export
              </CardTitle>
              <CardDescription className="max-w-prose leading-6">
                Download a JSON copy of your profile and every finance record
                owned by your account. Authentication secrets and session tokens
                are never included.
              </CardDescription>
            </div>
          </CardHeader>
          <Button asChild variant="secondary" className="mt-6">
            <a href="/api/account/export" download>
              <DownloadSimpleIcon weight="fill" aria-hidden />
              Download My Data
            </a>
          </Button>
        </section>
      </Card>

      <Card asChild>
        <section aria-labelledby="privacy-heading">
          <CardHeader className="items-start">
            <div className="space-y-2">
              <CardTitle id="privacy-heading">
                <ShieldCheckIcon className="size-5" weight="fill" aria-hidden />
                Privacy
              </CardTitle>
              <CardDescription className="max-w-prose leading-6">
                Review how this closed beta uses, protects, retains, and deletes
                personal and financial information.
              </CardDescription>
            </div>
          </CardHeader>
          <Button asChild variant="secondary" className="mt-6">
            <Link href="/privacidad">Read Privacy Notice</Link>
          </Button>
        </section>
      </Card>

      <Card asChild className="border-destructive/20 border lg:col-span-2">
        <section aria-labelledby="delete-account-heading">
          <CardHeader className="items-start">
            <div className="space-y-2">
              <CardTitle id="delete-account-heading">
                <TrashIcon
                  className="text-destructive size-5"
                  weight="fill"
                  aria-hidden
                />
                Delete Account
              </CardTitle>
              <CardDescription className="max-w-3xl leading-6">
                Permanently remove your active finance data and sign-in account.
                This cannot be undone. Deleted data may remain in protected
                backups for up to 30 days before expiry.
              </CardDescription>
            </div>
          </CardHeader>

          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={handleDeleteDialogChange}
          >
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="mt-6">
                <TrashIcon weight="fill" aria-hidden />
                Delete My Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent variant="finance">
              <AlertDialogHeader className="text-left">
                <AlertDialogCloseButton aria-label="Close account deletion dialog" />
                <AlertDialogTitle variant="finance">
                  Delete Your Account?
                </AlertDialogTitle>
                <AlertDialogDescription variant="finance">
                  Your finance records, settings, and sign-in account will be
                  removed. Other signed-in devices will lose access.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <form
                className="mt-6 space-y-5"
                aria-label="Delete account form"
                onSubmit={standardForm.handleSubmit}
              >
                <standardForm.form.Field name="confirmationPhrase">
                  {(field) => (
                    <FormField
                      id="account-deletion-confirmation"
                      label="Confirmation phrase"
                      helperText={
                        <>
                          Type{" "}
                          <span className="text-foreground font-bold">
                            {ACCOUNT_DELETION_CONFIRMATION}
                          </span>{" "}
                          exactly.
                        </>
                      }
                      error={
                        standardForm.fieldErrors.confirmationPhrase as
                          string | undefined
                      }
                    >
                      {(fieldProps) => (
                        <Input
                          {...fieldProps}
                          name="confirmationPhrase"
                          autoComplete="off"
                          spellCheck={false}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            standardForm.setValue(
                              "confirmationPhrase",
                              event.target.value,
                            )
                          }
                        />
                      )}
                    </FormField>
                  )}
                </standardForm.form.Field>

                {requiresPassword ? (
                  <standardForm.form.Field name="currentPassword">
                    {(field) => (
                      <FormField
                        id="account-deletion-password"
                        label="Current password"
                        helperText="Required for accounts that use email and password."
                        error={
                          standardForm.fieldErrors.currentPassword as
                            string | undefined
                        }
                      >
                        {(fieldProps) => (
                          <Input
                            {...fieldProps}
                            name="currentPassword"
                            type="password"
                            autoComplete="current-password"
                            value={field.state.value ?? ""}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              standardForm.setValue(
                                "currentPassword",
                                event.target.value,
                              )
                            }
                          />
                        )}
                      </FormField>
                    )}
                  </standardForm.form.Field>
                ) : null}

                {standardForm.status?.message ? (
                  <FormStatusMessage variant={standardForm.status.variant}>
                    {standardForm.status.message}
                  </FormStatusMessage>
                ) : null}

                <standardForm.form.Subscribe
                  selector={(state) => state.isSubmitting}
                >
                  {(isSubmitting) => (
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <AlertDialogCancel type="button" disabled={isSubmitting}>
                        Keep My Account
                      </AlertDialogCancel>
                      <Button
                        type="submit"
                        variant="destructive"
                        disabled={isSubmitting}
                      >
                        {isSubmitting
                          ? "Deleting Account..."
                          : "Delete Account Permanently"}
                      </Button>
                    </div>
                  )}
                </standardForm.form.Subscribe>
              </form>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </Card>
    </div>
  )
}
