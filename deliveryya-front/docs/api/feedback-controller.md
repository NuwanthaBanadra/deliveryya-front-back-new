# Feedback Controller API

## 1) Overview

This document summarizes the routes exposed by `FeedbackController` and the main request/response rules.

- **Base URL:** `http://localhost:8080/api/v1/feedback`
- **Content Type:** `application/json` (except query-param delete route)
- **Primary response wrapper:** `ResponseDto<T>`
- **Authentication:** Required for all feedback routes (feedback endpoints are not listed in `SecurityConfig.PUBLIC_PATTERNS`)

---

## 2) Standard Response Pattern

Successful responses typically follow:

```json
{
  "message": "Success",
  "desc": "Human readable description",
  "object": {}
}
```

Error responses are handled by `GlobalExceptionHandler` and usually include:
- `message`: `Error`
- `desc`: error description
- `exData`: validation/business error details when available

---

## 3) Endpoint Summary

| Method | Path | Auth | Purpose |
|---|---|---:|---|
| POST | `/set-feedback` | Yes | Create feedback for a product using the authenticated user |
| PUT | `/update-feedback` | Yes | Update an existing feedback (owned by authenticated user) |
| POST | `/get-feedbacks` | Yes | Get paginated feedbacks with optional filters |
| DELETE | `/delete-feedback?id={id}` | Yes | Delete feedback by ID |

---

## 4) Detailed Endpoint Notes

### 4.1 Create Feedback
**POST** `/set-feedback`

Creates a feedback entry for the authenticated user and the provided product.

#### Request example
```json
{
  "comment": "Great quality and quick delivery",
  "rating": 5,
  "productId": 12
}
```

#### Validation and rules
- `rating` is required and must be between `1` and `5`
- `productId` is required and must be `>= 1`
- `comment` is optional, max `100` characters
- Product must exist, otherwise: `"Product not found"`
- Authenticated user must exist in DB, otherwise: `"User not found"`

#### Success response example
```json
{
  "message": "Success",
  "desc": "Feedback saved successfully",
  "object": {
    "id": 101,
    "comment": "Great quality and quick delivery",
    "rating": 5,
    "productId": 12,
    "userId": 7,
    "userName": "John Doe",
    "createdAt": "2026-05-10T09:30:00",
    "updatedAt": "2026-05-10T09:30:00"
  }
}
```

---

### 4.2 Update Feedback
**PUT** `/update-feedback`

Updates an existing feedback record owned by the authenticated user.

#### Request example
```json
{
  "id": 101,
  "comment": "Updated comment after second purchase",
  "rating": 4,
  "productId": 12
}
```

#### Validation and rules
- `id` is required at service level (`"Feedback id is required"`)
- `rating` is required and must be between `1` and `5`
- `productId` is required and must be `>= 1`
- Ownership check is by `feedbackId + authenticated user email`
- If record is not found for that user: `"Feedback not found"`

#### Success response example
```json
{
  "message": "Success",
  "desc": "Feedback updated successfully",
  "object": {
    "id": 101,
    "comment": "Updated comment after second purchase",
    "rating": 4,
    "productId": 12,
    "userId": 7,
    "userName": "John Doe",
    "createdAt": "2026-05-10T09:30:00",
    "updatedAt": "2026-05-10T10:05:00"
  }
}
```

---

### 4.3 Get Feedbacks (Paginated)
**POST** `/get-feedbacks`

Returns paginated feedbacks sorted by `id` descending.

#### Request example
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "productId": 12,
  "userId": null,
  "search": "great",
  "fromDate": "2026-05-01T00:00:00",
  "toDate": "2026-05-10T00:00:00"
}
```

#### Filters
- `productId`: exact product filter (`!= null && != 0`)
- `userId`: exact user filter (`!= null && != 0`)
- `fromDate`: `createdAt >= fromDate`
- `toDate`:
  - if time is `00:00:00`, query includes the full date (`createdAt < next day at 00:00`)
  - otherwise `createdAt <= toDate`
- `search`: case-insensitive partial match on:
  - feedback `comment`
  - user `firstName`
  - user `lastName`
  - user `email`

#### Response example
```json
{
  "message": "Success",
  "desc": "Feedbacks retrieved successfully",
  "object": {
    "pageNumber": 0,
    "countPerPage": 10,
    "totalCount": 2,
    "totalPages": 1,
    "productId": 12,
    "userId": null,
    "search": "great",
    "fromDate": "2026-05-01T00:00:00",
    "toDate": "2026-05-10T00:00:00",
    "feedbacks": [
      {
        "id": 101,
        "comment": "Great quality and quick delivery",
        "rating": 5,
        "productId": 12,
        "userId": 7,
        "userName": "John Doe",
        "createdAt": "2026-05-10T09:30:00",
        "updatedAt": "2026-05-10T09:30:00"
      }
    ]
  }
}
```

---

### 4.4 Delete Feedback
**DELETE** `/delete-feedback?id={id}`

Deletes feedback by ID.

#### Example
```http
DELETE /api/v1/feedback/delete-feedback?id=101
```

#### Validation and rules
- `id` request parameter is required by Spring (`MissingServletRequestParameterException` if absent)
- Service also checks `id != null && id != 0`, else `"Feedback id is required"`
- If ID does not exist: `"Feedback not found"`
- Current implementation deletes by ID without user ownership check

#### Success response example
```json
{
  "message": "Success",
  "desc": "Feedback deleted successfully"
}
```

---

## 5) DTO & Validation Summary

### `FeedbackDTO`
- `id` - required only for update
- `comment` - optional, max `100` chars
- `rating` - required, min `1`, max `5`
- `productId` - required, min `1`
- `userId`, `userName`, `createdAt`, `updatedAt` - response fields

### `PaginatedFeedbackDto`
- `pageNumber` - required
- `countPerPage` - required
- filters: `productId`, `userId`, `search`, `fromDate`, `toDate`
- response pagination fields: `totalCount`, `totalPages`
- result list field: `feedbacks`

---

## 6) Common Error Cases

- `400 Bad Request`
  - Bean validation failures (`rating`, `productId`, pagination fields, etc.)
  - Missing required query parameter (`id` on delete)
- `401 Unauthorized`
  - Missing/invalid authentication token
- `409 Conflict`
  - Business exceptions such as:
    - `"User not found"`
    - `"Product not found"`
    - `"Feedback id is required"`
    - `"Feedback not found"`

---

## 7) Related Files

- `src/main/java/com/kaleox/deliveryya/controller/FeedbackController.java`
- `src/main/java/com/kaleox/deliveryya/service/impl/FeedbackServiceImpl.java`
- `src/main/java/com/kaleox/deliveryya/service/specification/FeedbackSpec.java`
- `src/main/java/com/kaleox/deliveryya/dto/feedbacks/FeedbackDTO.java`
- `src/main/java/com/kaleox/deliveryya/dto/paginatedDto/PaginatedFeedbackDto.java`
- `src/main/java/com/kaleox/deliveryya/repo/FeedbackRepo.java`

