---
status: accepted
---

# Keep the confidentiality boundary server-side

The authenticated server application and managed production database form the confidentiality boundary for Financial Records. Version 1 will rely on transport encryption, managed storage encryption, strict authorization, tenant isolation, and audited privileged access rather than application-level field encryption; field encryption would add key-management and query complexity without protecting data from a compromised authorized server, and must be reconsidered if the threat model or legal review requires protection from the database or infrastructure operator.
