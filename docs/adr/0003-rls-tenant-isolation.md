---
status: accepted
---

# Enforce tenant isolation with least-privilege RLS

Production tables containing user-owned data will use default-deny row-level security keyed to the authenticated tenant, with application authorization as defense in depth rather than the sole boundary. Elevated service and Operator access must be narrowly scoped, separated from normal user paths, and audited; schema changes are incomplete until their RLS policies and cross-tenant denial tests exist.
