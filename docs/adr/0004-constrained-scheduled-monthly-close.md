---
status: accepted
---

# Constrain the scheduled monthly close

The scheduler may invoke only a dedicated, idempotent monthly-close operation scoped to an explicit tenant and period; it must not receive arbitrary query capability or broad mutation authority. Eligibility rules remain inside the operation, while least-privilege credentials, bounded retries, duplicate-run protection, and an audit record limit the impact of scheduler compromise or failure.
