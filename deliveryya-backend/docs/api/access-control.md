# Access Controller API Documentation

## Base URL
``` 
/api/v1/access
```

## Overview
The Access Controller provides endpoints for managing user access controls, including retrieving, creating, updating, and linking access permissions with APIs. It also handles role-based access and user-specific access management.

---

## Endpoints

### 1. Get All Accesses (Paginated)
**Endpoint:** `POST /get-all`

**Description:** Retrieve paginated list of accesses with optional filtering and enrichment options.

**Authorization:** public (no authorization required)

**Request Body:**
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "accessId": null,
  "accessTypeId": null,
  "accessLevelId": null,
  "userRoleId": null,
  "userId": null,
  "apiIds": [],
  "includeLinkedApis": true,
  "includeGrantMeta": true,
  "search": null
}
```

**Request Parameters:**
- `pageNumber` (Integer, required): Page number (0-indexed)
- `countPerPage` (Integer, required): Records per page
- `accessId` (Integer, optional): Filter by specific access ID
- `accessTypeId` (Integer, optional): Filter by access type
- `accessLevelId` (Integer, optional): Filter by access level
- `userRoleId` (Integer, optional): Filter accesses assigned to a specific user role
- `userId` (Integer, optional): Filter accesses assigned to a specific user
- `apiIds` (Array of Integer, optional): Filter accesses that are linked to at least one of the provided API IDs via `access_has_apis`
- `includeLinkedApis` (Boolean, optional): Include linked APIs for each access
- `includeGrantMeta` (Boolean, optional): Include grant metadata (createdAt, updatedAt, exp, etc.)
- `search` (String, optional): Search by access name or description

**Response:**
```json
{
  "message": "Success",
  "desc": "Accesses fetched successfully",
  "object": {
    "pageNumber": 0,
    "countPerPage": 10,
    "totalCount": 5,
    "totalPages": 1,
    "items": [
      {
        "id": 1,
        "name": "View Reports",
        "desc": "Permission to view reports",
        "accessLevel": {
          "id": 1,
          "name": "User"
        },
        "accessType": {
          "id": 1,
          "name": "Read"
        },
        "apis": [
          {
            "id": 1,
            "name": "GET /reports",
            "desc": "Fetch reports",
            "apiMethod": {
              "id": 1,
              "name": "GET"
            },
            "apiFeatures": [
              { "id": 1, "name": "View" },
              { "id": 2, "name": "Export" }
            ]
          }
        ],
        "createdAt": "2025-05-06T10:00:00",
        "updatedAt": "2025-05-06T10:00:00",
        "createdBy": "admin",
        "updatedBy": "admin",
        "exp": null
      }
    ]
  }
}
```

**Status Codes:**
- `200 OK`: Successfully retrieved accesses

---

### 2. Get All APIs (Paginated)
**Endpoint:** `POST /get-all-apis`

**Description:** Retrieve a paginated list of APIs. When `accessId` is provided, the result is limited to APIs linked to that access and the response includes the saved access-specific feature IDs and names.

**Authorization:** public (no authorization required)

**Request Body:**
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "accessId": null,
  "search": null
}
```

**Request Parameters:**
- `pageNumber` (Integer, required): Page number (0-indexed)
- `countPerPage` (Integer, required): Records per page
- `accessId` (Integer, optional): If provided, return only APIs linked to this access
- `search` (String, optional): Case-insensitive partial match against API `name`, `desc`, or HTTP method name

**Response:**
```json
{
  "message": "Success",
  "desc": "Apis fetched successfully",
  "object": {
    "pageNumber": 0,
    "countPerPage": 10,
    "totalCount": 2,
    "totalPages": 1,
    "items": [
      {
        "id": 5,
        "name": "GET /reports",
        "desc": "Fetch reports",
        "apiMethod": {
          "id": 1,
          "name": "GET"
        },
        "apiFeatures": [
          { "id": 10, "name": "View" },
          { "id": 11, "name": "Export" }
        ]
      }
    ]
  }
}
```

