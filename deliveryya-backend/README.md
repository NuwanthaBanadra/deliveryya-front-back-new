# API Quick Reference

## 📋 Overview

This is a quick reference guide for the Deliveryya Backend API endpoints. For detailed documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

---

## Firebase credentials

Firebase notifications use Google Application Default Credentials. For local
development, set `GOOGLE_APPLICATION_CREDENTIALS` to the path of a service
account JSON file. In deployed environments, use the platform's attached
service account instead. Do not commit credential files to the repository.

---

## 🚀 Base URL

```
http://localhost:8080/api/v1
```

---

## 👤 User Endpoints

### 1. **Sign Up** - Register New User
```http
POST /api/v1/users/sign-up
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dob": "1990-05-15",
  "nic": "901234567V",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "profileImg": "https://example.com/profile.jpg",
  "gender": {"id": 1, "name": "Male"},
  "userRole": {"id": 2, "name": "Customer"},
  "verificationStatus": {"id": 1, "name": "Pending"}
}
```

**Success Response (200):**
```json
{
  "status": 200,
  "message": "success",
  "desc": "User registered successfully"
}
```

---

### 2. **Login** - User Authentication
```http
POST /api/v1/users/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "status": 200,
  "message": "success",
  "desc": "Login successful",
  "exData": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": "5",
    "email": "john.doe@example.com"
  }
}
```

---

### 3. **Update User (Authenticated)** - Update Own Profile
```http
POST /api/v1/users/update-user
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "dob": "1990-05-15",
  "nic": "901234567V",
  "email": "john.smith@example.com",
  "password": "NewSecurePass123!",
  "gender": {"id": 1, "name": "Male"},
  "userRole": {"id": 2, "name": "Customer"},
  "verificationStatus": {"id": 2, "name": "Verified"}
}
```

**Note:** User ID is automatically extracted from JWT token (no `id` field needed)

---

### 4. **Get User By ID (Authenticated)** - Get Own Profile
```http
GET /api/v1/users/get-user-by-id
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "id": 5,
  "firstName": "John",
  "lastName": "Doe",
  "dob": "1990-05-15",
  "nic": "901234567V",
  "email": "john.doe@example.com",
  "emailVerified": true,
  "gender": {"id": 1, "name": "Male"},
  "userRole": {"id": 2, "name": "Customer"},
  "verificationStatus": {"id": 2, "name": "Verified"}
}
```

---

### 5. **Admin Update User** - Update Any User (Admin Only)
```http
POST /api/v1/users/admin/update-user
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "id": 5,
  "firstName": "John",
  "lastName": "Smith",
  "dob": "1990-05-15",
  "nic": "901234567V",
  "email": "john.smith@example.com",
  "password": "NewSecurePass123!",
  "gender": {"id": 1, "name": "Male"},
  "userRole": {"id": 3, "name": "Admin"},
  "verificationStatus": {"id": 2, "name": "Verified"}
}
```

**Note:** `id` field is **required** and must be > 0

---

### 6. **Admin Get User By ID** - Get Any User (Admin Only)
```http
GET /api/v1/users/admin/get-user-by-id?id=<user_id>
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `id` (required): User ID (integer, must be > 0)

**Success Response (200):**
```json
{
  "id": 5,
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "... other user fields ..."
}
```

---

## 📧 Email Endpoints

### 1. **Send Verification Email**
```http
POST /api/v1/email/send-verify-email
Content-Type: application/json
```

**Description:** Sends a verification email with a JWT token link.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "subject": "Verify Your Email Address",
  "design": "<html><body><h1>Welcome!</h1><a href=\"{{verification_link}}\">Verify Email</a></body></html>",
  "url": "https://deliveryya.com/verify"
}
```

**Note:** Use `{{verification_link}}` placeholder. System appends `?token=<jwt>`.

**Success Response (200):**
```json
{
  "status": null,
  "message": "Success",
  "desc": "E-mail successfully sent.",
  "exData": null
}
```

---

### 2. **Verify Email By Token**
```http
GET /api/v1/email/verify-email-by-token?token=<jwt_token>
```

**Description:** Verifies email using JWT token. Sets `emailVerified = true`.

**Query Parameters:**
- `token` (required): JWT token from verification email

