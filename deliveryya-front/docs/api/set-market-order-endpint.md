# Set Market Order Endpoint Documentation

## Endpoint Details

- **URL**: `/api/v1/orders/set-market-order`
- **Method**: `POST`
- **Authentication**: Required (Bearer Token)
- **Content-Type**: `application/json`

## Overview

The `/set-market-order` endpoint allows authenticated users to create market orders with multiple stocks (products). This endpoint processes a market order request containing delivery information, stock items, and payment type details. The system will:

1. Validate all input data
2. Check stock availability for each item
3. Deduct quantities from available stock
4. Create a market order and associated order items
5. Calculate delivery fees based on city and weight
6. Apply discount codes if provided
7. Generate order codes for the market

## Authentication

All requests must include an Authorization header with a valid Bearer token:

```
Authorization: Bearer <your-jwt-token>
```

The user ID is extracted from the authenticated user details.

## Request Body Structure

```json
{
  "deliveryTo": {
    "id": null,
    "address": "123 Main Street, Apartment 4B",
    "primaryMobile": "03001234567",
    "secondaryMobile": "03009876543",
    "whatsapp": "03001234567",
    "fullName": "John Doe",
    "location": "Downtown District",
    "city": {
      "id": 1,
      "name": "Karachi"
    }
  },
  "stocks": [
    {
      "id": 101,
      "qty": 2.5
    },
    {
      "id": 102,
      "qty": 1.0
    }
  ],
  "paymentType": {
    "id": 1,
    "name": "Credit Card"
  },
  "cuponCode": "SUMMER2025"
}
```

## Request Parameters

### DeliveryTo Object (Required)

Contains delivery address and recipient information.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | Integer | No | Delivery address ID (auto-generated on creation) |
| address | String | Yes | Complete delivery address |
| primaryMobile | String | Yes | Primary contact number |
| secondaryMobile | String | Yes | Secondary contact number |
| whatsapp | String | Yes | WhatsApp contact number |
| fullName | String | Yes | Recipient's full name |
| location | String | No | Specific location details (e.g., landmark) |
| city | CommonIdNameDto | Yes | City object with `id` and `name` |

### Stocks Array (Required)

Array of stock items to be ordered. Each stock must be available and have sufficient quantity.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | Integer | Yes | Stock ID of the product |
| qty | Double | Yes | Quantity to order |

### PaymentType Object (Required)

Specifies the payment method for the order.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | Integer | Yes | Payment type ID (e.g., 1 for Credit Card, 2 for Cash) |
| name | String | No | Payment type name |

### CuponCode (Optional)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| cuponCode | String | No | Discount coupon code to apply to the order |

## Response

### Success Response (200 OK)

```json
{
  "message": "Success",
  "desc": null,
  "object": [
    {
      "id": 501,
      "marketOrder": null,
      "discount": 10.00,
      "stock": null,
      "paymentStatus": null,
      "paymentType": {
        "id": 1,
        "name": "Credit Card"
      },
      "deliveryFee": 150.00,
      "collectivePrice": 5000.00,
      "qty": 2.5,
      "totalPrice": 5150.00,
      "desc": null,
      "deliveryStatus": {
        "id": 1,
        "name": "Pending"
      },
      "weight": 5.0,
      "deliveryTo": {
        "id": 45,
        "address": "123 Main Street, Apartment 4B",
        "primaryMobile": "03001234567",
        "secondaryMobile": "03009876543",
        "whatsapp": "03001234567",
        "fullName": "John Doe",
        "location": "Downtown District",
        "order": null,
        "city": {
          "id": 1,
          "name": "Karachi"
        },
        "user": null
      },
      "orderCode": {
        "id": 1001,
        "code": "MKT-2025-001",
        "qty": null,
        "filled": false
      },
      "paidAmount": 0.00,
      "user": null,
      "userId": 5,
      "createdAt": "2025-01-15T10:30:45",
      "dontCollectDeliveryFeeFromCustomer": false,
      "deliveryFeeCollected": false,
      "thirdPartySenders": null
    }
  ]
}
```

## Sample Request Examples

### Example 1: Simple Order with Single Stock Item

```bash
curl -X POST http://localhost:8080/api/v1/orders/set-market-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
  "deliveryTo": {
    "address": "456 Oak Avenue",
    "primaryMobile": "03001234567",
    "secondaryMobile": "03009876543",
    "whatsapp": "03001234567",
    "fullName": "Jane Smith",
    "city": {
      "id": 2,
      "name": "Lahore"
    }
  },
  "stocks": [
    {
      "id": 205,
      "qty": 3.0
    }
  ],
  "paymentType": {
    "id": 2,
    "name": "Debit Card"
  }
}'
```

### Example 2: Order with Multiple Stocks and Discount Code

