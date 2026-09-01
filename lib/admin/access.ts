import "server-only"

import { isAdminUserAccess } from "@/lib/admin/access-policy"

interface AdminUser {
  email?: string | null
}

export function isAdminUser(user?: AdminUser | null) {
  return isAdminUserAccess({
    adminEmail: process.env.ADMIN_EMAIL_PRIVILEGES,
    nodeEnv: process.env.NODE_ENV,
    userEmail: user?.email,
  })
}