**Example:**
```
GET /api/v1/email/verify-email-by-token?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**
```json
{
  "status": null,
  "message": "Success",
  "desc": "User email verification successful",
  "exData": null
}
```

**Error Response (409):**
```json
{
  "status": 409,
  "message": "Error",
  "desc": "Verification field",
  "exData": { "error": "Token not received" }
}
```

---

## 📦 Product Endpoints

### 1. **Set Product** - Create New Product with Stock Variants
```http
POST /api/v1/products/set-product
Content-Type: application/json
```

**Description:** Creates a new product with multiple stock variants (sizes, colors) and associated images. Validates product uniqueness by code and name.

**Request Body:**
```json
{
  "products": {
    "name": "Premium Organic Coffee Beans",
    "code": "COFFEE-001",
    "marketId": 1,
    "brand": {
      "id": 5,
      "name": "Bean Masters",
      "marketId": 1,
      "category": {
        "id": 3,
        "name": "Beverages",
        "markets": {
          "id": 1,
          "name": "Green Valley Market",
          "location": "123 Main Street",
          "desc": "Fresh organic products",
          "isActive": true
        }
      }
    }
  },
  "stocks": [
    {
      "desc": "500g pack - Dark Roast",
      "cost": 1200.00,
      "showingPrice": 1800.00,
      "sellingPrice": 1650.00,
      "qty": 100.0,
      "unit": {"id": 2, "name": "grams"},
      "color": "Brown",
      "sizes": {"id": 1, "name": "500g"},
      "wpu": 500.0
    },
    {
      "desc": "1kg pack - Dark Roast",
      "cost": 2200.00,
      "sellingPrice": 2950.00,
      "qty": 50.0,
      "unit": {"id": 2, "name": "grams"},
      "color": "Brown",
      "sizes": {"id": 2, "name": "1kg"},
      "wpu": 1000.0
    }
  ],
  "imageUrls": [
    "https://example.com/products/coffee-001-main.jpg",
    "https://example.com/products/coffee-001-pack.jpg"
  ]
}
```

**Success Response (200):**
```json
{
  "status": null,
  "message": "Success",
  "desc": "Product successfully added.",
  "exData": null
}
```

**Error Response - Duplicate Code (400):**
```json
{
  "status": 400,
  "message": "error",
  "desc": "Failed to add this product.",
  "exData": {
    "code": "Product already exists with this code"
  }
}
```

**Error Response - Duplicate Name (400):**
```json
{
  "status": 400,
  "message": "error",
  "desc": "Failed to add this product.",
  "exData": {
    "name": "Product already exists with this name"
  }
}
```

**Key Features:**
- ✅ Validates unique product code and name
- ✅ Supports multiple stock variants (different sizes, colors)
- ✅ Associates multiple product images
- ✅ Transactional - all-or-nothing operation
- ✅ Auto-generates product and stock IDs

---

### 2. **Get Product By ID** - Retrieve Product Details
```http
GET /api/v1/products/get-products-by-id?id=<product_id>
```

**Description:** Retrieves detailed information about a specific product by its ID.

**Query Parameters:**
- `id` (required): Product ID (integer)

**Example:**
```
GET /api/v1/products/get-products-by-id?id=5
```

**Success Response (200):**
```json
{
  "status": null,
  "message": "Success",
  "desc": "Product found.",
  "exData": {
    "id": 5,
    "name": "Premium Organic Coffee Beans",
    "code": "COFFEE-001",
    "marketId": 1,
    "brand": {
      "id": 5,
      "name": "Bean Masters",
      "marketId": 1,
      "category": {
        "id": 3,
        "name": "Beverages",
        "markets": {
          "id": 1,
          "name": "Green Valley Market"
        }
      }
    }
  }
}
```

**Error Response (404):**
```json
{
  "status": 400,
  "message": "error",
  "desc": "Product not found with id: 5",
  "exData": null
}
```

---

### 3. **Get Brands** - List Brands with Pagination & Filtering
```http
GET /api/v1/products/get-brands
Content-Type: application/json
```

**Description:** Retrieves a paginated list of brands with optional filtering by market, category, brand ID, or search term.

**Request Body:**
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "marketId": 1,
  "categoryId": 3,
  "brandId": null,
  "search": "Bean"
}
```

