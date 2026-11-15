# OrderController API

Source: `src/main/java/com/kaleox/deliveryya/controller/OrderController.java`
Base path: `/api/v1/orders`

## Auth Notes

- Most endpoints require `Authorization: Bearer <token>`.
- `POST /request-codes` and `POST /get-order-code-requests` are restricted to elevated roles in the controller.
- `GET /get-order-codes` and `POST /get-order-code-requests` use the authenticated user ID unless the caller has an allowed administrative role and provides a valid `userId`.
- `POST /set-order` uses the authenticated user ID when `userId` is not provided or is `0`.
- `thirdPartySenders` in order payloads is optional; when not present, create/read behavior remains unchanged.
- `GET /get-order-history-by-order-code` is currently incomplete in the controller and returns an empty success response.

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

## 1) Get Order Codes

- Method: `GET`
- Path: `/api/v1/orders/get-order-codes`
- Auth: `Yes`

### Query Params
- `isFilled` (optional)
- `userId` (optional)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "status": 200,
  "message": "Success",
  "desc": "Code retrieved successful",
  "object": [
    {
      "id": 101,
      "code": "ORD-00005-00001",
      "field": true,
      "users": { "id": 5, "firstName": "John", "lastName": "Doe" }
    },
    {
      "id": 102,
      "code": "ORD-00005-00002",
      "field": false,
      "users": { "id": 5 }
    }
  ]
}
```

---

## 2) Get Orders Details Status

- Method: `GET`
- Path: `/api/v1/orders/get-orders-details-status`
- Auth: `Yes`

### Query Params
- `id` (required)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "This Endpoint need to complete after delivery status are completely finalized",
  "object": {
    "totalOrders": 15,
    "pendingOrders": 4,
    "deliveredOrders": 7,
    "deliveringOrders": 2,
    "cancelledOrders": 1,
    "returningOrders": 1,
    "returnedOrders": 0
  }
}
```

---

## 3) Get Delivery Statuses

- Method: `GET`
- Path: `/api/v1/orders/get-delivery-statuses`
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
  "desc": "Delivery statuses retrieved successfully",
  "object": [
    { "id": 1, "name": "Pending" },
    { "id": 2, "name": "Ready to Pickup" },
    { "id": 3, "name": "Delivered" }
  ]
}
```

---

## 4) Get Orders (Paginated)

- Method: `POST`
- Path: `/api/v1/orders/get-orders`
- Auth: `Yes`

### Request Body Sample
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "userId": 5,
  "orderId": null,
  "markerOrderId": null,
  "deliveryStatusId": 1,
  "paymentStatusId": 1,
  "paymentTypeId": 1,
  "thirdPartySendersId": null,
  "cityId": 1,
  "orderCode": "ORD-00005-00001",
  "sendingUserId": 5,
  "receivingUserId": null,
  "minPrice": 0,
  "maxPrice": 10000,
  "fromDate": "2026-04-01T00:00:00",
  "toDate": "2026-04-19T23:59:59",
  "dontCollectDeliveryFeeFromCustomer": false,
  "searchThoughThirdPartyName": true,
  "searchThoughThirdPartyNic": true,
  "searchThoughThirdPartyNote": true,
  "searchThoughThirdPartyAddress": true,
  "searchThoughThirdPartyMobileNumbers": true,
  "searchThoughDeliveryToFullName": true,
  "searchThoughDeliveryToAddress": true,
  "searchThoughDeliveryToMobileNumbers": true,
  "searchThoughDeliveryTo": true,
  "searchThoughMarketName": true,
  "searchThoughMarketOrderName": true,
  "search": "Main"
}
```

### Search Behavior (`search`)
- Always checks `orderCode.code`.
- Delivery recipient search is controlled by:
  - `searchThoughDeliveryTo` (master toggle for delivery recipient text fields)
  - `searchThoughDeliveryToFullName`
  - `searchThoughDeliveryToAddress`
  - `searchThoughDeliveryToMobileNumbers` (`primaryMobile`, `secondaryMobile`, `whatsapp`)
- Third-party sender search is controlled by:
  - `searchThoughThirdPartyName`
  - `searchThoughThirdPartyNic`
  - `searchThoughThirdPartyNote`
  - `searchThoughThirdPartyAddress`
  - `searchThoughThirdPartyMobileNumbers` (`first_mob`, `sec_mob`, `whatsapp`)
