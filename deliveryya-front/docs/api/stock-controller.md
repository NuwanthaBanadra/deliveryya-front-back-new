# StockController API

Source: `src/main/java/com/kaleox/deliveryya/controller/StockController.java`
Base path: `/api/v1/stocks`

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

## 1) Get Stocks (Paginated)

- Method: `POST`
- Path: `/api/v1/stocks/get-stocks`
- Auth: `Yes`

Deleted stocks are not returned. Stocks linked to deleted products, brands, or categories are also excluded by the stock specification.

### Request Body Sample
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "brandId": null,
  "categoryId": null,
  "marketId": 11,
  "productId": 25,
  "stockId": null,
  "isActive": true,
  "color": "Black",
  "search": "iphone",
  "items": []
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Stocks fetched successfully.",
  "object": {
    "pageNumber": 0,
    "countPerPage": 10,
    "totalCount": 1,
    "totalPages": 1,
    "brandId": null,
    "categoryId": null,
    "marketId": 11,
    "productId": 25,
    "stockId": null,
    "isActive": true,
    "color": "Black",
    "search": "iphone",
    "items": [
      {
        "id": 101,
        "cost": 120000.0,
        "showingPrice": 150000.0,
        "sellingPrice": 145000.0,
        "qty": 8.0,
        "unit": {
          "id": 1,
          "name": "pcs"
        },
        "products": {
          "id": 25,
          "name": "iPhone 15",
          "code": "IP15-BLK-128",
          "desc": null,
          "isActive": true,
          "brand": {
            "id": 4,
            "name": "Apple",
            "category": null
          }
        },
        "emi": "Available",
        "color": "Black",
        "sizes": null,
        "wpu": 1.0,
        "isActive": true
      }
    ]
  }
}
```

---

## 2) Update Stock

- Method: `POST`
- Path: `/api/v1/stocks/update-stock`
- Auth: `Yes`

This endpoint updates existing stocks when `stockDtoList[].id` is provided. When `id` is not provided, it either merges into an existing stock with the same product, color, cost, showing price, and selling price, or creates a new stock row.

### Request Body Sample
```json
{
  "productId": 25,
  "stockDtoList": [
    {
      "id": 101,
      "cost": 120000.0,
      "showingPrice": 150000.0,
      "sellingPrice": 145000.0,
      "qty": 8.0,
      "unit": {
        "id": 1
      },
      "emi": "Available",
      "color": "Black",
      "sizes": null,
      "wpu": 1.0,
      "isActive": true
    },
    {
      "cost": 118000.0,
      "showingPrice": 148000.0,
      "sellingPrice": 142000.0,
      "qty": 5.0,
      "unit": {
        "id": 1
      },
      "emi": "Available",
      "color": "Blue",
      "sizes": null,
      "wpu": 1.0,
      "isActive": true
    }
  ]
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Stocks processed successfully. Updated: 1, Added: 1, Merged: 0",
  "object": null
}
```

---

## 3) Update Stock Status

- Method: `PUT`
- Path: `/api/v1/stocks/update-stock-status`
- Auth: `Yes`

### Query Params
- `stockId` (required)
- `isActive` (required, `true` or `false`)

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Stock status updated successfully.",
  "object": null
}
```

Note:
- If the stock is soft-deleted, the service rejects the status update.

---

## 4) Delete Stock

- Method: `DELETE`
- Path: `/api/v1/stocks/delete-stock`
- Auth: `Yes`

### Query Params
- `stockIds` (required, one or more IDs)

Accepted formats depend on the client, but Spring can bind repeated or comma-separated query values:

```text
/api/v1/stocks/delete-stock?stockIds=101,102
/api/v1/stocks/delete-stock?stockIds=101&stockIds=102
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Stocks deleted successfully",
  "object": null
}
```

Note:
- Service tries hard delete first.
- If delete fails due to foreign key references, it soft-deletes (`isDeleted=true`, `isActive=false`) and still returns success.
- If delete fails for another data integrity reason, the service returns an error instead of soft-deleting.

---

## 5) Drop Stock

- Method: `DELETE`
- Path: `/api/v1/stocks/drop-stock`
- Auth: `Yes`

This is an existing alias for stock deletion. It uses the same service logic as `/delete-stock`.

### Query Params
- `stockIds` (required, one or more IDs)

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Stocks deleted successfully",
  "object": null
}
```

---

## Validation Notes

- `PaginatedStockDto`
  - `pageNumber` required
  - `countPerPage` required
  - `brandId`, `categoryId`, `marketId`, `productId`, `stockId` optional filters
  - `isActive` optional filter, defaults to `true`
  - `color` optional exact-match filter
  - `search` optional product name/code search
- `UpdateStockDto`
  - `productId` required
  - `stockDtoList` required
- `StockDto`
  - `id` optional; if present, updates that stock
  - `cost` required
  - `sellingPrice` required
  - `qty` required
  - `unit` required
  - `emi` optional, max 45
  - `color` required, max 10
  - `sizes` optional
  - `wpu` required
  - `isActive` optional
- Delete endpoints
  - `stockIds` required
  - Every stock ID must be greater than zero