```bash
curl -X POST http://localhost:8080/api/v1/orders/set-market-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
  "deliveryTo": {
    "address": "789 Pine Road, Unit 12",
    "primaryMobile": "03335555555",
    "secondaryMobile": "03334444444",
    "whatsapp": "03335555555",
    "fullName": "Ahmed Khan",
    "location": "Near City Center",
    "city": {
      "id": 3,
      "name": "Islamabad"
    }
  },
  "stocks": [
    {
      "id": 150,
      "qty": 5.0
    },
    {
      "id": 151,
      "qty": 2.5
    },
    {
      "id": 152,
      "qty": 1.0
    }
  ],
  "paymentType": {
    "id": 3,
    "name": "Cash on Delivery"
  },
  "cuponCode": "NEW2025"
}'
```

### Example 3: Order with All Optional Fields

```bash
curl -X POST http://localhost:8080/api/v1/orders/set-market-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
  "deliveryTo": {
    "address": "Flat 201, Gulberg Residencia, Gulberg",
    "primaryMobile": "03211111111",
    "secondaryMobile": "03212222222",
    "whatsapp": "03211111111",
    "fullName": "Fatima Ali",
    "location": "Near Hyperstar",
    "city": {
      "id": 1,
      "name": "Karachi"
    }
  },
  "stocks": [
    {
      "id": 88,
      "qty": 4.0
    },
    {
      "id": 89,
      "qty": 2.0
    }
  ],
  "paymentType": {
    "id": 1,
    "name": "Credit Card"
  },
  "cuponCode": "WELCOME50"
}'
```

## Error Responses

### 400 Bad Request - Validation Error

```json
{
  "message": "Validation failed",
  "desc": "One or more validation errors occurred",
  "object": {
    "deliveryTo": "Must not be null",
    "stocks": "Must not be empty"
  }
}
```

### 400 Bad Request - Stock Not Found

```json
{
  "message": "Stock not found",
  "desc": "The requested stock item does not exist",
  "object": null
}
```

### 400 Bad Request - Insufficient Stock

```json
{
  "message": "Not enough stock for item",
  "desc": "Requested quantity exceeds available stock",
  "object": {
    "Color": "Red",
    "Size": "Medium",
    "Available Quantity": "2.0"
  }
}
```

### 400 Bad Request - Market Not Found

```json
{
  "message": "Market Could not be found",
  "desc": "The market associated with the stock does not exist",
  "object": null
}
```

### 401 Unauthorized

```json
{
  "message": "Unauthorized",
  "desc": "Authentication token is missing or invalid",
  "object": null
}
```

### 404 Not Found - User Not Found

```json
{
  "message": "User not found",
  "desc": "The authenticated user does not exist in the system",
  "object": null
}
```

## Business Logic Details

### Stock Processing
- The system verifies that each requested stock exists in the database
- Validates that the available quantity is greater than or equal to the requested quantity
- Automatically deducts the ordered quantity from the available stock
- Groups order items by their associated market

### Delivery Fee Calculation
- Calculated based on the delivery destination city and total order weight
- Different markets may have different delivery fees
- Fees are computed separately for each market in the order

### Order Code Generation
- Unique order codes are generated for each market involved in the order
- Codes follow the market's naming convention
- Prevents duplicate codes using a reserved codes system

### Discount Application
- If a valid coupon code is provided, the discount is calculated and applied
- The discount amount is stored with the order
- Invalid coupon codes are silently ignored (system returns 0 discount)

### Market Grouping
- If ordering multiple items from the same market, they're grouped into a single market order
- Each market's items are calculated with separate totals and delivery fees
- Response returns separate order objects for each market

## Important Notes

1. **Authentication Required**: This endpoint requires a valid JWT token. All requests without proper authentication will be rejected.

2. **Stock Quantity Validation**: The system checks real-time stock availability. Ensure requested quantities do not exceed available stock.

3. **Delivery Address**: All delivery address fields must be provided and filled accurately for successful delivery.

4. **City Selection**: The city must be a valid city ID in the system. Ensure the city ID exists before placing the order.

5. **Multiple Markets**: The endpoint handles orders from multiple markets in a single request. Each market order is created separately but returned together.

6. **Coupon Codes**: Coupon codes are validated by the system's discount service. Invalid codes will result in zero discount.

7. **Response Data**: The response includes detailed order information including generated order codes, delivery fees, and all order details.

## Related Endpoints

- `GET /api/v1/orders/get-order-codes` - Retrieve available order codes
- `POST /api/v1/orders/set-order` - Create a single order
- `GET /api/v1/orders/get-market-order-details-by-id` - Get market order details
- `POST /api/v1/orders/order-checkout-v2` - Checkout orders

## Tips for Integration

1. **Validate Input**: Use client-side validation to check required fields before sending the request
2. **Handle Errors**: Implement proper error handling for stock availability and validation errors
3. **Confirm Delivery Details**: Always ask users to verify their delivery address before submitting
4. **City Lookup**: Maintain a list of valid cities and allow users to select from a dropdown
5. **Stock Verification**: Show users the current stock availability before adding to the order

