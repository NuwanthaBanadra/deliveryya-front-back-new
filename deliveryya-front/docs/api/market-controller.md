# MarketController API

Source: `src/main/java/com/kaleox/deliveryya/controller/MarketController.java`
Base path: `/api/v1/markets`

## Auth Notes

All endpoints in this controller require `Authorization: Bearer <token>`.

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

## 1) Get Markets (Paginated)

- Method: `POST`
- Path: `/api/v1/markets/get-markets`
- Auth: `Yes`

### Request Body Sample
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "marketCategoryId": 2,
  "marketId": null,
  "userId": null,
  "isActive": true,
  "search": "Green",
  "items": []
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Markets fetched successfully.",
  "object": {
    "pageNumber": 0,
    "countPerPage": 10,
    "totalCount": 2,
    "totalPages": 1,
    "marketCategoryId": 2,
    "isActive": true,
    "search": "Green",
    "items": [
      {
        "id": 11,
        "name": "Green Valley Market",
        "location": "123 Main Street",
        "address": "456 Lake Road, Colombo 03",
        "logoUrl": "https://example.com/markets/green-valley-logo.png",
        "coverImgUrl": "https://example.com/markets/green-valley-cover.png",
        "desc": "Fresh organic products",
        "first_num": "0771234567",
        "second_num": "0112345678",
        "whats_app": "0771234567",
        "users": { "id": 5, "firstName": "Nimal", "lastName": "Perera" },
        "infoMessage": "Open 8AM to 8PM",
        "isActive": true,
        "marketCategory": { "id": 2, "name": "Grocery" }
      }
    ]
  }
}
```

---

## 2) Set Market

- Method: `POST`
- Path: `/api/v1/markets/set-market`
- Auth: `Yes`

### Request Body Sample
```json
{
  "name": "Green Valley Market",
  "location": "123 Main Street",
  "address": "456 Lake Road, Colombo 03",
  "logoUrl": "https://example.com/markets/green-valley-logo.png",
  "coverImgUrl": "https://example.com/markets/green-valley-cover.png",
  "desc": "Fresh organic products",
  "first_num": "0771234567",
  "second_num": "0112345678",
  "whats_app": "0771234567",
  "users": { "id": 5 },
  "infoMessage": "Open 8AM to 8PM",
  "isActive": true,
  "marketCategory": {
    "id": 2,
    "name": "Grocery"
  }
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Market successfully created.",
  "object": {
    "id": 11,
    "name": "Green Valley Market",
    "location": "123 Main Street",
    "address": "456 Lake Road, Colombo 03",
    "logoUrl": "https://example.com/markets/green-valley-logo.png",
    "coverImgUrl": "https://example.com/markets/green-valley-cover.png",
    "desc": "Fresh organic products",
    "first_num": "0771234567",
    "second_num": "0112345678",
    "whats_app": "0771234567",
    "users": { "id": 5 },
    "infoMessage": "Open 8AM to 8PM",
    "isActive": true,
    "marketCategory": { "id": 2, "name": "Grocery" },
    "createdAt": "2026-04-19T10:15:00"
  }
}
```

---

## 3) Update Market

- Method: `POST`
- Path: `/api/v1/markets/update-market`
- Auth: `Yes`

### Request Body Sample
```json
{
  "id": 11,
  "name": "Green Valley Market - Downtown",
  "location": "456 Lake Road",
  "address": "789 Galle Road, Colombo 05",
  "logoUrl": "https://example.com/markets/green-valley-logo-v2.png",
  "coverImgUrl": "https://example.com/markets/green-valley-cover-v2.png",
  "desc": "Fresh organic products and daily essentials",
  "first_num": "0771234567",
  "second_num": "0112345678",
  "whats_app": "0771234567",
  "users": { "id": 5 },
  "infoMessage": "Open daily 7AM to 10PM",
  "isActive": true,
  "marketCategory": {
    "id": 2,
    "name": "Grocery"
  }
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Market successfully updated and marked as inactive.",
  "object": {
    "id": 11,
    "name": "Green Valley Market - Downtown",
    "location": "456 Lake Road",
    "address": "789 Galle Road, Colombo 05",
    "desc": "Fresh organic products and daily essentials",
    "first_num": "0771234567",
    "second_num": "0112345678",
    "whats_app": "0771234567",
    "users": { "id": 5 },
    "infoMessage": "Open daily 7AM to 10PM",
    "isActive": true,
    "marketCategory": { "id": 2, "name": "Grocery" },
    "updatedAt": "2026-04-19T10:40:00"
  }
}
```

---

## 4) Update Market Status/Info

- Method: `POST`
- Path: `/api/v1/markets/update-market-status-info`
- Auth: `Yes`

### Request Body Sample
```json
{
  "id": 11,
  "isActive": false,
  "infoMessage": "Temporarily closed for maintenance"
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Market status/info updated successfully.",
  "object": {
    "id": 11,
    "isActive": false,
    "infoMessage": "Temporarily closed for maintenance"
  }
}
```

---

## 5) Get Market Categories

- Method: `GET`
- Path: `/api/v1/markets/get-market-categories`
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
  "desc": "Market categories fetched successfully",
  "object": [
    { "id": 1, "name": "Pharmacy" },
    { "id": 2, "name": "Grocery" },
    { "id": 3, "name": "Restaurant" }
  ]
}
```

