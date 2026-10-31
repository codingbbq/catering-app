# Security

## Security priorities

- Tenant isolation
- Authentication and authorization correctness
- Protection of customer and financial data
- Auditability of sensitive administrative actions
- Safe handling of external provider secrets

## Tenant isolation requirements

- Every tenant-scoped read and write must be bound to tenant context
- Cross-tenant access must be denied by default
- Super Admin access must be implemented as platform-level authorization, not tenant-role escalation
- Exports, search, and reporting must not combine tenant data unless a platform route explicitly requires it

## Identity and access requirements

- Use strong authenticated sessions
- Separate platform roles from tenant roles
- Support user deactivation and invitation lifecycle
- Protect administrative operations with authorization checks and audit logs

## Data protection requirements

- Never commit secrets
- Load configuration from environment variables with safe defaults where possible
- Minimize sensitive data in logs
- Use HTTPS in deployed environments
- Hash passwords or use a managed auth flow that avoids plaintext credential handling

## API security requirements

- Validate all inputs
- Normalize authorization failures
- Apply rate limiting later on authentication and public-facing endpoints if needed
- Avoid exposing internal IDs where a safer public identifier is preferable

## External integration security

- Store provider credentials securely
- Isolate provider-specific logic behind service abstractions
- Persist message metadata carefully to avoid leaking secrets or raw provider payloads unnecessarily

## Audit requirements

Record audit events for:

- tenant creation, suspension, and activation
- user invitation, role changes, and deactivation
- quotation approval or acceptance transitions if approval is introduced
- booking confirmation changes
- invoice and payment changes

## Operational security concerns

- Ensure backups and restoration procedures protect tenant separation
- Review Prisma migrations carefully before production use
- Use least privilege for database access in deployed environments

## Open security questions

- Whether MFA is required for Super Admin users in the first production release
- Whether tenant owners need IP/device restrictions for high-risk operations
- Whether communication provider webhooks will be introduced and how they should be verified