- Market-order-only search is controlled by:
  - `searchThoughMarketName` (matches market `name`)
  - `searchThoughMarketOrderName` (matches market-order user first/last/full name)
- `thirdPartySenders` and `marketOrder` are nullable relations; when either is null, search continues safely on the remaining enabled fields.
- All search toggles default to `true` when omitted.

### Response Body Sample
```json
{
  "message": "success",
  "desc": "Orders fetched successfully",
  "object": {
    "pageNumber": 0,
    "countPerPage": 10,
    "totalCount": 1,
    "totalPages": 1,
    "items": [
      {
        "id": 5001,
        "discount": 0,
        "deliveryFee": 150,
        "collectivePrice": 1850,
        "paidAmount": 0,
        "qty": 2,
        "totalPrice": 1700,
        "desc": "Home delivery order",
        "createdAt": "2026-04-19T10:00:00",
        "weight": 1.5,
        "paymentStatus": { "id": 1, "name": "Pending" },
        "paymentType": { "id": 1, "name": "Cash" },
        "deliveryStatus": { "id": 1, "name": "Pending" },
        "orderCode": {
          "id": 101,
          "code": "ORD-00005-00001",
          "field": true,
          "users": { "id": 5 }
        },
        "deliveryTo": {
          "id": 77,
          "address": "No 10, Main Street",
          "primaryMobile": "0771234567",
          "secondaryMobile": "0711234567",
          "whatsapp": "0771234567",
          "fullName": "John Doe",
          "location": "Colombo",
          "city": { "id": 1, "name": "Colombo" },
          "user": { "id": 5 }
        },
        "thirdPartySenders": {
          "id": 321,
          "name": "Nimal Perera",
          "address": "No 22, Flower Rd",
          "note": "Collect from back gate",
          "nic": "901234567V",
          "first_mob": "0771111111",
          "sec_mob": "0711111111",
          "whatsapp": "0771111111",
          "createdAt": "2026-04-19T09:00:00",
          "updatedAt": "2026-04-19T09:00:00",
          "createdBy": "system",
          "updatedBy": "system"
        }
      }
    ]
  }
}
```

---

## 5) Get Third Party Senders (Paginated)

- Method: `POST`
- Path: `/api/v1/orders/get-third-party-senders`
- Auth: `Yes`

### Request Body Sample
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "search": "nimal",
  "searchAddress": false,
  "searchNote": false
}
```

### Search Behavior
- `search` matches `name`, `whatsapp`, `first_mob`, and `sec_mob` by default.
- Set `searchAddress: true` to include `address` in the search.
- Set `searchNote: true` to include `note` in the search.
- Both `searchAddress` and `searchNote` default to `false` when omitted.

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Third party senders fetched successfully",
  "object": {
    "pageNumber": 0,
    "countPerPage": 10,
    "totalCount": 1,
    "totalPages": 1,
    "items": [
      {
        "id": 321,
        "name": "Nimal Perera",
        "address": "No 22, Flower Rd",
        "note": "Collect from back gate",
        "nic": "901234567V",
        "first_mob": "0771111111",
        "sec_mob": "0711111111",
        "whatsapp": "0771111111",
        "createdAt": "2026-04-19T09:00:00",
        "updatedAt": "2026-04-19T09:00:00",
        "createdBy": "system",
        "updatedBy": "system"
      }
    ]
  }
}
```

---

## 6) Request Codes

- Method: `POST`
- Path: `/api/v1/orders/request-codes`
- Auth: `Yes`
- Roles: elevated roles only

### Request Body Sample
```json
{
  "qty": 5,
  "orderCodeRequestId": 12,
  "userId": 5,
  "printedBarcodesNeeded": true
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Order Code Generation Successful",
  "object": [
    "ORD-00005-00003",
    "ORD-00005-00004",
    "ORD-00005-00005",
    "ORD-00005-00006",
    "ORD-00005-00007"
  ]
}
```

---

## 7) Set Order Code Request

- Method: `POST`
- Path: `/api/v1/orders/set-order-code-request`
- Auth: `Yes`

### Request Body Sample
```json
{
  "qty": 10,
  "orderCodeRequestId": 12,
  "printedBarcodesNeeded": true
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Order code request submitted successfully"
}
```