**Request Parameters:**
- `pageNumber` (required): Page number (0-based indexing)
- `countPerPage` (required): Number of items per page
- `marketId` (optional): Filter by market ID
- `categoryId` (optional): Filter by category ID
- `brandId` (optional): Filter by specific brand ID (returns only that brand if provided)
- `search` (optional): Search by brand name (case-insensitive, partial match)

**Success Response (200):**
```json
{
  "status": null,
  "message": "Success",
  "desc": "Brands fetched successfully.",
  "exData": {
    "pageNumber": 0,
    "countPerPage": 10,
    "categoryId": 3,
    "brandId": null,
    "marketId": 1,
    "totalCount": 25,
    "totalPages": 3,
    "search": "Bean",
    "items": [
      {
        "id": 5,
        "name": "Bean Masters",
        "marketId": 1,
        "category": {
          "id": 3,
          "name": "Beverages",
          "markets": null
        }
      },
      {
        "id": 12,
        "name": "Golden Bean Co.",
        "marketId": 1,
        "category": {
          "id": 3,
          "name": "Beverages",
          "markets": null
        }
      }
    ]
  }
}
```

**Key Features:**
- ✅ Pagination support (page-based)
- ✅ Filter by market, category, or specific brand
- ✅ Search by brand name (partial match)
- ✅ Returns total count and total pages
- ✅ Category markets field set to null for cleaner response

---

### 4. **Get Categories** - List Categories with Pagination & Filtering
```http
GET /api/v1/products/get-categories
Content-Type: application/json
```

**Description:** Retrieves a paginated list of categories with optional filtering by market, category ID, or search term.

**Request Body:**
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "marketId": 1,
  "categoryId": null,
  "brandId": null,
  "search": "Bev"
}
```

**Request Parameters:**
- `pageNumber` (required): Page number (0-based indexing)
- `countPerPage` (required): Number of items per page
- `marketId` (optional): Filter by market ID
- `categoryId` (optional): Filter by specific category ID (returns only that category if provided)
- `brandId` (optional): Not used for categories (will be ignored)
- `search` (optional): Search by category name (case-insensitive, partial match)

**Success Response (200):**
```json
{
  "status": null,
  "message": "Success",
  "desc": "Brands fetched successfully.",
  "exData": {
    "pageNumber": 0,
    "countPerPage": 10,
    "categoryId": null,
    "brandId": null,
    "marketId": 1,
    "totalCount": 15,
    "totalPages": 2,
    "search": "Bev",
    "items": [
      {
        "id": 3,
        "name": "Beverages",
        "markets": {
          "id": 1
        }
      },
      {
        "id": 8,
        "name": "Beverage Mixers",
        "markets": {
          "id": 1
        }
      }
    ]
  }
}
```

**Key Features:**
- ✅ Pagination support (page-based)
- ✅ Filter by market or specific category
- ✅ Search by category name (partial match)
- ✅ Returns total count and total pages
- ✅ Markets field returns only ID for cleaner response

---

### 5. **Get Products** - List Products with Pagination & Filtering
```http
GET /api/v1/products/get-products
Content-Type: application/json
```

**Description:** Retrieves a paginated list of products with optional filtering by market, category, brand, specific product ID, or search term.

**Request Body:**
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "marketId": 1,
  "categoryId": 3,
  "brandId": 5,
  "productId": null,
  "search": "Coffee"
}
```

**Request Parameters:**
- `pageNumber` (required): Page number (0-based indexing)
- `countPerPage` (required): Number of items per page
- `marketId` (optional): Filter by market ID (filters via brand relationship)
- `categoryId` (optional): Filter by category ID (filters via brand.category relationship)
- `brandId` (optional): Filter by brand ID
- `productId` (optional): Filter by specific product ID (returns only that product if provided)
- `search` (optional): Search by product name or code (case-insensitive, partial match)