**Notes:**
- If `accessId` is not supplied, the endpoint returns all APIs in the system.
- If `accessId` is supplied, the endpoint returns only APIs that are linked in `access_has_apis` for that access.
- `apiFeatures` reflects the stored feature IDs for the API link (resolved as id/name) when `accessId` is used.

**Status Codes:**
- `200 OK`: Successfully retrieved APIs

---

### 3. Get Access Types
**Endpoint:** `GET /get-access-types`

**Description:** Retrieve a list of all access types, or a specific access type by ID.

**Authorization:** public (no authorization required)

**Request Parameters:**
- `accessTypeId` (Integer, optional): Filter by specific access type ID

**Response:**
```json
{
  "message": "Success",
  "desc": "Access types fetched successfully",
  "object": [
    {
      "id": 1,
      "name": "Read"
    },
    {
      "id": 2,
      "name": "Write"
    }
  ]
}
```

**Status Codes:**
- `200 OK`: Successfully retrieved access types
- `404 Not Found`: Access type not found (if `accessTypeId` is provided and not found)

---

### 4. Get API Features
**Endpoint:** `GET /get-api-features`

**Description:** Retrieve a list of all API features, or filter by API feature ID or API ID.

**Authorization:** public (no authorization required)

**Request Parameters:**
- `apiFeatureId` (Integer, optional): Filter by specific API feature ID
- `apiId` (Integer, optional): Filter by API ID to get features belonging to that API

**Response:**
```json
{
  "message": "Success",
  "desc": "Api features fetched successfully",
  "object": [
    {
      "id": 1,
      "name": "View",
      "desc": "Permission to view data",
      "apiId": 5
    },
    {
      "id": 2,
      "name": "Export",
      "desc": "Permission to export data",
      "apiId": 5
    }
  ]
}
```

**Status Codes:**
- `200 OK`: Successfully retrieved API features
- `404 Not Found`: API feature or API not found (if `apiFeatureId` or `apiId` is provided and not found)

---

### 5. Get All Access Granted Users (Paginated)
**Endpoint:** `POST /get-all-access-granted-users`

**Description:** Retrieve a paginated list of distinct users who have records in `user_has_access`, without repeating the same user multiple times. Supports filtering by access ID and expiration state.

**Authorization:** `ROLE_ADMIN`, `ROLE_SUPPER ADMIN`, `ROLE_MANAGER`, `ROLE_OWNER`