---

## 8) Delete Order Code Request

- Method: `DELETE`
- Path: `/api/v1/orders/delete-order-code-request`
- Auth: `Yes`

### Query Params
- `requestId` (required)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Order code request deleted successfully"
}
```

---

## 9) Get Order Code Requests (Paginated)

- Method: `POST`
- Path: `/api/v1/orders/get-order-code-requests`
- Auth: `Yes`

### Request Body Sample
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "id": null,
  "userId": 5,
  "printed": false,
  "printedBarcodesNeeded": true
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Order code requests fetched successfully",
  "object": {
    "pageNumber": 0,
    "countPerPage": 10,
    "totalCount": 1,
    "totalPages": 1,
    "userId": 5,
    "items": [
      {
        "id": 12,
        "qty": 10,
        "printed": false,
        "printedBarcodesNeeded": true,
        "user": {
          "id": 5,
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@example.com"
        },
        "createdAt": "2026-04-19T09:30:00",
        "updatedAt": "2026-04-19T09:30:00",
        "generated": false,
        "orderCodes": ["ORD-00005-00003"]
      }
    ]
  }
}
```

---

## 10) Update Order Code Request Printed

- Method: `PUT`
- Path: `/api/v1/orders/update-order-code-request-printed`
- Auth: `Yes`

### Request Body Sample
```json
{
  "requestId": 12,
  "printed": true
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Order code request printed status updated successfully"
}
```

---

## 11) Set Order

- Method: `POST`
- Path: `/api/v1/orders/set-order`
- Auth: `Yes`

### Request Body Sample
```json
{
  "discount": 0,
  "paymentType": { "id": 1, "name": "Cash" },
  "orderCode": { "id": 101, "code": "ORD-00005-00001" },
  "collectivePrice": 1700,
  "qty": 2,
  "totalPrice": 1700,
  "desc": "Home delivery order",
  "weight": 1.5,
  "deliveryTo": {
    "address": "No 10, Main Street",
    "primaryMobile": "0771234567",
    "secondaryMobile": "0711234567",
    "whatsapp": "0771234567",
    "fullName": "John Doe",
    "city": { "id": 1, "name": "Colombo" }
  },
  "thirdPartySenders": {
    "name": "Nimal Perera",
    "address": "No 22, Flower Rd",
    "note": "Collect from back gate",
    "nic": "901234567V",
    "first_mob": "0771111111",
    "sec_mob": "0711111111",
    "whatsapp": "0771111111"
  },
  "dontCollectDeliveryFeeFromCustomer": false
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Order successfully created."
}
```

### Notes
- The controller uses the authenticated user ID if the request `userId` parameter is missing or `0`.
- `paymentType.id` and `orderCode.id` are required.
- `thirdPartySenders` is optional.
- If `thirdPartySenders` is provided, a new sender profile is saved and associated with the created order.

---

## 12) Checkout Order

- Method: `POST`
- Path: `/api/v1/orders/checkout-order`
- Auth: `Yes`

### Request Body Sample
```json
{
  "note": "Leave at front desk",
  "orderCode": "ORD-00005-00001",
  "employeesId": 8,
  "deliveryStatusId": 2
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Delivery updated"
}
```

---

## 13) Set Market Order

- Method: `POST`
- Path: `/api/v1/orders/set-market-order`
- Auth: `Yes`

### Request Body Sample
```json
{
  "deliveryTo": {
    "address": "No 10, Main Street",
    "primaryMobile": "0771234567",
    "secondaryMobile": "0711234567",
    "whatsapp": "0771234567",
    "fullName": "John Doe",
    "city": { "id": 1, "name": "Colombo" }
  },
  "stocks": [
    { "id": 1, "qty": 2 },
    { "id": 2, "qty": 1 }
  ],
  "cuponCode": "",
  "paymentType": { "id": 1, "name": "Cash" }
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "object": [
    {
      "id": 5002,
      "orderCode": { "id": 102, "code": "ORD-00005-00002", "field": true, "users": { "id": 5 } },
      "paymentStatus": { "id": 1, "name": "Pending" },
      "paymentType": { "id": 1, "name": "Cash" },
      "deliveryStatus": { "id": 1, "name": "Pending" },
      "qty": 3,
      "totalPrice": 3250,
      "weight": 1.2,
      "deliveryTo": {
        "id": 88,
        "address": "No 10, Main Street",
        "primaryMobile": "0771234567",
        "secondaryMobile": "0711234567",
        "whatsapp": "0771234567",
        "location": "Colombo",
        "city": { "id": 1, "name": "Colombo" },
        "fullName": "John Doe"
      },
      "user": {
        "id": 5,
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "nic": "901234567V"
      }
    }
  ]
}
```