**Success Response (200):**
```json
{
  "status": null,
  "message": "Success",
  "desc": "Products fetched successfully.",
  "exData": {
    "pageNumber": 0,
    "countPerPage": 10,
    "categoryId": 3,
    "productId": null,
    "brandId": 5,
    "marketId": 1,
    "totalCount": 42,
    "totalPages": 5,
    "search": "Coffee",
    "items": [
      {
        "id": 5,
        "name": "Premium Organic Coffee Beans",
        "code": "COFFEE-001",
        "marketId": 1,
        "brand": {
          "id": 5,
          "name": "Bean Masters",
          "marketId": 1,
          "category": {
            "id": 3,
            "name": "Beverages",
            "markets": null
          }
        },
        "productImages": [
          {
            "id": 10,
            "imageUrl": "https://example.com/products/coffee-001-main.jpg",
            "products": null
          },
          {
            "id": 11,
            "imageUrl": "https://example.com/products/coffee-001-pack.jpg",
            "products": null
          }
        ]
      },
      {
        "id": 12,
        "name": "Instant Coffee Mix",
        "code": "COFFEE-002",
        "marketId": 1,
        "brand": {
          "id": 5,
          "name": "Bean Masters",
          "marketId": 1,
          "category": {
            "id": 3,
            "name": "Beverages",
            "markets": null
          }
        },
        "productImages": [
          {
            "id": 20,
            "imageUrl": "https://example.com/products/coffee-002-main.jpg",
            "products": null
          }
        ]
      }
    ]
  }
}
```

**Key Features:**
- ✅ Pagination support (page-based)
- ✅ Filter by market, category, brand, or specific product ID
- ✅ Search by product name OR code (partial match)
- ✅ Returns total count and total pages
- ✅ Includes product images with each product
- ✅ Brand category markets field set to null for cleaner response
- ✅ Product images products field set to null to prevent circular references

---

## 📝 Validation Rules

### User Fields
- **firstName/lastName**: 2-45 characters, required
- **dob**: Past or present date (format: `YYYY-MM-DD`)
- **nic**: 9-12 characters (format: `\d{9}[VvXx]` or `\d{12}`)
- **email**: Valid email, 10-100 characters
- **password**: 8-64 characters, must include:
  - ✓ Uppercase letter
  - ✓ Lowercase letter
  - ✓ Digit
  - ✓ Special character (@$!%*?&)
- **profileImg**: Optional, max 100 characters

### Email Fields
- **email**: Valid email, 10-100 characters
- **subject**: Required, max 200 characters
- **design**: Required, HTML email template
- **url**: Required, must start with `http://` or `https://`, max 2048 characters

### Product Fields
- **products.name**: Required, max 45 characters, must be unique
- **products.code**: Required, max 30 characters, must be unique
- **products.marketId**: Required, integer
- **products.brand**: Required, must contain valid brand information
- **stocks**: Required, array with at least one stock entry
- **stocks[].desc**: Required, variant description
- **stocks[].cost**: Required, positive number (cost price)
- **stocks[].sellingPrice**: Required, positive number (selling price)
- **stocks[].qty**: Required, positive number (quantity available)
- **stocks[].unit**: Required, contains unit information
- **stocks[].color**: Required, max 10 characters
- **stocks[].wpu**: Required, positive number (weight per unit)
- **imageUrls**: Required, array of image URL strings

### Pagination & Filter Fields
- **pageNumber**: Required, integer (0-based indexing, e.g., 0 for first page)
- **countPerPage**: Required, integer (number of items per page)
- **marketId**: Optional, integer (filter by market)
- **categoryId**: Optional, integer (filter by category)
- **brandId**: Optional, integer (filter by brand)
- **search**: Optional, string (partial match search on name field)

---

## 🔄 Response Structure

All endpoints return:
```json
{
  "status": 200,              // HTTP status code
  "message": "success",       // "success" or "error"
  "desc": "Description",      // Human-readable message
  "exData": {}               // Additional data or null
}
```

### Common Status Codes
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `409` - Conflict
- `500` - Internal Server Error

---

## ⚠️ Error Response Example

```json
{
  "status": 400,
  "message": "error",
  "desc": "Validation failed",
  "exData": {
    "email": "Invalid email format",
    "password": "Password must include uppercase, lowercase, digit and special character"
  }
}
```

---

## 🧪 Testing with cURL

### Sign Up
```bash
curl -X POST http://localhost:8080/api/v1/users/sign-up \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","dob":"1990-05-15","nic":"901234567V","email":"john.doe@example.com","password":"SecurePass123!","gender":{"id":1,"name":"Male"},"userRole":{"id":2,"name":"Customer"},"verificationStatus":{"id":1,"name":"Pending"}}'
```

### Login
```bash
curl -X POST http://localhost:8080/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@example.com","password":"SecurePass123!"}'
```

