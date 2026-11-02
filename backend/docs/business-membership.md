# Business membership and permissions

Users can belong to multiple businesses. `business_membership` is the canonical relationship:
each row stores one user, one business and that business's OWNER, MANAGER or VIEWER role.
The database enforces unique `(business_id, user_id)` pairs. Firebase authenticates callers;
PostgreSQL membership authorizes each request against its requested business.

`users.business_id` and `users.business_role` remain as a compatibility projection for older
profile clients. They point to one default membership and are synchronized when that default is
created, changed, or removed. They are not an authorization source. `GET /api/businesses`
returns every membership's business, ordered by membership creation; the current frontend uses
the first business until a business selector is added.

| Operation | Owner | Manager | Viewer |
| --- | --- | --- | --- |
| Read own business and member list | Yes | Yes | Yes |
| Update business details | Yes | Yes | No |
| Add/remove members or change roles | Yes | No | No |
| Delete business | Yes | No | No |

Creating a business requires an existing local user profile. The creator receives an OWNER
membership in the same transaction; users may create or join additional businesses. A supplied
business ID is never used to establish access: the business request DTO only accepts editable
details. Listing businesses returns only businesses with a persisted membership for the caller.
All business routes require a Firebase ID token.

## Membership endpoints

- GET `/api/businesses/{id}/members`: member IDs, usernames, names and roles; no Firebase UID/email.
- POST `/api/businesses/{id}/members`: `{"userId":2,"role":"VIEWER"}` assigns an existing local user.
- PATCH `/api/businesses/{id}/members/{userId}/role`: `{"role":"MANAGER"}`.
- DELETE `/api/businesses/{id}/members/{userId}`: removes membership, preserving the user profile.

Only MANAGER and VIEWER can be assigned through member management. Ownership transfer and
owner removal/demotion are not supported. Owners can delete their business; deletion removes
that business's memberships transactionally while preserving users' memberships in other
businesses. Adding a user who is already a member of the selected business returns 409
MEMBERSHIP_CONFLICT. Unauthorized operations return 403 FORBIDDEN.

This is direct assignment of existing users by their local user ID, not an email invitation
or acceptance workflow. New users must first complete their profile. Their ID is in the
`/api/users/me` response.

## Database rollout

No live database changes were performed for this implementation. The current application uses
`ddl-auto=none`; Flyway owns schema changes. V1 defines the nullable `business_role` column and its
check constraint, so do not rely on Hibernate to add it or manually alter the schema outside the
reviewed migration path. Do not infer ownership for existing businesses: explicitly backfill roles after reviewing
the legitimate owner/members. Existing memberships with a null role are denied access.
Businesses with no members need administrative ownership assignment before API access.

Transactional writes lock the business while changing permissions/membership or deleting it.
User locks serialize profile-level assignment/creation operations; the unique membership
constraint is the final duplicate guard. Tests use mocked repositories and Firebase verification;
live PostgreSQL lock/rollback behavior and real Firebase authentication still require integration
verification.
