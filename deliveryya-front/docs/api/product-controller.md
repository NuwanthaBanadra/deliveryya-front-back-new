# Product Controller API

## 1) Overview

This document summarizes the routes exposed by `ProductController` and the most important request/response rules around them.

- **Base URL:** `http://localhost:8080/api/v1/products`
- **Content Type:** `application/json` unless the route uses query parameters
- **Primary response wrapper:** `ResponseDto<T>`
- **Authentication:** JWT-based security for most routes
- **Public route:** `POST /api/v1/products/get-products` is listed in `SecurityConfig.PUBLIC_PATTERNS`

---

## 2) Standard Response Pattern

Most endpoints return a response similar to:

```json
{
  "status": 200,
  "message": "Success",
  "desc": "Human readable description",
  "object": {}
}
```

Common fields used by the backend:
- `message`: usually `Success` or `Error`
- `desc`: human readable description
- `object`: response payload
- `exData`: validation/business error details when applicable

---

## 3) Endpoint Summary

| Method | Path | Auth | Purpose |
|---|---|---:|---|
| POST | `/set-product` | Yes | Create a new product with images and stocks |
| POST | `/update-product` | Yes | Update product metadata and images |
| GET | `/get-products-by-id?id={id}` | Yes | Fetch one product by ID |
| POST | `/get-brands` | Yes | Get paginated brands |
| POST | `/get-categories` | Yes | Get paginated categories |
| POST | `/get-products` | No | Get paginated products |
| GET | `/get-units` | Yes | Get all units |
| GET | `/get-sizes` | Yes | Get sizes for the authenticated user |
| DELETE | `/delete-product-by-id?id={id}` | Yes | Soft-delete a product |
| PUT | `/update-product-status?productId={id}&isActive={bool}` | Yes | Update product active status |
| PUT | `/set-default-image?productImageId={id}` | Yes | Mark a product image as default |
| POST | `/set-brand` | Yes | Create a brand |
| POST | `/set-category` | Yes | Create a category |
| DELETE | `/delete-brand?id={id}` | Yes | Soft-delete a brand |
| DELETE | `/delete-category?id={id}` | Yes | Soft-delete a category |
| PUT | `/update-brand-status?id={id}&isActive={bool}` | Yes | Update brand active status |
| PUT | `/update-category-status?id={id}&isActive={bool}` | Yes | Update category active status |

---

## 4) Detailed Endpoint Notes

### 4.1 Create Product
**POST** `/set-product`

Creates a product together with its stocks and uploaded image URLs.

#### Request shape
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
        "markets": { "id": 1 }
      }
    }
  },
  "stocks": [
    {
      "cost": 1200,
      "showingPrice": 1800,
      "sellingPrice": 1650,
      "qty": 100,
      "unit": { "id": 2, "name": "grams" },
      "color": "Brown",
      "sizes": { "id": 1, "name": "500g" },
      "wpu": 500
    }
  ],
  "imageUrls": [
    "https://example.com/products/coffee-001-main.jpg"
  ]
}
```

#### Notes
- Product images are moved/processed by the service layer.
- The first image is treated as the default image.
- New products start as inactive in service logic.

---

### 4.2 Update Product
**POST** `/update-product`

Updates product metadata and replaces the product image set.

#### Request example
```json
{
  "id": 5,
  "name": "Coffee Premium",
  "desc": "Arabica",
  "code": "COF-001",
  "brand": {
    "id": 5,
    "name": "Bean Masters"
  },
  "marketId": 1,
  "isActive": true,
  "productImages": [
    {
      "url": "https://example.com/products/coffee-001-main.jpg",
      "isDefault": true
    }
  ]
}
```

#### Notes
- If `isActive` is present, it will be applied.
- Existing images not included in the request are removed/replaced.
- The service keeps the first image as default if no image is marked default.

---

### 4.3 Get Product By ID
**GET** `/get-products-by-id?id={id}`

Returns one product with its visible stock selection and related metadata.

#### Example
```http
GET /api/v1/products/get-products-by-id?id=5
```

#### Notes
- The service checks that the associated brand/category are not deleted.
- The response includes pricing fields derived from the selected stock.

---

### 4.4 Get Products
**POST** `/get-products`

Returns paginated products based on filters.

#### Example request
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "marketId": 1,
  "categoryId": 3,
  "brandId": 5,
  "search": "Coffee",
  "isActive": true,
  "inStock": true,
  "fromPrice": 1000,
  "toPrice": 2500,
  "getProductPriceAsStocks": "Middle",
  "getActiveStocksCount": true
}
```

#### Notes
- This route is publicly accessible according to `SecurityConfig`.
- Filtering supports `brandId`, `categoryId`, `marketId`, `productId`, `search`, `isActive`, `inStock`, `fromPrice`, and `toPrice`.
- `inStock: true` returns only products with at least one related stock where `qty > 0`; `false` or missing does not apply the filter.
- Price filtering uses the selected stock price chosen by `getProductPriceAsStocks` (`Lowest`, `Middle`, or `Highest`).
- `getActiveStocksCount` controls stock quantity calculation in `availableTotalStockQty` field:
  - `true` (default): only counts active stocks (isActive = true)
  - `false`: only counts inactive stocks (isActive = false)
  - `null`: counts all stocks regardless of status
- Sorting options such as top sales, max price, low price, and rating are supported by the DTO.

