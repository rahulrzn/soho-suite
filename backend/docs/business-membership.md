# Business membership and permissions

Each user belongs to at most one business. `users.business_id` stores the relationship;
`users.business_role` stores OWNER, MANAGER or VIEWER as a string. Users without a business
have no business role. Firebase authenticates callers; PostgreSQL membership authorizes them.

| Operation | Owner | Manager | Viewer |
| --- | --- | --- | --- |
| Read own business and member list | Yes | Yes | Yes |
| Update business details | Yes | Yes | No |
| Add/remove members or change roles | Yes | No | No |
| Delete business | Yes | No | No |

Creating a business requires an existing local user profile without business membership.
The creator is assigned OWNER in the same transaction. A supplied business ID is never used:
the business request DTO only accepts editable details. Listing businesses returns only the
caller's business (or an empty array). All business routes require a Firebase ID token.

## Membership endpoints

- GET `/api/businesses/{id}/members`: member IDs, usernames, names and roles; no Firebase UID/email.
- POST `/api/businesses/{id}/members`: `{"userId":2,"role":"VIEWER"}` assigns an existing local user.
- PATCH `/api/businesses/{id}/members/{userId}/role`: `{"role":"MANAGER"}`.
- DELETE `/api/businesses/{id}/members/{userId}`: removes membership, preserving the user profile.

Only MANAGER and VIEWER can be assigned. Ownership transfer and owner removal/demotion are
not supported. Owners can delete their business; deletion clears all memberships and roles
before deleting the business, within one transaction. Adding a user already in any business
returns 409 MEMBERSHIP_CONFLICT. Unauthorized operations return 403 FORBIDDEN.

This is direct assignment of existing users by their local user ID, not an email invitation
or acceptance workflow. New users must first complete their profile. Their ID is in the
`/api/users/me` response. Multiple-business membership is not implemented.

## Database rollout

No live database changes were performed for this implementation. The current application uses
`ddl-auto=none`; Flyway owns schema changes. V1 defines the nullable `business_role` column and its
check constraint, so do not rely on Hibernate to add it or manually alter the schema outside the
reviewed migration path. Do not infer ownership for existing businesses: explicitly backfill roles after reviewing
the legitimate owner/members. Existing memberships with a null role are denied access.
Businesses with no members need administrative ownership assignment before API access.

Transactional writes lock the business while changing permissions/membership or deleting it.
User locks prevent simultaneous assignment/creation from putting a user into two businesses.
Tests use mocked repositories and Firebase verification; live PostgreSQL lock/rollback behavior
and real Firebase authentication still require integration verification.
