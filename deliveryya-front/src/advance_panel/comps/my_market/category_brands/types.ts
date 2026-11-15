export type CategoryStatus = 'active' | 'inactive';

export interface Category {
  id: number;
  name: string;
  status: CategoryStatus;
  productsCount: number;
  markets?: { id: number } | null;
  brands: Brand[];
}

export interface Brand {
  id: number;
  name: string;
  status: CategoryStatus;
  productsCount: number;
  marketId: number;
  markets?: { id: number } | null;
  products: Product[];
}

export interface Product {
  id: number;
  name: string;
  code: string;
  description?: string;
  category?: string | { id: number; name: string };
  categoryId?: number;
  price: number;
  oldPrice?: number;
  image?: string;
  isActive: boolean;
  stock?: number;
  rating?: number;
  reviews?: number;
  sold?: number;
  cost?: number;
  showingPrice?: number;
  sellingPrice?: number;
  unit?: string;
  color?: string;
  emi?: string;
  weight?: number;
  createdAt?: string;
  productImages?: Array<{ id: number; imageUrl: string }>;
  brand?: { id: number; name: string };
  marketId?: number;
}