---

## 14) Delete Order By Order Codes

- Method: `DELETE`
- Path: `/api/v1/orders/delete-order-by-order-codes`
- Auth: `Yes`

### Query Params
- `orderCodes` (required, comma-separated)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Order Deleted Successfully"
}
```

### Example
```text
orderCodes=ORD-00005-00001,ORD-00005-00002
```

---

## 15) Get Order History By Order Code

- Method: `GET`
- Path: `/api/v1/orders/get-order-history-by-order-code`
- Auth: `Yes`

### Query Params
- `orderCode` (required)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success"
}
```

### Notes
- The current controller method is incomplete and does not populate `object` yet.
- Keep this in mind if you are depending on this endpoint in frontend code.

---

## 16) Get Market Order Details By ID

- Method: `GET`
- Path: `/api/v1/orders/get-market-order-details-by-id`
- Auth: `Yes`

### Query Params
- `id` (required)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Market order details fetched successfully",
  "object": {
    "id": 102,
    "price": 3250,
    "qty": 3,
    "discount": 0,
    "items": [
      { "id": 1, "price": 1650, "qty": 2, "stockId": 1 },
      { "id": 2, "price": 1700, "qty": 1, "stockId": 2 }
    ]
  }
}
```

---

## 17) Get Delivery History By Order Code Or ID

- Method: `GET`
- Path: `/api/v1/orders/get-delivery-history-by-order-code-or-id`
- Auth: `Yes`

### Query Params
- `orderCode` (optional)
- `orderId` (optional)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Delivery history fetched successfully",
  "object": [
    {
      "id": 401,
      "note": "Delivered to front desk",
      "employees": { "id": 8, "location": "Galle" },
      "deliveryStatus": { "id": 3, "name": "Delivered" },
      "createdAt": "2026-04-19T11:30:00"
    }
  ]
}
```

### Notes
- At least one of `orderCode` or `orderId` must be provided.

---

## 18) Get Order User And Last Employee Details

- Method: `GET`
- Path: `/api/v1/orders/get-order-user-and-last-employee-details`
- Auth: `Yes`

### Query Params
- `orderCode` (required)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Order user and employee details fetched successfully",
  "object": {
    "orderCode": "ORD-00005-00001",
    "user": {
      "id": 5,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "nic": "901234567V",
      "profileImg": "https://example.com/profile.jpg",
      "isActive": true,
      "emailVerified": true,
      "isEmployee": false
    },
    "employee": {
      "id": 8,
      "location": "Galle",
      "liveLocation": "6.0535,80.2210",
      "mobile": "0770000000",
      "whatsapp": "0770000000",
      "verificationStatus": { "id": 2, "name": "Verified" },
      "branch": { "id": 1, "name": "Main Branch" },
      "user": {
        "id": 8,
        "firstName": "Kamal",
        "lastName": "Perera",
        "email": "kamal@example.com",
        "nic": "881234567V"
      }
    },
    "deliveryStatus": { "id": 3, "name": "Delivered" },
    "lastUpdatedAt": "2026-04-19T11:30:00"
  }
}
```

---

## 19) Get On Hand Orders

- Method: `GET`
- Path: `/api/v1/orders/get-on-hand-orders`
- Auth: `Yes`

### Query Params
- `userId` (optional for privileged roles)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "On hand orders fetched successfully",
  "object": {
    "orderPrices": 3250,
    "collectivePrices": 3400,
    "onHandUrgentJobCount": 2,
    "urgentJobValues": 1200,
    "onHandOrderCount": 1,
    "urgentJobList": [],
    "orderList": [
      {
        "id": 5002,
        "discount": 0,
        "deliveryFee": 150,
        "collectivePrice": 1700,
        "paidAmount": 0,
        "qty": 2,
        "totalPrice": 1550,
        "desc": "Home delivery order",
        "createdAt": "2026-04-19T10:00:00",
        "weight": 1.5,
        "deliveryTo": {
          "id": 88,
          "address": "No 10, Main Street",
          "primaryMobile": "0771234567",
          "secondaryMobile": "0711234567",
          "whatsapp": "0771234567",
          "fullName": "John Doe",
          "location": "Colombo",
          "city": { "id": 1, "name": "Colombo" }
        },
        "paymentStatus": { "id": 1, "name": "Pending" },
        "paymentType": { "id": 1, "name": "Cash" },
        "deliveryStatus": { "id": 1, "name": "Pending" },
        "orderCode": { "id": 102, "code": "ORD-00005-00002", "field": true, "users": { "id": 5 } },
        "thirdPartySenders": {
          "id": 321,
          "name": "Nimal Perera",
          "address": "No 22, Flower Rd",
          "note": "Collect from back gate",
          "nic": "901234567V",
          "first_mob": "0771111111",
          "sec_mob": "0711111111",
          "whatsapp": "0771111111",
          "createdAt": "2026-04-19T09:00:00",
          "updatedAt": "2026-04-19T09:00:00",
          "createdBy": "system",
          "updatedBy": "system"
        }
      }
    ]
  }
}
```

