import "server-only"

interface AdminUser {
  email?: string | null
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? ""
}

export function hasAdminEmailPrivileges(userEmail?: string | null) {
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL_PRIVILEGES)

  if (!adminEmail) {
    return false
  }

  return normalizeEmail(userEmail) === adminEmail
}

export function isAdminUser(user?: AdminUser | null) {
  return hasAdminEmailPrivileges(user?.email)
}
