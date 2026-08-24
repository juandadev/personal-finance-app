# Vercel Firewall Baseline

Configure these rules in the production Vercel project before enabling beta
invitations. Preview projects must use separate Neon branches and credentials.

## Route controls

Start with the following per-IP limits and tune from observed legitimate
traffic:

| Route                            |          Initial limit | Action     |
| -------------------------------- | ---------------------: | ---------- |
| `/api/auth/sign-in/*`            | 10 requests per minute | Rate limit |
| `/api/auth/sign-up/*`            |    5 requests per hour | Rate limit |
| `/api/auth/forget-password`      |    5 requests per hour | Rate limit |
| `/api/webhooks/neon-auth`        | 60 requests per minute | Rate limit |
| `/api/account/export`            |    3 requests per hour | Rate limit |
| `/api/account/delete`            |    5 requests per hour | Rate limit |
| `/api/cron/monthly-budget-close` |    5 requests per hour | Rate limit |

Do not cache any of these routes. Monitor `401`, `403`, `429`, and `5xx` rates
without recording request bodies, authorization headers, email addresses, or
financial data.

The webhook is also protected by detached-JWS verification and timestamp
freshness. The cron route is also protected by a random Bearer secret. Firewall
rules are defense in depth, not replacements for those checks.

## Database network access

Neon IP Allow is useful only when the application has stable outbound
addresses. Enable Vercel Secure Compute or another stable-egress option first,
then allowlist only those addresses and operator break-glass sources. Do not
allowlist all Vercel ranges.