---

## 6) Set Bank Detail

- Method: `POST`
- Path: `/api/v1/markets/set-bank-detail`
- Auth: `Yes`

### Request Body Sample
```json
{
  "name": "Green Valley Pvt Ltd",
  "accNumber": "123456789012",
  "branch": "Colombo 03",
  "bank": { "id": 4, "name": "Commercial Bank" },
  "userId": 11,
  "isActive": true
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Bank detail successfully created.",
  "object": null
}
```

---

## 7) Update Bank Detail

- Method: `POST`
- Path: `/api/v1/markets/update-bank-detail`
- Auth: `Yes`

### Request Body Sample
```json
{
  "id": 8,
  "name": "Green Valley Pvt Ltd",
  "accNumber": "123456789999",
  "branch": "Colombo 05",
  "bank": { "id": 4, "name": "Commercial Bank" },
  "userId": 11
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Bank detail successfully updated.",
  "object": null
}
```

---

## 8) Delete Bank Detail

- Method: `DELETE`
- Path: `/api/v1/markets/delete-bank-detail`
- Auth: `Yes`

### Query Params
- `bankDetailId` (required)

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Bank detail deleted successfully",
  "object": null
}
```

Note:
- Service tries hard delete first.
- If delete fails due to foreign key references, it soft-deletes (`isDeleted=true`, `isActive=false`) and still returns success.

---

## 9) Update Bank Detail Status

- Method: `PUT`
- Path: `/api/v1/markets/update-bank-detail-status`
- Auth: `Yes`

### Query Params
- `bankDetailId` (required)
- `isActive` (required, `true` or `false`)

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Bank detail status updated successfully",
  "object": null
}
```

---

## 10) Get Bank Details (Paginated)

- Method: `POST`
- Path: `/api/v1/markets/get-bank-details`
- Auth: `Yes`

### Request Body Sample
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "marketId": 11,
  "userId": null,
  "bankDetailId": null,
  "bankId": 4,
  "isActive": true,
  "search": "Green",
  "items": []
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Bank details fetched successfully.",
  "object": {
    "pageNumber": 0,
    "countPerPage": 10,
    "totalCount": 1,
    "totalPages": 1,
    "marketId": 11,
    "userId": null,
    "bankDetailId": null,
    "bankId": 4,
    "isActive": true,
    "search": "Green",
    "items": [
      {
        "id": 8,
        "name": "Green Valley Pvt Ltd",
        "accNumber": "123456789999",
        "branch": "Colombo 05",
        "bank": { "id": 4, "name": "Commercial Bank" },
        "userId": 11,
        "isActive": true,
        "isDeleted": false
      }
    ]
  }
}
```

---

## 11) Get Bank Details By User ID

- Method: `GET`
- Path: `/api/v1/markets/get-bank-details-by-user-id`
- Auth: `Yes`

### Query Params
- `userId` (optional)
- `isActive` (optional)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Bank details fetched successfully.",
  "object": [
    {
      "id": 8,
      "name": "Green Valley Pvt Ltd",
      "accNumber": "123456789999",
      "branch": "Colombo 05",
      "bank": { "id": 4, "name": "Commercial Bank" },
      "userId": 11,
      "isActive": true,
      "isDeleted": false
    }
  ]
}
```

