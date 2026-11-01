# Backend Access Control Flow (Session + API Mapping)

## Purpose

This document explains how backend access control now works end-to-end:

- `UserRole` is still used for authentication authorities.
- Actual API permission enforcement is done by **Access-to-API mapping** (`access_has_apis`).
- Per-user allowed API IDs are cached in **HTTP session** for low latency.
- Unauthorized API use returns custom status `460` with message `Access Not Granted`.

---

## Main Components

1. `JwtAuthFilter`
   - File: `src/main/java/com/kaleox/deliveryya/filters/JwtAuthFilter.java`
   - Validates JWT and sets authenticated principal in Spring Security context.
   - Skips all paths in `SecurityConfig.PUBLIC_PATTERNS`.

2. `ApiAccessControlInterceptor`
   - File: `src/main/java/com/kaleox/deliveryya/filters/ApiAccessControlInterceptor.java`
   - Enforces API permission for authenticated requests.
   - Maps current request (`method + path`) to `apis.id`.
   - Checks if mapped `apiId` is in session-cached allowed API IDs.

3. `AccessController#getAccessDetails`
   - Endpoint: `GET /api/v1/access/get-access-details`
   - File: `src/main/java/com/kaleox/deliveryya/controller/AccessController.java`
   - Loads user access IDs and derived API IDs, stores both in session.

4. `AccessServiceImpl`
   - File: `src/main/java/com/kaleox/deliveryya/service/impl/AccessServiceImpl.java`
   - `getAccessDetailsByUser(userId)`: merges user direct accesses + role accesses, removes expired ones.
   - `getFullAccessDetailsByUser(accessIds)`: returns only API IDs linked to those accesses.

5. `GlobalExceptionHandler` + `AccessNotGrantedException`
   - Files:
     - `src/main/java/com/kaleox/deliveryya/config/GlobalExceptionHandler.java`
     - `src/main/java/com/kaleox/deliveryya/config/AccessNotGrantedException.java`
   - Returns custom HTTP status `460` for denied backend access.

---

## Request Lifecycle

## 1) Incoming request

Client calls any API endpoint with `Authorization: Bearer <token>`.

---

## 2) JWT filter stage (`JwtAuthFilter`)

### Public route bypass

For every request, the filter first checks path against `SecurityConfig.PUBLIC_PATTERNS`.
If matched, it directly does `filterChain.doFilter(...)` and returns.

That means public routes pass through **without JWT validation and without auth context setup**, as intended.

### Protected route handling

If route is not public:

1. Reads bearer token.
2. Parses claims (`JwtUtil.parse(...)`).
3. Loads user details from `AuthService`.
4. Sets `UsernamePasswordAuthenticationToken` in `SecurityContextHolder`.
5. Continues chain.

If token is invalid/expired, it returns `401`.

---

## 3) Spring MVC interceptor stage (`ApiAccessControlInterceptor`)

The interceptor executes before controller methods.

### Skip conditions

It immediately allows request when:

- handler is not a controller `HandlerMethod`
- method is `OPTIONS`
- path is `/error`
- path is `/api/v1/access/get-access-details` (to avoid blocking bootstrap call)
- path matches `SecurityConfig.PUBLIC_PATTERNS`

So excluded/public routes also bypass access enforcement.

### Auth principal extraction

For protected routes, interceptor reads `SecurityContextHolder.getContext().getAuthentication()`.
If authenticated, it extracts `userId` from principal (`UserDetails#getUsername()`).

### Request route -> API ID resolution

It resolves current request into `apis.id`:

- key: `METHOD:/path`
- uses in-memory cache `requestApiIdCache` for fast repeat lookups
- if cache miss, finds best match from cached API routes (`apiRouteCache`) using `AntPathMatcher`
- supports template paths (`/api/v1/users/{id}` style)
- prefers longest matching route pattern

If no API mapping exists in `apis` table, request is allowed (no access mapping to enforce).

### Session permission check

Session key used:

- Access IDs: `ACCESS_IDS_<userId>`
- API IDs: `ACCESS_API_IDS_<userId>`

Flow:

1. Try read `ACCESS_API_IDS_<userId>` from session.
2. If missing:
   - load access IDs from DB via `getAccessDetailsByUser(userId)`
   - derive API IDs via `getFullAccessDetailsByUser(accessIds)`
   - write both to session
3. Check if resolved `apiId` is inside user API ID set.

If not present, throw `AccessNotGrantedException("Access Not Granted", errors)`.

---

## 4) Access resolution logic in service layer

## `getAccessDetailsByUser(userId)`

1. Load user.
2. Load direct `user_has_access` rows.
3. Remove expired rows (`exp < now`) from DB.
4. Add non-expired direct access IDs.
5. Load role-based accesses from `access_has_user_roles`.
6. Merge all as unique `Set<Integer>`.

## `getFullAccessDetailsByUser(accessIds)`

1. Query `access_has_apis` by all access IDs.
2. Extract linked `api.id`.
3. Return unique set of API IDs.

This method intentionally returns only IDs (not full DTO tree) to reduce cost.

---

## 5) Exception response for denied access

When denied, interceptor throws `AccessNotGrantedException`.

`GlobalExceptionHandler` catches it and returns:

- HTTP status: `460` (custom, non-standard)
- body:
  - `status: 460`
  - `message: "Error"`
  - `desc: "Access Not Granted"`
  - `exData`: contains request `path` and `method`

---

## Why This Is Low-Latency

1. Session caches user API IDs (`ACCESS_API_IDS_<userId>`), avoiding repeated joins for every request.
2. Route-to-API resolution uses in-memory caches:
   - `apiRouteCache` for all API route records
   - `requestApiIdCache` for repeated exact request paths
3. Service path for cache miss fetches only required IDs, not full access graph.

---

## Operational Notes

1. Client must keep/send `JSESSIONID` cookie to benefit from session caching.
2. If access grants are changed, refresh by calling:
   - `GET /api/v1/access/get-access-details`
3. Public routes are bypassed in both:
   - `JwtAuthFilter`
   - `ApiAccessControlInterceptor`
4. Endpoint must exist in `apis` table for enforcement.

---

## Quick Example

1. User logs in and calls `GET /api/v1/access/get-access-details`.
2. Session gets:
   - `ACCESS_IDS_15 = [1, 2, 7]`
   - `ACCESS_API_IDS_15 = [3, 4, 10, 21]`
3. User calls `POST /api/v1/orders/set-order`.
4. Interceptor resolves this route to `apiId=21`.
5. `21` exists in `ACCESS_API_IDS_15` -> request allowed.
6. If route maps to `apiId=30` and not in set -> `460 Access Not Granted`.