### Update User (Authenticated)
```bash
curl -X POST http://localhost:8080/api/v1/users/update-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"firstName":"John","lastName":"Smith","dob":"1990-05-15","nic":"901234567V","email":"john.smith@example.com","password":"NewSecurePass123!","gender":{"id":1,"name":"Male"},"userRole":{"id":2,"name":"Customer"},"verificationStatus":{"id":2,"name":"Verified"}}'
```

### Get User By ID (Authenticated)
```bash
curl -X GET http://localhost:8080/api/v1/users/get-user-by-id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Admin Update User
```bash
curl -X POST http://localhost:8080/api/v1/users/admin/update-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{"id":5,"firstName":"John","lastName":"Smith","dob":"1990-05-15","nic":"901234567V","email":"john.smith@example.com","password":"NewSecurePass123!","gender":{"id":1,"name":"Male"},"userRole":{"id":3,"name":"Admin"},"verificationStatus":{"id":2,"name":"Verified"}}'
```

### Admin Get User By ID
```bash
curl -X GET "http://localhost:8080/api/v1/users/admin/get-user-by-id?id=5" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Send Verification Email
```bash
curl -X POST http://localhost:8080/api/v1/email/send-verify-email \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@example.com","subject":"Verify Your Email","design":"<html><body><a href=\"{{verification_link}}\">Click to verify</a></body></html>","url":"https://deliveryya.com/verify"}'
```

### Verify Email By Token
```bash
curl -X GET "http://localhost:8080/api/v1/email/verify-email-by-token?token=YOUR_JWT_TOKEN_HERE"
```

### Set Product
```bash
curl -X POST http://localhost:8080/api/v1/products/set-product \
  -H "Content-Type: application/json" \
  -d '{
    "products": {
      "name": "Premium Organic Coffee Beans",
      "code": "COFFEE-001",
      "marketId": 1,
      "brand": {
        "id": 5,
        "name": "Bean Masters",
        "marketId": 1,
        "category": {
          "id": 3,
          "name": "Beverages",
          "markets": {
            "id": 1,
            "name": "Green Valley Market",
            "desc": "Fresh organic products",
            "isActive": true
          }
        }
      }
    },
    "stocks": [
      {
        "desc": "500g pack - Dark Roast",
        "cost": 1200.00,
        "sellingPrice": 1650.00,
        "qty": 100.0,
        "unit": {"id": 2, "name": "grams"},
        "color": "Brown",
        "sizes": {"id": 1, "name": "500g"},
        "wpu": 500.0
      }
    ],
    "imageUrls": ["https://example.com/products/coffee-001-main.jpg"]
  }'
```

### Get Product By ID
```bash
curl -X GET "http://localhost:8080/api/v1/products/get-products-by-id?id=5"
```

### Get Brands
```bash
curl -X GET http://localhost:8080/api/v1/products/get-brands \
  -H "Content-Type: application/json" \
  -d '{
    "pageNumber": 0,
    "countPerPage": 10,
    "marketId": 1,
    "categoryId": 3,
    "search": "Bean"
  }'
```

### Get Categories
```bash
curl -X GET http://localhost:8080/api/v1/products/get-categories \
  -H "Content-Type: application/json" \
  -d '{
    "pageNumber": 0,
    "countPerPage": 10,
    "marketId": 1,
    "search": "Bev"
  }'
```

### Get Products
```bash
curl -X GET http://localhost:8080/api/v1/products/get-products \
  -H "Content-Type: application/json" \
  -d '{
    "pageNumber": 0,
    "countPerPage": 10,
    "marketId": 1,
    "categoryId": 3,
    "brandId": 5,
    "search": "Coffee"
  }'
```

---

## 📦 Stock Endpoints

### 1. **Get Stocks** - Retrieve Stocks with Flexible Filtering
```http
GET /api/v1/stocks/get-stocks
Content-Type: application/json
```

