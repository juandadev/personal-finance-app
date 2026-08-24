import { createNeonAuth } from "@neondatabase/auth/next/server"

import { getNeonAuthBaseUrl, getNeonAuthCookieSecret } from "@/lib/env/server"

export const auth = createNeonAuth({
  baseUrl: getNeonAuthBaseUrl(),
  cookies: {
    secret: getNeonAuthCookieSecret(),
    sessionDataTtl: 300,
  },
})
