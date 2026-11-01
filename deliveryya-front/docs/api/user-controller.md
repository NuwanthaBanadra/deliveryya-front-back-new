# UserController API

Source: `src/main/java/com/kaleox/deliveryya/controller/UserController.java`
Base path: `/api/v1/users`

## Auth Notes

- Public endpoints from security config:
  - `POST /api/v1/users/sign-up`
  - `POST /api/v1/users/login`
  - `POST /api/v1/users/send-reset-password-email` (intended public flow)
  - `POST /api/v1/users/reset-password-email` (intended public flow)
- All other endpoints require `Authorization: Bearer <token>`.

## Response Envelope

Most endpoints return:

```json
{
  "status": 200,
  "message": "Success",
  "desc": "Description",
  "exData": {},
  "object": {}
}
```

---

## 1) Sign Up

- Method: `POST`
- Path: `/api/v1/users/sign-up`
- Auth: `No`

### Request Body Sample
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dob": "1990-05-15",
  "profileImg": "https://example.com/profile.jpg",
  "nic": "901234567V",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "verificationStatus": { "id": 1, "name": "Pending" },
  "gender": { "id": 1, "name": "Male" },
  "userRole": { "id": 2, "name": "CLIENT" },
  "isEmployee": false,
  "emailVerified": false
}
```

### Response Body Sample
```json
{
  "status": 200,
  "message": "Success",
  "desc": "User registered successfully",
  "object": null
}
```

---

## 2) Login

- Method: `POST`
- Path: `/api/v1/users/login`
- Auth: `No`

### Request Body Sample
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

### Response Body Sample
```json
{
  "status": 200,
  "message": "Success",
  "desc": "Login successful",
  "exData": {
    "token": "JWT_TOKEN_HERE"
  },
  "object": null
}
```

---

## 3) Admin Get User By ID

- Method: `GET`
- Path: `/api/v1/users/admin/get-user-by-id`
- Auth: `Yes`

### Query Params
- `id` (required, min 1)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "status": 200,
  "message": "Success",
  "desc": "User found",
  "object": {
    "id": 5,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "emailVerified": true,
    "userRole": { "id": 2, "name": "CLIENT" }
  }
}
```

---

## 4) Get Current User By Token

- Method: `GET`
- Path: `/api/v1/users/get-user-by-id`
- Auth: `Yes`

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "status": 200,
  "message": "Success",
  "desc": "User found",
  "object": {
    "id": 5,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  }
}
```

---

## 5) Get All User IDs By Filters

- Method: `GET`
- Path: `/api/v1/users/get-all-user-ids`
- Auth: `Yes`

### Query Params
- `isActive` (required)
- `hasMarket` (required)
- `isEmployee` (required)
- `isEmailVerified` (required)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "User ids fetched successfully",
  "object": [5, 9, 12]
}
```

---

## 6) Get Verification Statuses

- Method: `GET`
- Path: `/api/v1/users/get-verification-statuses`
- Auth: `Yes`

### Query Params
- `id` (optional)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Verification statuses fetched successfully",
  "object": [
    { "id": 1, "name": "Pending" },
    { "id": 2, "name": "Verified" }
  ]
}
```

---

## 7) Update User Role Or Delete

- Method: `POST`
- Path: `/api/v1/users/update-user-role-or-delete`
- Auth: `Yes`

### Request Body Sample
```json
{
  "userId": 5,
  "userRoleId": 3,
  "verificationStatusId": 2,
  "isActive": true,
  "isDeleted": false
}
```

### Request Field Notes
- `userId` (required, min 1)
- `userRoleId` (optional, min 1)
- `verificationStatusId` (optional, min 1)
- `isActive` (optional)
- `isDeleted` (optional)
- At least one of `userRoleId`, `verificationStatusId`, `isActive`, or `isDeleted` must be provided.

### Role-Level Security Rules
- Backend resolves the authenticated user from JWT and reads their `userRole.level`.
- If your role level is `4` or lower, you can update any user with this endpoint.
- If your role level is greater than `4`, you can update only users with a lower privilege level than your own.
- If `userRoleId` is provided and your level is greater than `4`, the new role must also be lower privilege than your own level.

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "User updated successfully"
}
```

### Error Response Sample (Unauthorized Role/Level Update)
```json
{
  "status": 409,
  "message": "Error",
  "desc": "Unauthorized role/status update",
  "exData": {
    "userRoleLevel": "You can only update users with lower privilege level than yours"
  }
}
```

---

## 8) Get Cities (Paginated)

- Method: `POST`
- Path: `/api/v1/users/get-cities`
- Auth: `Yes`