**Request Body:**
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "accessId": null,
  "expired": null,
  "notExpired": null,
  "expiredFrom": null,
  "expiredAt": null
}
```

**Request Parameters:**
- `pageNumber` (Integer, required): Page number (0-indexed)
- `countPerPage` (Integer, required): Records per page
- `accessId` (Integer, optional): Return only users who have the specified access ID in `user_has_access`
- `expired` (Boolean, optional): Return only users whose matching access records are expired (`exp` < current time)
- `notExpired` (Boolean, optional): Return only users whose matching access records are not expired (`exp` is null or `exp` >= current time)
- `expiredFrom` (DateTime, optional): Filter matching access records with `exp` greater than or equal to this value
- `expiredAt` (DateTime, optional): Filter matching access records with `exp` less than or equal to this value

**Response:**
```json
{
  "message": "Success",
  "desc": "Granted users fetched successfully",
  "object": {
    "pageNumber": 0,
    "countPerPage": 10,
    "totalCount": 2,
    "totalPages": 1,
    "accessId": 5,
    "expired": null,
    "notExpired": true,
    "expiredFrom": null,
    "expiredAt": null,
    "items": [
      {
        "id": 1,
        "firstName": "John",
        "lastName": "Doe",
        "dob": "1995-01-01",
        "profileImg": null,
        "nic": "123456789V",
        "email": "john@example.com",
        "password": null,
        "isActive": true,
        "verificationStatus": {
          "id": 1,
          "name": "Verified"
        },
        "gender": {
          "id": 1,
          "name": "Male"
        },
        "userRole": {
          "id": 2,
          "name": "Manager"
        },
        "isEmployee": false,
        "emailVerified": true,
        "isDeleted": false,
        "createdAt": "2025-05-06T10:00:00",
        "updatedBy": "admin"
      }
    ]
  }
}
```

**Notes:**
- Users are returned distinctly even if they have multiple access rows.
- If both `expired` and `notExpired` are `true`, the request is rejected.
- `expiredFrom` and `expiredAt` are applied as inclusive bounds on the access expiration timestamp.

**Status Codes:**
- `200 OK`: Successfully retrieved granted users
- `400 Bad Request`: Conflicting expiration filters or invalid input

---

### 6. Grant or Revoke Access to User Role
**Endpoint:** `POST /grant-access-to-user-role`

**Description:** Grant or revoke one or more accesses for a user role based on `grantAccess`.

**Authorization:** `ROLE_ADMIN`, `ROLE_SUPPER ADMIN`, `ROLE_MANAGER`, `ROLE_OWNER`

**Request Body:**
```json
{
  "userRoleId": 1,
  "accessIds": [1, 2, 3],
  "grantAccess": true
}
```

**Response:**
```json
{
  "message": "Success",
  "desc": "Access granted to user role successfully"
}
```

**Status Codes:**
- `200 OK`: Successfully granted or revoked access
- `404 Not Found`: User role not found

**Notes:**
- `grantAccess` is required and cannot be null.
- If `accessIds` is an empty array, the request applies to all accesses in the system.
- When `grantAccess=true`, all selected accesses are granted to the role.
- When `grantAccess=false`, all selected accesses are revoked from the role.

---

### 7. Get Granted Accesses by User Role ID
**Endpoint:** `GET /get-granted-accesses-by-user-role-id?userRoleId={userRoleId}`

**Description:** Retrieve all accesses assigned to a specific user role with their linked APIs.

**Authorization:** `ROLE_ADMIN`, `ROLE_SUPPER ADMIN`, `ROLE_MANAGER`, `ROLE_OWNER`

**Request Parameters:**
- `userRoleId` (Integer, required): User role ID (must be >= 1)

**Response:**
```json
{
  "message": "Success",
  "desc": "GrantedAccesses retrieved successfully",
  "object": [
    {
      "id": 1,
      "name": "View Reports",
      "desc": "Permission to view reports",
      "accessType": {
        "id": 1,
        "name": "Read"
      },
      "accessLevel": {
        "id": 1,
        "name": "User"
      },
      "createdAt": "2025-05-06T10:00:00",
      "updatedAt": "2025-05-06T10:00:00",
      "createdBy": "admin",
      "updatedBy": "admin",
      "apis": [
        {
          "id": 1,
          "name": "GET /reports",
          "desc": "Fetch reports",
          "apiMethod": {
            "id": 1,
            "name": "GET"
          },
          "apiFeatures": [
            { "id": 1, "name": "View" },
            { "id": 2, "name": "Export" }
          ]
        }
      ]
    }
  ]
}
```

**Status Codes:**
- `200 OK`: Successfully retrieved accesses
- `404 Not Found`: User role not found

---

### 8. Get Granted Accesses by User ID
**Endpoint:** `GET /get-granted-accesses-by-user-id?userId={userId}`

**Description:** Retrieve all accesses assigned to a specific user with their linked APIs.

**Authorization:** `ROLE_ADMIN`, `ROLE_SUPPER ADMIN`, `ROLE_MANAGER`, `ROLE_OWNER`

**Request Parameters:**
- `userId` (Integer, required): User ID (must be >= 1)

**Response:**
```json
{
  "message": "Success",
  "desc": "GrantedAccesses retrieved successfully",
  "object": [
    {
      "id": 1,
      "name": "View Reports",
      "desc": "Permission to view reports",
      "accessType": {
        "id": 1,
        "name": "Read"
      },
      "accessLevel": {
        "id": 1,
        "name": "User"
      },
      "createdAt": "2025-05-06T10:00:00",
      "updatedAt": "2025-05-06T10:00:00",
      "createdBy": "admin",
      "updatedBy": "admin",
      "exp": "2026-12-31T23:59:59",
      "apis": [
        {
          "id": 1,
          "name": "GET /reports",
          "desc": "Fetch reports",
          "apiMethod": {
            "id": 1,
            "name": "GET"
          },
          "apiFeatures": [
            { "id": 1, "name": "View" },
            { "id": 2, "name": "Export" }
          ]
        }
      ]
    }
  ]
}
```

**Status Codes:**
- `200 OK`: Successfully retrieved accesses
- `404 Not Found`: User not found

---

### 9. Grant or Revoke Access to User
**Endpoint:** `POST /grant-access-to-user`

**Description:** Grant or revoke one or more accesses for a specific user.

**Authorization:** `ROLE_ADMIN`, `ROLE_SUPPER ADMIN`, `ROLE_MANAGER`, `ROLE_OWNER`

**Request Body:**
```json
{
  "usersId": 1,
  "accessIds": [1, 2, 3],
  "grantAccess": true,
  "exp": "2026-12-31T23:59:59"
}
```

**Response:**
```json
{
  "message": "Success",
  "desc": "Access granted to user successfully"
}
```

**Status Codes:**
- `200 OK`: Successfully granted or revoked access
- `404 Not Found`: User not found

**Notes:**
- `grantAccess` is required and cannot be null.
- When `grantAccess=true`, `exp` is required and must be a future date/time.
- When `grantAccess=false`, `exp` is ignored.
- If `accessIds` is an empty array, the request applies to all accesses in the system.
- When `grantAccess=true`, the selected accesses are granted to the user with the supplied expiration date.
- When `grantAccess=false`, the selected accesses are revoked from the user.

---

### 10. Create Access
**Endpoint:** `POST /create-access`

**Description:** Create a new access permission.

**Authorization:** `ROLE_ADMIN`, `ROLE_SUPPER ADMIN`

**Request Body:**
```json
{
  "name": "View Reports",
  "desc": "Permission to view reports",
  "accessLevelId": 1,
  "accessTypeId": 1
}
```

**Request Parameters:**
- `name` (String, required, non-blank): Access name
- `desc` (String, required, non-blank): Access description
- `accessLevelId` (Integer, required, >= 1): Access level ID
- `accessTypeId` (Integer, required, >= 1): Access type ID

**Response:**
```json
{
  "message": "Success",
  "desc": "Access created successfully",
  "object": 5
}
```

**Status Codes:**
- `200 OK`: Successfully created access (returns new access ID)
- `400 Bad Request`: Invalid input
- `404 Not Found`: Access level or type not found

---

### 11. Set Access (Update)
**Endpoint:** `POST /set-access`

**Description:** Update an existing access permission.

**Authorization:** `ROLE_ADMIN`, `ROLE_SUPPER ADMIN`

**Request Body:**
```json
{
  "accessId": 1,
  "name": "View Reports - Updated",
  "desc": "Permission to view and export reports",
  "accessLevelId": 2,
  "accessTypeId": 2
}
```

**Request Parameters:**
- `accessId` (Integer, required, >= 1): ID of access to update
- `name` (String, required, non-blank): Updated access name
- `desc` (String, required, non-blank): Updated access description
- `accessLevelId` (Integer, required, >= 1): Updated access level ID
- `accessTypeId` (Integer, required, >= 1): Updated access type ID

**Response:**
```json
{
  "message": "Success",
  "desc": "Access updated successfully"
}
```

**Status Codes:**
- `200 OK`: Successfully updated access
- `400 Bad Request`: Invalid input
- `404 Not Found`: Access, access level, or access type not found

---

### 12. Link Access with API
**Endpoint:** `POST /link-access-with-api`

**Description:** Create or remove a link between an access and an API endpoint.

**Authorization:** `ROLE_ADMIN`, `ROLE_SUPPER ADMIN`

**Request Body:**
```json
{
  "accessId": 1,
  "apiId": 5,
  "apiFeatureIds": [10, 11],
  "grant": true
}
```

**Request Parameters:**
- `accessId` (Integer, required, >= 1): Access ID
- `apiId` (Integer, required, >= 1): API endpoint ID
- `apiFeatureIds` (Array of Integer, optional): Feature IDs to store on the link when creating it
- `grant` (Boolean, required): If `true`, links the access with the API. If `false`, unlinks them.

**Response:**
```json
{
  "message": "Success",
  "desc": "Access linked with api successfully"
}
```

**Status Codes:**
- `200 OK`: Successfully linked or unlinked
- `404 Not Found`: Access or API not found
- `400 Bad Request`: Invalid API feature IDs (e.g., not belonging to the API)

**Notes:**
- If `grant` is `true` and a link already exists, it will be updated with the new `apiFeatureIds`.
- If `grant` is `false` and a link exists, it will be removed. If no link exists, no action is taken.
- When creating or updating a link, any provided `apiFeatureIds` are validated against the selected API and saved on the link.

---

### 13. Remove API Features for API
**Endpoint:** `POST /remove-api-features-for-api`

**Description:** Remove selected feature IDs from an existing access-API link without deleting the link itself.

**Authorization:** `ROLE_ADMIN`, `ROLE_SUPPER ADMIN`

**Request Body:**
```json
{
  "accessId": 1,
  "apiId": 5,
  "apiFeatureIds": [10, 11]
}
```

**Request Parameters:**
- `accessId` (Integer, required, >= 1): Access ID
- `apiId` (Integer, required, >= 1): API endpoint ID
- `apiFeatureIds` (Array of Integer, required): Feature IDs to remove from the link

**Response:**
```json
{
  "message": "Success",
  "desc": "Api features removed successfully"
}
```

**Notes:**
- The access/API link must already exist.
- Removed feature IDs must belong to the selected API.
- Requested feature IDs must currently be linked; otherwise the request is rejected.
- Any remaining feature IDs on the link are preserved.

**Status Codes:**
- `200 OK`: Successfully removed the requested feature IDs
- `400 Bad Request`: Invalid input or feature validation failed
- `404 Not Found`: Access, API, or link not found

---

### 14. Set API Features for API
**Endpoint:** `POST /set-api-features-for-api`

**Description:** Assign specific features of an API to an access-API link. This replaces any existing API features for that link.

**Authorization:** `ROLE_ADMIN`, `ROLE_SUPPER ADMIN`

**Request Body:**
```json
{
  "accessId": 1,
  "apiId": 5,
  "apiFeatureIds": [10, 11, 12]
}
```

**Request Parameters:**
- `accessId` (Integer, required, >= 1): Access ID
- `apiId` (Integer, required, >= 1): API endpoint ID
- `apiFeatureIds` (Array of Integer, required): List of API feature IDs to assign

**Response:**
```json
{
  "message": "Success",
  "desc": "Api features updated successfully"
}
```

**Validation:**
- All feature IDs must exist
- All features must belong to the specified API
- Features are deduplicated and filtered for null values

**Status Codes:**
- `200 OK`: Successfully set API features
- `400 Bad Request`: Invalid input or feature ID validation failed
- `404 Not Found`: Access, API, or API features not found

---

### 15. Get Access Details
**Endpoint:** `GET /get-access-details`

**Description:** Retrieve all non-expired access IDs for the authenticated user. Combines accesses from direct user assignment and user role assignments. Automatically deletes expired accesses.

**Authorization:**
- `ROLE_SUPER_ADMIN`
- `ROLE_ADMIN`
- `ROLE_OWNER`
- `ROLE_MANAGER`
- `ROLE_CLIENT`
- `ROLE_MARKET_OWNER`
- `ROLE_SECRETORY`
- `ROLE_ACCOUNTS_MANAGER`
- `ROLE_ACCOUNT_ASSISTANT`
- `ROLE_MARKETS_MANAGER`

**Authentication:** Required (uses UserDetails from security context)

**Response:**
```json
{
  "message": "Success",
  "desc": "Access details fetched successfully",
  "object": [1, 2, 3, 5, 7]
}
```

**Process:**
1. Extract user ID from authentication principal (UserDetails.getUsername())
2. Fetch all direct user accesses from `user_has_access` table
3. Filter and remove expired accesses (where `exp` < current time)
4. Delete expired access records from database
5. Fetch all accesses assigned to user's role from `access_has_user_roles`
6. Combine both sets without duplicates
7. Return unique access IDs as a Set

**Status Codes:**
- `200 OK`: Successfully retrieved access details
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: User not found in database

---

### 16. Get Location Google Map Short Link
**Endpoint:** `GET /get-location-google-map-short-link?shortLink={shortLink}`

**Description:** Expand a shortened Google Maps URL and extract location details.

**Authorization:** public (no authorization required)

**Request Parameters:**
- `shortLink` (String, required, non-empty): Shortened Google Maps URL

**Response:**
```json
{
  "message": "Success",
  "desc": "Google map short link fetched successfully",
  "object": {
    "expandedUrl": "https://www.google.com/maps/place/...",
    "viewportLat": "6.9271",
    "viewportLng": "80.7744",
    "zoom": "10",
    "markerLat": "6.9271",
    "markerLng": "80.7744"
  }
}
```

**Status Codes:**
- `200 OK`: Successfully expanded link
- `400 Bad Request`: Invalid or empty short link
- `502 Bad Gateway`: Failed to expand the short link

---

## Error Responses

All error responses follow this format:

```json
{
  "message": "Error",
  "desc": "Error description",
  "object": null
}
```

### Common Error Messages:
- "User not found": Specified user ID does not exist
- "User role not found": Specified user role ID does not exist
- "Access not found": Specified access ID does not exist
- "One or more accesses were not found": One or more requested access IDs do not exist
- "Api not found": Specified API ID does not exist
- "Access level not found": Specified access level ID does not exist
- "Access type not found": Specified access type ID does not exist
- "One or more api features were not found": Some feature IDs don't exist
- "One or more api features do not belong to the selected api": Features don't match the API
- "Access is not linked with api": No existing link between access and API
- "Api feature ids are required": When removing API features, the list cannot be empty.
- "One or more api features are not linked with the selected api": When removing API features, some requested features are not currently linked.
- "Expired and notExpired filters cannot be true at the same time": Conflicting expiration filters for paginated granted users
- "Failed to expand the short link": Google Maps short link could not be expanded.
- "Expiration date is required when grantAccess is true": A user grant request is missing `exp`.
- "Expiration date must be in the future": The supplied expiration date is invalid.

---

## Filter Combinations

### Paginated Access Retrieval Filters:
- **accessId**: Returns single access (takes precedence)
- **apiIds**: Returns accesses that are linked to at least one of the provided API IDs
- **accessTypeId**: Filter by access type
- **accessLevelId**: Filter by access level
- **userRoleId**: Filter accesses assigned to a specific role
- **userId**: Filter accesses assigned to a specific user
- **search**: Search by name or description (case-insensitive)

### Paginated API Retrieval Filters:
- **accessId**: Returns APIs linked to a specific access ID
- **search**: Case-insensitive partial match on API name, description, or API method name

### Paginated Granted Users Filters:
- **accessId**: Return users that have the specified access ID in `user_has_access`
- **expired**: Limit results to expired access rows only
- **notExpired**: Limit results to non-expired access rows only
- **expiredFrom**: Inclusive lower bound on access expiration timestamp
- **expiredAt**: Inclusive upper bound on access expiration timestamp

Multiple filters are combined with AND logic except:
- If `includeGrantMeta=true` with both `userId` and `userRoleId`, user-specific metadata is applied first
- If both filters are present, role metadata serves as fallback for missing user metadata
- For granted users, `expired=true` and `notExpired=true` is treated as an invalid conflict

---

## Notes

1. **Expired Accesses**: The `/get-access-details` endpoint automatically cleans up expired user accesses during retrieval
2. **No Duplicates**: Access IDs are returned as a Set to ensure uniqueness
3. **Role-Based Access**: User roles inherit access permissions automatically
4. **API Features**: Features can be scoped to specific accesses and APIs
5. **Authorization**: All write operations (create, update, link, remove features, set features) are restricted to admin/supper admin roles
6. **Pagination**: Default page size should be configurable, starting page is 0

---

## Dependencies

- Spring Security for authorization
- JPA/Hibernate for data persistence
- Lombok for entity annotations
- Apache HTTP Client for URL expansion

---

## Last Updated
May 15, 2024
