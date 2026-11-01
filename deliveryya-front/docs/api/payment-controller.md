# PaymentController API

Source: `src/main/java/com/kaleox/deliveryya/controller/PaymentController.java`
Base path: `/api/v1/payment`

## Overview

This controller handles payment-type lookups, payment-record management (create, read, update, verify/delete), and payment-done notifications. Delivery-fee endpoints were moved to `DeliveryFeeController`.

## Response Envelope

All endpoints return:
```json
{
  "status": 200,
  "message": "Success",
  "desc": "Description or status message",
  "exData": {},
  "object": {}
}
```

---

## 1) Get Payment Types

- Method: `GET`
- Path: `/api/v1/payment/get-payment-types`
- Auth: `No`

### Request
No request body required.

### Response Example
```json
{
  "status": 200,
  "message": "Success",
  "desc": "Payment types retrieved successfully",
  "object": [
    { "id": 1, "name": "Cash" },
    { "id": 2, "name": "Bank Transfer" },
    { "id": 3, "name": "Card" },
    { "id": 4, "name": "Cheque" }
  ]
}
```

---

## 2) Get Payment Statuses

- Method: `GET`
- Path: `/api/v1/payment/get-payment-statuses`
- Auth: `No`

### Query Params
- `id` (optional) — if provided, returns a single payment status; otherwise returns all

### Response Example (All)
```json
{
  "status": 200,
  "message": "Success",
  "desc": "Payment statuses retrieved successfully",
  "object": [
    { "id": 1, "name": "Pending" },
    { "id": 2, "name": "Completed" }
  ]
}
```

### Response Example (Specific ID)
```json
{
  "status": 200,
  "message": "Success",
  "desc": "Payment statuses retrieved successfully",
  "object": [
    { "id": 1, "name": "Pending" }
  ]
}
```

---

## 3) Notify Payment Done

- Method: `POST`
- Path: `/api/v1/payment/notify-payment-done`
- Auth: `No`

### Query Params
- `orderCodes` (required) — comma-separated order codes (e.g., `ORD-00001,ORD-00002`)

### Request Body
```json
{}
```

### Response Example
```json
{
  "status": 200,
  "message": "Success",
  "desc": "Order Updated Successfully",
  "object": null
}
```

### Notes
- Marks the specified orders as fully paid (sets `paidAmount` to `collectivePrice`).
- Syncs the order's `paymentStatus` to `COMPLETED`.
- If an order code is not found, returns an error.

---

## 4) Create Payment Record

- Method: `POST`
- Path: `/api/v1/payment/create-payment-record`
- Auth: `Yes` (required)
- Allowed Roles: SUPER_ADMIN, ADMIN, OWNER, MANAGER, CLIENT, MARKET_OWNER, SECRETORY, ACCOUNTS_MANAGER, ACCOUNT_ASSISTANT, MARKETS_MANAGER

### Request Body
```json
{
  "paymentType": { "id": 1, "name": "Cash" },
  "amount": 5000.0,
  "desc": "Payment for order ORD-00001",
  "proofUrl": "/uploads/proof_2026-04-19.jpg",
  "bankDetail": { "id": 1, "name": "Bank A" },
  "isReturn": false,
  "paymentRecordItems": [
    {
      "code": "ORD-00001",
      "amount": 5000.0
    }
  ]
}
```

### Response Example
```json
{
  "status": 200,
  "message": "Success",
  "desc": "Payment Recode Successfully",
  "object": null
}
```

### Validation Rules
- `paymentRecordItems` required, at least one item
- `amount` must not exceed the sum of `paymentRecordItems[].amount`
- Item codes must start with `ORD` (order) or `UJC` (urgent job)
- If `proofUrl` provided, it will be moved to `payment-profs` folder
- All numeric fields must be non-negative

### Role-Based Behavior
- If user is CLIENT or MARKET_OWNER, `paymentType` is forced to id=2 and `isReturn` is forced to false.
- Admin roles can set any `paymentType` and `isReturn` value.

---

## 5) Update Payment Record

- Method: `POST` or `PUT`
- Path: `/api/v1/payment/update-payment-record`
- Auth: `Yes` (required)
- Allowed Roles: SUPER_ADMIN, ADMIN, OWNER, MANAGER, CLIENT, MARKET_OWNER, SECRETORY, ACCOUNTS_MANAGER, ACCOUNT_ASSISTANT, MARKETS_MANAGER

### Request Body
```json
{
  "id": 42,
  "paymentType": { "id": 1, "name": "Bank Transfer" },
  "amount": 5500.0,
  "desc": "Updated payment note",
  "proofUrl": "/uploads/new_proof_2026-04-20.jpg",
  "bankDetail": { "id": 2, "name": "Bank B" },
  "isReturn": false,
  "paymentRecordItems": [
    {
      "code": "ORD-00001",
      "amount": 5500.0
    }
  ]
}
```

### Response Example
```json
{
  "status": 200,
  "message": "Success",
  "desc": "Payment record updated successfully",
  "object": null
}
```

### Validation Rules
- `id` required (> 0)
- Cannot update if verification status is already `verified`
- `amount` must not exceed the sum of `paymentRecordItems[].amount`
- Item codes must start with `ORD` or `UJC`
- If `proofUrl` changes, new file is moved and old file is scheduled for deletion
- All numeric fields must be non-negative

### Notes
- Only records with non-verified status can be updated.
- File handling: if `proofUrl` contains "temporary", it is moved to `payment-profs`.
- Adjusts order `paidAmount` based on changes in payment type and return status.