---

## 20a) Get Delivering Users History

- Method: `POST`
- Path: `/api/v1/orders/get-deliveryTo-history`
- Auth: `Yes` (uses the authenticated user id to scope results)

### Request Body (DeliveringUserHistoryDto)

- `search` (string, required) — free-text search term used to match delivery recipient fields and/or other configured text fields.
- `pageNumber` (integer, required) — zero-based page index.
- `countPerPage` (integer, required) — number of items per page.

Optional / response-only fields included in the same DTO (provided by the server):
- `totalCount` (long) — total matching records.
- `totalPages` (integer) — total pages available.
- `successfulDeliveries` (integer) — count of successful deliveries in the result set.
- `failedDeliveries` (integer) — count of failed deliveries in the result set.
- `relatedDeliveriesDetails` (array of DeliveryToDto) — delivery recipient details related to the search results.
- `failedDeliveriesDeliveryTimeLine` (map<string, array of SetDeliveryDto>) — grouped failed-delivery timeline entries (keyed by a time bucket or date string).

### Request Body Sample
```json
{
  "search": "John Doe",
  "pageNumber": 0,
  "countPerPage": 10
}
```

### Response Body Sample
```json
{
  "status": 200,
  "message": "Success",
  "desc": "Delivery to history fetched successfully",
  "object": {
    "search": "John Doe",
    "pageNumber": 0,
    "countPerPage": 10,
    "totalCount": 25,
    "totalPages": 3,
    "successfulDeliveries": 18,
    "failedDeliveries": 7,
    "relatedDeliveriesDetails": [
      {
        "id": 77,
        "address": "No 10, Main Street",
        "primaryMobile": "0771234567",
        "secondaryMobile": "0711234567",
        "whatsapp": "0771234567",
        "fullName": "John Doe",
        "location": "Colombo",
        "city": { "id": 1, "name": "Colombo" },
        "user": { "id": 5 }
      }
    ],
    "failedDeliveriesDeliveryTimeLine": {
      "2026-04-19": [
        {
          "orderCode": "ORD-00005-00003",
          "employeesId": 8,
          "deliveryStatusId": 4,
          "note": "Recipient not available"
        }
      ]
    }
  }
}
```

### Notes / Guidelines

- This endpoint always uses the authenticated user's id (extracted from the JWT username) when calling the service. Clients should call this endpoint with a valid bearer token.
- `search`, `pageNumber` and `countPerPage` are required and validated by the controller/DTO. Missing or invalid values will cause a 400 validation error.
- The `relatedDeliveriesDetails` items follow the `DeliveryToDto` shape (see DTO documentation). The `failedDeliveriesDeliveryTimeLine` map groups `SetDeliveryDto` entries (failed delivery events) keyed by a timeline label (usually a date string).
- Typical usage: allow delivery employees to query their past deliveries and see a quick timeline of failures to follow up.
- Pagination: use `pageNumber` and `countPerPage` to iterate through results; the response includes `totalCount` and `totalPages`.


## 20) Update Delivery To Details

