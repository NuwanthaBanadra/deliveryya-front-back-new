# Error Handling

Source:
- `src/main/java/com/kaleox/deliveryya/config/GlobalExceptionHandler.java`
- `src/main/java/com/kaleox/deliveryya/config/BusinessException.java`
- `src/main/java/com/kaleox/deliveryya/config/AccessNotGrantedException.java`

## Overview

API errors are handled globally through `GlobalExceptionHandler`.

Controllers and services should throw exceptions instead of manually building error responses. The global handler converts known exceptions into the standard `ResponseDto` error envelope.

## Error Response Envelope

Most error responses use this shape:

```json
{
  "status": 400,
  "message": "Error",
  "desc": "Validation failed",
  "exData": {
    "fieldName": "Error message"
  },
  "object": null
}
```

Field notes:
- `status`: HTTP status code. Some handlers currently set this explicitly; `BusinessException` does not currently set it in the body.
- `message`: usually `"Error"` for failed requests.
- `desc`: human-readable error summary.
- `exData`: optional field-level or context-specific error details.
- `object`: normally `null` for errors.

---

## 1) Bean Validation Errors

Handled exception:
- `MethodArgumentNotValidException`

HTTP status:
- `400 Bad Request`

When it happens:
- Request body validation fails for DTOs annotated with `@Valid`.
- Examples: `@NotNull`, `@Size`, and other Jakarta validation annotations on request body fields.

Example DTO validation:

```java
@PostMapping("/get-stocks")
public ResponseEntity<ResponseDto<PaginatedStockDto>> getStocks(
        @RequestBody @Valid PaginatedStockDto paginatedStockDto
) {
    return ResponseEntity.ok(stockService.getStocks(paginatedStockDto));
}
```

Example response:

```json
{
  "status": 400,
  "message": "Error",
  "desc": "Validation failed",
  "exData": {
    "pageNumber": "must not be null",
    "countPerPage": "must not be null"
  },
  "object": null
}
```

Use this for:
- Required request body fields.
- Field length limits.
- Nested DTO validation when the nested field is annotated with `@Valid`.

---

## 2) Business Errors

Handled exception:
- `BusinessException`

HTTP status:
- `409 Conflict`

When it happens:
- The request is syntactically valid, but cannot be processed because of business rules or application state.

Common examples:
- Entity not found.
- Duplicate data.
- Deleted entity cannot be updated.
- Invalid state transition.
- File type is not allowed.
- Foreign key delete failure that should not be converted to soft delete.

How to throw:

```java
throw new BusinessException("Stock not found with id: " + stockId, null);
```

With field/context details:

```java
throw new BusinessException(
        "Invalid stock ID",
        Map.of("stockId", "Stock ID must be greater than zero")
);
```

Example response:

```json
{
  "message": "Error",
  "desc": "Invalid stock ID",
  "exData": {
    "stockId": "Stock ID must be greater than zero"
  },
  "object": null
}
```

Notes:
- `BusinessException` response uses HTTP `409`.
- The response body currently does not set `status`.
- Use `exData` when the client can show a specific field-level or action-level message.

---

## 3) Missing Request Parameters

Handled exception:
- `MissingServletRequestParameterException`

HTTP status:
- `400 Bad Request`

When it happens:
- A required `@RequestParam` is missing.

Example endpoint:

```java
@PutMapping("/update-stock-status")
public ResponseEntity<ResponseDto<Void>> updateStockStatus(
        @RequestParam @NotNull Integer stockId,
        @RequestParam @NotNull Boolean isActive
) {
    return ResponseEntity.ok(stockService.updateStockStatus(stockId, isActive));
}
```

Example response:

```json
{
  "status": 400,
  "message": "Error",
  "desc": "Missing request parameter",
  "exData": {
    "stockId": "Parameter 'stockId' is required"
  },
  "object": null
}
```

---

## 4) Endpoint Not Found

Handled exceptions:
- `NoHandlerFoundException`
- `NoResourceFoundException`

HTTP status:
- `404 Not Found`

Example responses:

```json
{
  "status": 404,
  "message": "Error",
  "desc": "Endpoint not found: /api/v1/unknown",
  "object": null
}
```

```json
{
  "status": 404,
  "message": "Error",
  "desc": "Resource not found: /uploads/missing-file.png",
  "object": null
}
```

---

## 5) Authorization Denied

Handled exception:
- `AuthorizationDeniedException`

HTTP status:
- `401 Unauthorized`

When it happens:
- Spring Security denies access to the endpoint or method.

Example response:

```json
{
  "status": 401,
  "message": "Error",
  "desc": "Access declined. Please contact support",
  "object": null
}
```

---

## 6) API Access Control Errors

Handled exception:
- `AccessNotGrantedException`

HTTP status:
- `460`

When it happens:
- Custom API access control rejects the request.
- Usually thrown by access-control logic/interceptors when the authenticated user does not have permission for the API.

How to throw:

```java
throw new AccessNotGrantedException(
        "Access not granted",
        Map.of("api", "User does not have permission for this endpoint")
);
```

Example response:

```json
{
  "status": 460,
  "message": "Error",
  "desc": "Access not granted",
  "exData": {
    "api": "User does not have permission for this endpoint"
  },
  "object": null
}
```

---

## 7) Unhandled Errors

Handled exception:
- `Exception`

HTTP status:
- `500 Internal Server Error`

When it happens:
- Any unexpected exception that is not handled by a more specific handler.

Example response:

```json
{
  "status": 500,
  "message": "Error",
  "desc": "Internal Server error",
  "object": null
}
```

Notes:
- The handler currently prints the stack trace using `ex.printStackTrace()`.
- Do not expose internal exception messages to clients from this handler.

---

## Recommended Usage

Use DTO validation for simple request shape rules:

```java
@NotNull
Integer pageNumber;

@Size(max = 45)
String name;
```

Use `BusinessException` for application rules:

```java
if (Boolean.TRUE.equals(stock.getIsDeleted())) {
    throw new BusinessException(
            "Cannot update status for deleted stock",
            Map.of("stockId", "Stock is deleted")
    );
}
```

Use `AccessNotGrantedException` only for custom permission failures:

```java
throw new AccessNotGrantedException("Access denied", Map.of("access", "Permission required"));
```

Let unknown errors fall through to the global `Exception` handler.

---

## Current Error Status Summary

| Exception | HTTP Status | Body `status` |
| --- | ---: | ---: |
| `MethodArgumentNotValidException` | `400` | `400` |
| `BusinessException` | `409` | not set |
| `MissingServletRequestParameterException` | `400` | `400` |
| `NoHandlerFoundException` | `404` | `404` |
| `NoResourceFoundException` | `404` | `404` |
| `AuthorizationDeniedException` | `401` | `401` |
| `AccessNotGrantedException` | `460` | `460` |
| `Exception` | `500` | `500` |