---

## 6) Update Payment Verification Status Or Delete

- Method: `POST`
- Path: `/api/v1/payment/update-payment-verification-status-or-delete`
- Auth: `Yes` (required)
- Allowed Roles: SUPER_ADMIN, ADMIN, OWNER, MANAGER, SECRETORY, ACCOUNTS_MANAGER, ACCOUNT_ASSISTANT, MARKETS_MANAGER

### Request Body (Update Verification Status)
```json
{
  "paymentRecordId": 42,
  "verificationStatusId": 1,
  "isDeleted": false
}
```

### Request Body (Delete Payment Record)
```json
{
  "paymentRecordId": 42,
  "verificationStatusId": null,
  "isDeleted": true
}
```

### Response Example
```json
{
  "status": 200,
  "message": "Success",
  "desc": "Payment verification status updated successfully",
  "object": null
}
```

### Validation Rules
- At least one field required: `verificationStatusId` OR `isDeleted`
- Cannot both update verification status AND delete in the same request
- `verificationStatusId` must reference an existing verification status
- If `isDeleted: true`, all associated `PaymentRecordItems` are also deleted

### Notes
- If verification status is being moved from verified → non-verified, order paid amounts are reversed.
- If verification status is being moved from non-verified → verified, order paid amounts are applied.
- Deletion cascades to payment record items.

---

## 7) Get Payment Records (Paginated)

- Method: `POST`
- Path: `/api/v1/payment/get-payment-records`
- Auth: `Yes` (required)
- Allowed Roles: SUPER_ADMIN, ADMIN, OWNER, MANAGER, CLIENT, MARKET_OWNER, SECRETORY, ACCOUNTS_MANAGER, ACCOUNT_ASSISTANT, MARKETS_MANAGER

### Request Body
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "paymentTypeId": 1,
  "verificationStatusId": 1,
  "clientId": 5,
  "search": "ORD"
}
```

### Response Example
```json
{
  "status": 200,
  "message": "Success",
  "desc": "Payment records fetched successfully",
  "object": {
    "pageNumber": 0,
    "countPerPage": 10,
    "totalCount": 25,
    "totalPages": 3,
    "items": [
      {
        "id": 42,
        "amount": 5000.0,
        "desc": "Payment for order ORD-00001",
        "proofUrl": "/uploads/proof_2026-04-19.jpg",
        "isReturn": false,
        "createdAt": "2026-04-19T10:00:00",
        "updatedAt": "2026-04-19T10:00:00",
        "madeBy": "John Doe",
        "paymentType": { "id": 1, "name": "Cash" },
        "bankDetail": { "id": 1, "name": "Bank A" },
        "verificationStatus": { "id": 1, "name": "Verified" },
        "paymentRecordItems": [
          {
            "id": 101,
            "code": "ORD-00001",
            "amount": 5000.0
          }
        ]
      }
    ]
  }
}
```

### Filter Fields
- `pageNumber` (required) — zero-based page index
- `countPerPage` (required) — items per page
- `paymentTypeId` (optional) — filter by payment type id
- `verificationStatusId` (optional) — filter by verification status id
- `clientId` (optional) — filter by user/client id
- `search` (optional) — free-text search

### Role-Based Behavior
- If user is CLIENT or MARKET_OWNER, `clientId` is automatically set to their own user ID (overrides request value).
- Admin roles can query any `clientId` or see all records if not filtered.

### Response Fields
- `pageNumber`, `countPerPage`, `totalCount`, `totalPages` — pagination info
- `items` — array of `PaymentRecordDto`
- `madeBy` — resolved user full name (if `createdBy` was a numeric user ID)

---

## Validation Notes

### Common Validation
- All required fields marked `@NotNull` must be provided.
- Validation errors return HTTP 400 with detailed field error messages in `exData`.

### PaymentRecordDto
- `paymentType` required
- `paymentRecordItems` required, min 1 item
- `isReturn` required
- `amount` >= 0
- `amount` <= sum of items' amounts

### UpdatePaymentVerificationStatusOrDeleteDto
- At least one of `verificationStatusId` or `isDeleted` must be provided
- Cannot provide both simultaneously

### PaginatedPaymentRecodeDto
- `pageNumber` required
- `countPerPage` required

---

## Error Responses

### 400 Bad Request
Validation failed on required or format constraints.

```json
{
  "status": 400,
  "message": "Validation failed",
  "exData": {
    "amount": "amount must be greater than or equal to 0"
  }
}
```

### 404 Not Found
Resource (payment record, order, payment type, etc.) not found.

```json
{
  "status": 404,
  "message": "Error",
  "desc": "Payment record not found with id: 999"
}
```

### 403 Forbidden
User does not have the required role for the operation.

---

## Practical Notes

1. **Payment Type Behavior**: Type `id=4` has special handling for verification status and order adjustments.
2. **File Uploads**: `proofUrl` should be a file path; the service automatically moves it to `payment-profs` directory.
3. **Order Adjustments**: Creating/updating/deleting payment records for type `id=4` automatically updates linked order `paidAmount` and `paymentStatus`.
4. **Verification Status**: Once verified, payment records cannot be edited; only verification status or deletion is allowed.
5. **Soft Delete**: When deleting verified records, order paid amounts are reversed (`-1.0 multiplier`).
6. **Bearer Token**: All auth-required endpoints expect `Authorization: Bearer <JWT_token>`.

