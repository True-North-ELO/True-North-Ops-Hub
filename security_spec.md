# Security Spec for True North Ops Hub

## Data Invariants
- `contexts/{gemId}`: Root of an agent's knowledge base.
- `contexts/{gemId}/files/{fileId}`: Individual documents.
- A user must be authenticated and verified to modify the knowledge base.
- Public read-only access for coworkers on the shared link (if applicable, but for now we prioritize admin security).

## The "Dirty Dozen" Payloads (Deny cases)
1. Creating a file without an authenticated session.
2. Creating a file with a 2MB content string (exhaustion).
3. Spoofing `lastUpdated` with a future date.
4. Modifying a file in a `gemId` that doesn't exist (e.g. `invalid-gem`).
5. Overwriting `type` with an unsupported value.
6. Shadow fields on file creation (e.g. `isSystemAdmin: true`).
7. ID poisoning: Creating a file with a 1KB string as ID.
8. Updating a file's `name` to an empty string.
9. An unverified user trying to write.
10. Attempting to delete a context root document directly.
11. Bypassing size limits on the file listing query.
12. Cross-gem pollution: Pushing RCM data into the SOP context root metadata.

## Rules Draft Strategy
Using a "Master Gate" pattern. `isValidFile` will be the primary validator.
Access to knowledge base is restricted to `aaron.bombich@truenorthllp.com` for admin purposes, while others might have read access if we implement auth for viewers. For now, since it's a prototype hub, we'll enforce admin-only writing.