- Method: `PUT`
- Path: `/api/v1/orders/update-delivery-to-details`
- Auth: `Yes`

### Request Body Sample
```json
{
  "orderId": null,
  "orderCode": "ORD-00005-00001",
  "deliveryTo": {
    "address": "No 15, New Street",
    "primaryMobile": "0771234567",
    "secondaryMobile": "0711234567",
    "whatsapp": "0771234567",
    "fullName": "Jane Doe",
    "location": "Colombo",
    "city": { "id": 1 }
  }
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Delivery details updated successfully"
}
```

### Notes
- Delivery details can only be updated when the order's delivery status is pending (`id = 1`).
- Either `orderId` or `orderCode` must be provided.
- Re-calculates and updates the order's delivery fee based on the new `city`.

---

## 21) Update Order Details

- Method: `PUT`
- Path: `/api/v1/orders/update-order-details`
- Auth: `Yes`

### Request Body Sample
```json
{
  "orderId": 5001,
  "orderCode": null,
  "discount": 100,
  "qty": 3,
  "totalPrice": 2500,
  "desc": "Updated description",
  "weight": 2.0,
  "paidAmount": 500,
  "dontCollectDeliveryFeeFromCustomer": false,
  "paymentTypeId": 2,
  "removeThirdPartySender": false,
  "thirdPartySenders": {
    "id": 321,
    "name": "Nimal Perera Updated",
    "address": "No 25, Flower Rd",
    "note": "Call when arrived",
    "nic": "901234567V",
    "first_mob": "0771111111",
    "sec_mob": "0711111111",
    "whatsapp": "0771111111"
  }
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Order details updated successfully"
}
```

### Notes
- Either `orderId` or `orderCode` must be provided.
- Updates numeric/text fields only if they are not null.
- Can link a new/existing `ThirdPartySender`, update one, or remove it entirely by setting `removeThirdPartySender = true`.

---

## 22) Update Third Party Sender

- Method: `PUT`
- Path: `/api/v1/orders/update-third-party-sender`
- Auth: `Yes`

### Request Body Sample
```json
{
  "id": 321,
  "name": "Nimal Perera Updated",
  "address": "No 25, Flower Rd",
  "note": "Call when arrived",
  "nic": "901234567V",
  "first_mob": "0771111111",
  "sec_mob": "0711111111",
  "whatsapp": "0771111111"
}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Third party sender updated successfully",
  "object": {
    "id": 321,
    "name": "Nimal Perera Updated",
    "address": "No 25, Flower Rd",
    "note": "Call when arrived",
    "nic": "901234567V",
    "first_mob": "0771111111",
    "sec_mob": "0711111111",
    "whatsapp": "0771111111",
    "createdAt": "2026-04-19T09:00:00",
    "updatedAt": "2026-04-19T10:00:00",
    "createdBy": "system",
    "updatedBy": "system"
  }
}
```

### Notes
- Updates specific details of a `ThirdPartySender` standalone record. `id` is required.

---

## 23) Delete Third Party Sender

- Method: `DELETE`
- Path: `/api/v1/orders/delete-third-party-sender`
- Auth: `Yes`

### Query Params
- `id` (required)

### Request Body Sample
```json
{}
```

### Response Body Sample
```json
{
  "message": "Success",
  "desc": "Third party sender deleted successfully"
}
```

### Notes
- If the sender is tied to any existing orders (i.e. deleting causes a foreign key violation), the record will be soft-deleted (`isDeleted = true`) and excluded from `get-third-party-senders` queries instead of being permanently removed.

---

## Validation Notes

### PaginatedOrdersDto
- `pageNumber` required
- `countPerPage` required
- Supports filters:
  - `cityId`
  - `orderId`
  - `userId`
  - `markerOrderId`
  - `deliveryStatusId`
  - `paymentStatusId`
  - `paymentTypeId`
  - `thirdPartySendersId`
  - `orderCode`
  - `sendingUserId`
  - `receivingUserId`
  - `minPrice`
  - `maxPrice`
  - `fromDate`
  - `toDate`
  - `dontCollectDeliveryFeeFromCustomer`
  - `search`
  - `searchThoughThirdPartyName`
  - `searchThoughThirdPartyNic`
  - `searchThoughThirdPartyNote`
  - `searchThoughThirdPartyAddress`
  - `searchThoughThirdPartyMobileNumbers`
  - `searchThoughDeliveryToFullName`
  - `searchThoughDeliveryToAddress`
  - `searchThoughDeliveryToMobileNumbers`
  - `searchThoughDeliveryTo`
  - `searchThoughMarketName`
  - `searchThoughMarketOrderName`

