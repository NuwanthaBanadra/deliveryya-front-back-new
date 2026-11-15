export interface ProductVariant {
  id: string;
  color: string;
  colorName?: string;
  size: string;
  showingPrice: string;
  sellingPrice: string;
  cost: string;
  weight: string;
  unit: string;
  quantity: string;
  emi?: string;
  description?: string;
  unitId?: number;
  sizeId?: number;
  isActive?: boolean;
}

export interface ProductFormData {
  // Product Description
  productName: string;
  code: string;
  category: string;
  categoryId: number;
  brand: string;
  brandId: number;
  marketId: number;
  description: string;

  // Product Variants
  variants: ProductVariant[];

  // Product Images
  images: Array<File | string>;
  
  // Optional fields
  price?: string | number | readonly string[] | undefined;
  discount?: string | number | readonly string[] | undefined;
  stockQuantity?: string | number | readonly string[] | undefined;
  availabilityStatus?: string | number | readonly string[] | undefined;
}