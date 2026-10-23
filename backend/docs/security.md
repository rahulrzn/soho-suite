# API authentication policy

All application routes require a Firebase ID token except HTTP `OPTIONS` preflight requests. There are currently no public API routes. Unknown routes also pass through the authenticated policy. Actuator endpoints are not exposed by this application configuration.

CORS allows the Vite development and preview origins (`http://localhost:5173` and `http://localhost:4173`) by default. Set `CORS_ALLOWED_ORIGINS` to a comma-separated list for deployed frontend origins. Credentials are disabled; the frontend sends its Firebase bearer token explicitly.

The stateless Spring Security filter verifies bearer tokens with Firebase Admin SDK and revocation checking enabled. The resulting `VerifiedFirebaseIdentity` is the authenticated principal. Client supplied UID, local user ID, email, and role values do not establish caller identity. Business membership and role decisions remain database backed in `BusinessService`.

Unverified identities may read their own profile lookup (`GET /api/users/me`) and check username availability to finish profile setup. Profile creation, profile updates, and all business operations require a non-empty verified email. Profile lookup can return not found until profile provisioning completes. The frontend must continue to perform Firebase email verification and client-side sign out; backend sign out is not meaningful for a Firebase client and does not revoke already issued ID tokens. Protected requests continue to reject revoked tokens.
