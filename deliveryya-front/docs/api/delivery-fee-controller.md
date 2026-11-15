# DeliveryFeeController API

Source: `src/main/java/com/kaleox/deliveryya/controller/DeliveryFeeController.java`
Base path: `/api/v1/delivery-fees`

## Overview

This controller handles delivery-fee lookup and maintenance endpoints. The delivery-fee routes were split out of `PaymentController` to keep payment and delivery-fee concerns separate.

## Auth Notes

- Read endpoints can be called without an admin role, depending on your security configuration.
- Write endpoints are restricted to elevated roles in the controller.

## Endpoints

### 1) Get Delivery Fee By City Id

- Method: `GET`
- Path: `/api/v1/delivery-fees/get-delivery-fee-by-city-id`
- Query Params: `id` (required)

#### Response Example
```json
{
  "status": 200,
  "message": "Success",
  "desc": "Delivery Fee Retrieved Successfully",
  "object": {
    "id": 12,
    "city": { "id": 5, "name": "Colombo" },
    "fee": 150.0,
    "additionalFee": 25.0
  }
}
```

### 2) Get Delivery Cost By City Id

- Method: `GET`
- Path: `/api/v1/delivery-fees/get-delivery-cost-by-city-id`
- Query Params:
  - `id` (required)
  - `weight` (optional, defaults to `1.0`)

#### Response Example
```json
{
  "status": 200,
  "message": "Success",
  "desc": "Delivery Cost Retrieved Successfully",
  "object": 175.0
}
```

### 3) Get Delivery Fees (Paginated)

- Method: `POST`
- Path: `/api/v1/delivery-fees/get-delivery-fees`

#### Request Example
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "deliveryFeeId": 0,
  "deliveryFeeFrom": 100,
  "deliveryFeeTo": 300,
  "additionalFeeFrom": 0,
  "additionalFeeTo": 50,
  "cityId": 5,
  "districtId": 2,
  "search": "col"
}
```

### 4) Upsert Delivery Fee

- Method: `POST`
- Path: `/api/v1/delivery-fees/upsert-delivery-fee`
- Auth: elevated roles only

#### Behavior
- `id == 0` → insert
- `id > 0` → update

#### Request Example
```json
{
  "id": 0,
  "cityId": 5,
  "fee": 150.0,
  "additionalFee": 25.0
}
```

### 5) Delete Delivery Fee

- Method: `DELETE`
- Path: `/api/v1/delivery-fees/delete-delivery-fee`
- Auth: elevated roles only
- Query Params: `id` (required)

#### Response Example
```json
{
  "status": 200,
  "message": "Success",
  "desc": "Delivery fee deleted successfully"
}
```

## Notes

- The controller uses the shared `PaymentService` implementation for the actual business logic.
- The paginated lookup response uses `PaginatedDeliveryFeesDto`.
- `DeliveryFeeDto` includes `city`, `fee`, and `additionalFee`.