### Request Body Sample
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "search": "Colombo"
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Cities fetched successfully",
  "object": {
    "pageNumber": 0,
    "countPerPage": 10,
    "totalCount": 2,
    "totalPages": 1,
    "items": [
      { "id": 1, "name": "Colombo" },
      { "id": 2, "name": "Kandy" }
    ]
  }
}
```

---

## 9) Admin Update User

- Method: `POST`
- Path: `/api/v1/users/admin/update-user`
- Auth: `Yes`

### Request Body Sample
```json
{
  "id": 5,
  "firstName": "John",
  "lastName": "Smith",
  "dob": "1990-05-15",
  "nic": "901234567V",
  "email": "john.smith@example.com",
  "gender": { "id": 1, "name": "Male" },
  "userRole": { "id": 2, "name": "CLIENT" },
  "verificationStatus": { "id": 2, "name": "Verified" }
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Details update successful"
}
```

---

## 10) Update Current User

- Method: `POST`
- Path: `/api/v1/users/update-user`
- Auth: `Yes`

### Request Body Sample
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "dob": "1990-05-15",
  "nic": "901234567V",
  "email": "john.smith@example.com",
  "gender": { "id": 1, "name": "Male" },
  "verificationStatus": { "id": 2, "name": "Verified" }
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Details update successful"
}
```

---

## 11) Get Users (Paginated)

- Method: `POST`
- Path: `/api/v1/users/get-users`
- Auth: `Yes`

### Request Body Sample
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "isActive": true,
  "emailVerified": true,
  "search": "john"
}
```

### Response Body Sample
```json
{
  "status": 200,
  "message": "Success",
  "desc": "Users fetched successfully",
  "object": {
    "pageNumber": 0,
    "countPerPage": 10,
    "totalCount": 1,
    "totalPages": 1,
    "items": [
      {
        "id": 5,
        "firstName": "John",
        "lastName": "Smith",
        "email": "john.smith@example.com"
      }
    ]
  }
}
```

---

## 12) Get User Roles

- Method: `GET`
- Path: `/api/v1/users/get-user-roles`
- Auth: `Yes`

### Query Params
- `id` (optional)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "object": [
    { "id": 1, "name": "SUPER_ADMIN" },
    { "id": 2, "name": "CLIENT" }
  ]
}
```

---

## 13) Get Genders

- Method: `GET`
- Path: `/api/v1/users/get-genders`
- Auth: `Yes`

### Query Params
- `id` (optional)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Genders fetched successfully",
  "object": [
    { "id": 1, "name": "Male" },
    { "id": 2, "name": "Female" }
  ]
}
```

---

## 14) Get Address By ID Or User ID

- Method: `GET`
- Path: `/api/v1/users/get-address-by-id-or-user-id`
- Auth: `Yes`

### Query Params
- `defaultAddress` (optional)
- `addressId` (optional, min 1)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "status": 200,
  "message": "Success",
  "object": [
    {
      "id": 22,
      "address": "No 10, Main Street",
      "defaultAddress": true,
      "city": { "id": 1, "name": "Colombo" }
    }
  ]
}
```

---

## 15) Add Address

- Method: `POST`
- Path: `/api/v1/users/add-address`
- Auth: `Yes`

### Request Body Sample
```json
{
  "address": "No 10, Main Street",
  "city": { "id": 1, "name": "Colombo" },
  "defaultAddress": true,
  "phone": "0771234567"
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Address added successfully",
  "object": {
    "id": 22,
    "address": "No 10, Main Street",
    "defaultAddress": true
  }
}
```

---

## 16) Save User Token

- Method: `POST`
- Path: `/api/v1/users/save-user-token`
- Auth: `Yes`

### Request Body Sample
```json
{
  "token": "fcm_token_value",
  "device": "android"
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "User token saved successfully"
}
```

---

## 17) Send Reset Password Email

- Method: `POST`
- Path: `/api/v1/users/send-reset-password-email`
- Auth: `No (intended public)`

### Request Body Sample
```json
{
  "email": "john.smith@example.com",
  "subject": "Reset your password",
  "design": "<html><body><a href=\"{{verification_link}}\">Reset Password</a></body></html>",
  "route": "https://deliveryya.com/reset-password"
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Reset password e-mail sent"
}
```

---

## 18) Reset Password

- Method: `POST`
- Path: `/api/v1/users/reset-password-email`
- Auth: `No (intended public)`

### Request Body Sample
```json
{
  "token": "RESET_PASSWORD_TOKEN",
  "password": "NewSecurePass123!"
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Password reset successful"
}
```

---

## 19) Drop Address By ID

- Method: `DELETE`
- Path: `/api/v1/users/drop-address-by-id`
- Auth: `Yes`

### Query Params
- `addressId` (required, min 1)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Address removed successfully"
}
```