---

## 12) Get Bank Details By User ID And Bank Detail ID

- Method: `GET`
- Path: `/api/v1/markets/get-bank-details-by-user-id-and-bank-detail-id`
- Auth: `Yes`

### Query Params
- `userId` (optional)
- `bankDetailId` (optional)
- `isActive` (optional)

At least one of `userId` or `bankDetailId` must be provided.

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Bank details fetched successfully.",
  "object": [
    {
      "id": 8,
      "name": "Green Valley Pvt Ltd",
      "accNumber": "123456789999",
      "branch": "Colombo 05",
      "bank": { "id": 4, "name": "Commercial Bank" },
      "userId": 11,
      "isActive": true,
      "isDeleted": false
    }
  ]
}
```

---

## 13) Get Bank Details By User ID And Bank Detail ID (Paginated)

- Method: `POST`
- Path: `/api/v1/markets/get-bank-details-by-user-id-and-bank-detail-id-paginated`
- Auth: `Yes`

### Request Body Sample
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "marketId": null,
  "userId": 11,
  "bankDetailId": null,
  "isActive": true,
  "search": "Green",
  "items": []
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Bank details fetched successfully.",
  "object": {
    "pageNumber": 0,
    "countPerPage": 10,
    "totalCount": 1,
    "totalPages": 1,
    "marketId": null,
    "userId": 11,
    "bankDetailId": null,
    "isActive": true,
    "search": "Green",
    "items": [
      {
        "id": 8,
        "name": "Green Valley Pvt Ltd",
        "accNumber": "123456789999",
        "branch": "Colombo 05",
        "bank": { "id": 4, "name": "Commercial Bank" },
        "userId": 11,
        "isActive": true,
        "isDeleted": false
      }
    ]
  }
}
```

---

## 14) Get Banks

- Method: `GET`
- Path: `/api/v1/markets/get-banks`
- Auth: `Yes`

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Banks fetched successfully.",
  "object": [
    { "id": 1, "name": "Bank of Ceylon" },
    { "id": 2, "name": "People's Bank" },
    { "id": 4, "name": "Commercial Bank" }
  ]
}
```

---

## 15) Get Market Details By Market Order ID

- Method: `GET`
- Path: `/api/v1/markets/get-markets-details-by-market-order-id`
- Auth: `Yes`

### Query Params
- `marketOrderId` (required, not null)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Market details fetched successfully",
  "object": {
    "id": 11,
    "name": "Green Valley Market",
    "location": "456 Lake Road",
    "address": "789 Galle Road, Colombo 05",
    "logoUrl": "https://example.com/markets/green-valley-logo-v2.png",
    "coverImgUrl": "https://example.com/markets/green-valley-cover-v2.png",
    "desc": "Fresh organic products and daily essentials",
    "first_num": "0771234567",
    "second_num": "0112345678",
    "whats_app": "0771234567",
    "users": { "id": 5 },
    "isActive": true,
    "marketCategory": { "id": 2, "name": "Grocery" }
  }
}
```

---

## Validation Notes

- `MarketDto`
  - `name` required, max 45
  - `desc` required, max 100
  - `address` required, max 100
  - `first_num` required, max 20
  - `second_num` required, max 20
  - `whats_app` required, max 20
  - `users` required
  - `marketCategory` required
  - `logoUrl`, `coverImgUrl` max 150
- `UpdateMarketStatusInfoDto`
  - `id` required
  - `isActive` optional
  - `infoMessage` optional
- `BankDetailDto`
  - `name` required, max 45
  - `accNumber` required, max 20
  - `branch` required, max 45
  - `bank.id` required
  - `userId` required
  - `isActive` optional on create/update payload
- `PaginatedMarketDto` and `PaginatedBankDetailDto`
  - `pageNumber` required
  - `countPerPage` required
  - `PaginatedBankDetailDto.bankDetailId` optional filter
  - `PaginatedBankDetailDto.isActive` optional filter

