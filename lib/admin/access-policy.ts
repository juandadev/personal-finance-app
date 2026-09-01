function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? ""
}

export function isLocalDevelopmentEnvironment(nodeEnv?: string | null) {
  return nodeEnv === "development"
}

export function hasAdminEmailPrivileges(
  userEmail?: string | null,
  adminEmail?: string | null,
) {
  const configuredAdminEmail = normalizeEmail(adminEmail)

  if (!configuredAdminEmail) {
    return false
  }

  return normalizeEmail(userEmail) === configuredAdminEmail
}

export function isAdminUserAccess(options: {
  adminEmail?: string | null
  nodeEnv?: string | null
  userEmail?: string | null
}) {
  return (
    isLocalDevelopmentEnvironment(options.nodeEnv) &&
    hasAdminEmailPrivileges(options.userEmail, options.adminEmail)
  )
}