---

### 4.5 Get Units
**GET** `/get-units`

Returns all available units.

#### Example
```http
GET /api/v1/products/get-units
```

---

### 4.6 Get Sizes
**GET** `/get-sizes`

Returns sizes visible to the authenticated user.

#### Example
```http
GET /api/v1/products/get-sizes
```

#### Notes
- This endpoint uses the authenticated principal.
- The controller extracts the user ID from `UserDetails`.

---

### 4.7 Delete Product
**DELETE** `/delete-product-by-id?id={id}`

Soft-deletes a product and also marks its stocks as deleted.

#### Example
```http
DELETE /api/v1/products/delete-product-by-id?id=5
```

---

### 4.8 Update Product Status
**PUT** `/update-product-status?productId={id}&isActive={bool}`

Updates the product active flag.

#### Example
```http
PUT /api/v1/products/update-product-status?productId=5&isActive=false
```

#### Notes
- The service also updates the related stocks.
- Current service logic sets related stocks to active when this endpoint runs.

---

### 4.9 Set Default Image
**PUT** `/set-default-image?productImageId={id}`

Marks a single product image as default and clears the default flag from the others.

#### Example
```http
PUT /api/v1/products/set-default-image?productImageId=12
```

---

## 5) Brand & Category Routes

### 5.1 Get Brands
**POST** `/get-brands`

#### Example request
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "marketId": 1,
  "search": "Bean"
}
```

### 5.2 Set Brand
**POST** `/set-brand`

Creates a new brand under a category.

### 5.3 Update Brand Status
**PUT** `/update-brand-status?id={id}&isActive={bool}`

Updates the brand active flag.

### 5.4 Delete Brand
**DELETE** `/delete-brand?id={id}`

Soft-deletes a brand and disables it.

### 5.5 Get Categories
**POST** `/get-categories`

#### Example request
```json
{
  "pageNumber": 0,
  "countPerPage": 10,
  "marketId": 1,
  "search": "Bev"
}
```

### 5.6 Set Category
**POST** `/set-category`

Creates a new category under a market.

### 5.7 Update Category Status
**PUT** `/update-category-status?id={id}&isActive={bool}`

Updates the category active flag.

### 5.8 Delete Category
**DELETE** `/delete-category?id={id}`

Soft-deletes a category and disables it.

---

## 6) DTO & Validation Summary

### `ProductDto`
- `name` — required, max 45 chars
- `desc` — required
- `code` — required, max 30 chars
- `brand` — required
- `marketId` — required
- `isActive` — optional
- `productImages` — optional list

### `StockDto`
- `cost` — required
- `sellingPrice` — required
- `qty` — required
- `unit` — required
- `products` — required in update flows
- `color` — required, max 10 chars
- `wpu` — required
- `emi` — max 45 chars
- `isActive` — optional

### `PaginatedProductDto`
- `pageNumber` — required
- `countPerPage` — required
- filter fields include `brandId`, `categoryId`, `marketId`, `productId`, `isActive`, `inStock`, `fromPrice`, `toPrice`, and `search`
- `getProductPriceAsStocks` controls which stock price is treated as the final returned price for filtering
- `getActiveStocksCount` — optional flag (default: true) controlling how `availableTotalStockQty` is calculated:
  - `true`: counts only active stocks (stock.isActive = true)
  - `false`: counts only inactive stocks (stock.isActive = false)
  - `null`: counts all stocks regardless of status

### Common supporting DTOs
- `SetProductsDto` — combines product metadata, stock variants, and image URLs
- `PaginatedBrandDto` / `PaginatedCategoryDto` — pagination plus search/filter fields
- `UnitDto` / `SizeDto` — lightweight lookup objects

---

## 7) Special Behaviors

1. **Soft delete behavior**: deleting a product, brand, or category does not necessarily remove the row; it marks it deleted/inactive in service logic.
2. **Image handling**: product images are processed and moved by the service layer; default image selection is handled automatically.
3. **Authenticated size lookup**: `GET /get-sizes` uses the authenticated user ID.
4. **Public product listing**: `POST /get-products` is publicly accessible in security config.
5. **Stock visibility**: the product service filters out deleted stocks when composing product responses.

---

## 8) Example cURL Calls

### Get products
```bash
curl -X POST http://localhost:8080/api/v1/products/get-products ^
  -H "Content-Type: application/json" ^
  -d "{\"pageNumber\":0,\"countPerPage\":10,\"marketId\":1,\"search\":\"Coffee\"}"
```

### Update product status
```bash
curl -X PUT "http://localhost:8080/api/v1/products/update-product-status?productId=5&isActive=false" ^
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Set default image
```bash
curl -X PUT "http://localhost:8080/api/v1/products/set-default-image?productImageId=12" ^
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 9) Related Files

- `src/main/java/com/kaleox/deliveryya/controller/ProductController.java`
- `src/main/java/com/kaleox/deliveryya/service/impl/ProductServiceImpl.java`
- `src/main/java/com/kaleox/deliveryya/dto/ProductDto.java`
- `src/main/java/com/kaleox/deliveryya/dto/StockDto.java`
- `src/main/java/com/kaleox/deliveryya/dto/paginatedDto/PaginatedProductDto.java`
- `src/main/java/com/kaleox/deliveryya/config/SecurityConfig.java`