### OrderDto
- `discount` required, min 0
- `paymentType` required
- `collectivePrice` required, min 0
- `qty` required
- `totalPrice` required, min 0
- `weight` required
- `deliveryTo` required for create flow
- `orderCode` required
- `paidAmount` defaults to `0.00`
- `dontCollectDeliveryFeeFromCustomer` defaults to `false`
- `thirdPartySenders` optional
  - If provided, nested required fields are: `name`, `first_mob`, `sec_mob`, `whatsapp`

### RequestOrderCode
- `qty` required, min 1
- `orderCodeRequestId` required
- `userId` optional
- `printedBarcodesNeeded` optional

### SetDeliveryDto
- `orderCode` required
- `deliveryStatusId` required
- `note` max 150 chars

### SetMarketOrderDto
- `deliveryTo` required
- `stocks` required, at least one stock entry
- `paymentType` required
- `cuponCode` optional
- Each stock item requires `id` and `qty`

---

## Practical Notes

1. **Several retrieval endpoints use `POST` with a JSON body** instead of query parameters.
2. **`GET /get-order-history-by-order-code` is currently incomplete** in the controller.
3. **`set-order` and `set-market-order` both depend on nested DTOs**, so nested `id` values must be valid.
4. **Role-restricted operations** should be called with a token that has one of the allowed roles listed above.
5. **Backward compatibility:** `thirdPartySenders` may be absent in create and read payloads; clients can safely ignore it when null.

---

## 20) Update Delivery To Details

- Method: `PUT`
- Path: `/api/v1/orders/update-delivery-to-details`
- Auth: `Yes`

### Request Body Sample
```json
{
  "orderId": 5001,
  "orderCode": "ORD-00005-00001",
  "deliveryTo": {
    "address": "No 10, Updated Street",
    "primaryMobile": "0771234567",
    "secondaryMobile": "0711234567",
    "whatsapp": "0771234567",
    "fullName": "John Doe",
    "location": "Colombo",
    "city": { "id": 1 }
  }
}
```

### Notes
- Requires order `deliveryStatus.id = 1` (Pending).
- Updates delivery details and recalculates delivery fee natively.

---

## 21) Update Order Details

- Method: `PUT`
- Path: `/api/v1/orders/update-order-details`
- Auth: `Yes`

### Request Body Sample
```json
{
  "orderId": 5001,
  "discount": 50,
  "qty": 3,
  "totalPrice": 1800,
  "desc": "Updated note",
  "weight": 2.0,
  "paidAmount": 1800,
  "dontCollectDeliveryFeeFromCustomer": false,
  "paymentTypeId": 1,
  "removeThirdPartySender": false,
  "thirdPartySenders": {
    "name": "Nimal Perera",
    "address": "No 22, Flower Rd",
    "note": "Collect from back gate",
    "nic": "901234567V",
    "first_mob": "0771111111",
    "sec_mob": "0711111111",
    "whatsapp": "0771111111"
  }
}
```

### Notes
- Will update the specified fields and properly remap collective amounts.
- Pass `removeThirdPartySender: true` to unlink any `ThirdPartySender`.

---

## 22) Update Third Party Sender

- Method: `PUT`
- Path: `/api/v1/orders/update-third-party-sender`
- Auth: `Yes`

### Request Body Sample
```json
{
  "id": 1,
  "name": "Nimal Perera",
  "address": "No 22, Flower Rd",
  "note": "Updated note",
  "nic": "901234567V",
  "first_mob": "0771111111",
  "sec_mob": "0711111111",
  "whatsapp": "0771111111"
}
```

### Notes
- Used to independently update existing Third Party Sender credentials.

---

## 23) Delete Third Party Sender

- Method: `DELETE`
- Path: `/api/v1/orders/delete-third-party-sender`
- Auth: `Yes`

### Query Params
- `id` (required)

### Notes
- If referenced by foreign keys (attached to orders), this will soft-delete the record (`isDeleted = true`) instead of hard deletion.