**Request Body:**
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "stockId": 5,
  "marketId": 1,
  "categoryId": 3,
  "brandId": 5,
  "productId": 2,
  "search": "Samsung"
}
```

**Query Parameters (all optional except pagination):**
- `pageNumber` (required): Page index (0-based)
- `countPerPage` (required): Items per page
- `stockId`: Get specific stock by ID - returns single stock
- `marketId`: Filter by market - returns all stocks in that market
- `categoryId`: Filter by category - returns all stocks in that category
- `brandId`: Filter by brand - returns all stocks of that brand
- `productId`: Filter by product - returns all variants of that product
- `search`: Search by product name or code (case-insensitive)

**Success Response (200):**
```json
{
  "message": "Success",
  "desc": "Stocks fetched successfully.",
  "object": {
    "pageNumber": 0,
    "countPerPage": 10,
    "totalCount": 25,
    "totalPages": 3,
    "marketId": 1,
    "categoryId": null,
    "brandId": null,
    "productId": null,
    "search": null,
    "items": [
      {
        "id": 1,
        "desc": "Samsung Galaxy S21 - Black, 128GB",
        "cost": 800.0,
        "showingPrice": 1000.0,
        "sellingPrice": 950.0,
        "qty": 50.0,
        "unit": {
          "id": 1,
          "name": "pcs"
        },
        "products": {
          "id": 1,
          "name": "Samsung Galaxy S21",
          "code": "SAMS21",
          "brand": {
            "id": 1,
            "name": "Samsung"
          },
          "marketId": 1
        },
        "emi": "EMI001",
        "color": "Black",
        "sizes": null,
        "wpu": 1.0
      }
    ]
  }
}
```

**Use Cases:**
- **Get specific stock by ID**: Set only `stockId`
- **Get all stocks in a market**: Set only `marketId`
- **Get all stocks in a category**: Set only `categoryId`
- **Get all stocks of a brand**: Set only `brandId`
- **Get product variants**: Set only `productId`
- **Combined filters**: Use multiple filters together (e.g., market + category)
- **Search**: Use `search` to find products by name or code

**Filtering Behavior:**
- All filters are optional and can be combined
- Multiple filters use AND logic
- Search uses OR logic (name OR code)
- Zero/null values are ignored
- Blank search strings are ignored

---

## 🔧 cURL Examples - Stock Endpoints

### Get Specific Stock by ID
```bash
curl -X GET http://localhost:8080/api/v1/stocks/get-stocks \
  -H "Content-Type: application/json" \
  -d '{
    "pageNumber": 0,
    "countPerPage": 10,
    "stockId": 5
  }'
```

### Get All Stocks (No Filters)
```bash
curl -X GET http://localhost:8080/api/v1/stocks/get-stocks \
  -H "Content-Type: application/json" \
  -d '{
    "pageNumber": 0,
    "countPerPage": 20
  }'
```

### Get Stocks by Market
```bash
curl -X GET http://localhost:8080/api/v1/stocks/get-stocks \
  -H "Content-Type: application/json" \
  -d '{
    "pageNumber": 0,
    "countPerPage": 20,
    "marketId": 1
  }'
```

### Get Stocks by Category
```bash
curl -X GET http://localhost:8080/api/v1/stocks/get-stocks \
  -H "Content-Type: application/json" \
  -d '{
    "pageNumber": 0,
    "countPerPage": 20,
    "categoryId": 1
  }'
```

### Get Stocks by Brand
```bash
curl -X GET http://localhost:8080/api/v1/stocks/get-stocks \
  -H "Content-Type: application/json" \
  -d '{
    "pageNumber": 0,
    "countPerPage": 20,
    "brandId": 1
  }'
```

### Get Product Variants
```bash
curl -X GET http://localhost:8080/api/v1/stocks/get-stocks \
  -H "Content-Type: application/json" \
  -d '{
    "pageNumber": 0,
    "countPerPage": 10,
    "productId": 1
  }'
```

### Search Stocks
```bash
curl -X GET http://localhost:8080/api/v1/stocks/get-stocks \
  -H "Content-Type: application/json" \
  -d '{
    "pageNumber": 0,
    "countPerPage": 10,
    "search": "Samsung"
  }'
```

### Combined Filters (Market + Category + Search)
```bash
curl -X GET http://localhost:8080/api/v1/stocks/get-stocks \
  -H "Content-Type: application/json" \
  -d '{
    "pageNumber": 0,
    "countPerPage": 10,
    "marketId": 1,
    "categoryId": 1,
    "search": "Phone"
  }'
```

---

## 📚 Additional Resources

- **Full API Documentation**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Quick Reference Card**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

---

**Last Updated:** February 4, 2026
