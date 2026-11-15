import { baseURL } from "../../util/AxiosUtil";
import { formatLkr, parseCurrencyToNumber } from "../../util/CurrencyUtil";
import type { NewArrivalProduct } from "./ProductCard";

export type ApiProductImage = {
  id?: number;
  imageUrl?: string | null;
  url?: string | null;
  isDefault?: boolean | null;
  products?: null;
};

export type ApiProductBrand = {
  id: number;
  name: string | null;
  marketId?: number | null;
  markets?: { id: number } | null;
};

export type ApiProduct = {
  id: number;
  name: string | null;
  desc?: string | null;
  code?: string | null;
  brand?: ApiProductBrand | null;
  category?: {
    id: number;
    name: string | null;
    markets?: { id: number } | null;
    img?: string | null;
    isDeleted?: boolean | null;
    isActive?: boolean | null;
  } | null;
  marketId?: number | null;
  sellingPrice?: string | number | null;
  showingPrice?: string | number | null;
  isActive?: boolean | null;
  rating?: number | null;
  availableTotalStockQty?: number | null;
  productImages?: ApiProductImage[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type GetProductsPayload = {
  pageNumber: number;
  countPerPage: number;
  categoryId: number | null;
  productId: number | null;
  brandId: number | null;
  marketId: number | null;
  totalCount: number;
  totalPages: number;
  getActiveStocksCount?: boolean;
  orderByTopSales: boolean | null;
  orderByMaxPrice: boolean | null;
  orderByLowPrice: boolean | null;
  trendingProducts: boolean | null;
  isActive: boolean | null;
  fromPrice: number | null;
  toPrice: number | null;
  orderByRate: number | null;
  fromDate: string | null;
  toDate: string | null;
  getProductPriceAsStocks: "Lowest" | "Middle" | "Highest" | null;
  search: string;
  DEFAULT_GET_PRODUCT_PRICE_AS_STOCKS: "Middle";
};

type PagedResponseObject<T> = {
  pageNumber?: number;
  countPerPage?: number;
  totalCount?: number;
  totalPages?: number;
  items?: T[];
};

export type PagedResponse<T> = {
  status?: number | null;
  message?: string | null;
  desc?: string | null;
  exData?: PagedResponseObject<T> | null;
  object?: PagedResponseObject<T> | null;
};

export type ProductsPage = {
  items: ApiProduct[];
  pageNumber: number;
  countPerPage: number;
  totalCount: number;
  totalPages: number;
};

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523275335684-37898b45f666?w=800&q=80";

export const createGetProductsPayload = (
  overrides: Partial<GetProductsPayload> = {}
): GetProductsPayload => ({
  pageNumber: 0,
  countPerPage: 8,
  categoryId: null,
  productId: null,
  brandId: null,
  marketId: null,
  totalCount: 0,
  totalPages: 0,
  orderByTopSales: null,
  orderByMaxPrice: null,
  orderByLowPrice: null,
  trendingProducts: null,
  isActive: true,
  fromPrice: null,
  toPrice: null,
  orderByRate: null,
  fromDate: null,
  toDate: null,
  getProductPriceAsStocks: null,
  search: "",
  DEFAULT_GET_PRODUCT_PRICE_AS_STOCKS: "Middle",
  ...overrides,
});

export const extractProductsPage = (
  response: PagedResponse<ApiProduct>,
  fallbackPayload: GetProductsPayload
): ProductsPage => {
  const responseObject = response.object ?? response.exData ?? {};
  const items = responseObject.items ?? [];
  const pageNumber = responseObject.pageNumber ?? fallbackPayload.pageNumber;
  const countPerPage = responseObject.countPerPage ?? fallbackPayload.countPerPage;
  const totalCount = responseObject.totalCount ?? items.length;
  const calculatedPages = countPerPage > 0 ? Math.ceil(totalCount / countPerPage) : 1;
  const totalPages = Math.max(1, responseObject.totalPages ?? calculatedPages);

  return {
    items,
    pageNumber,
    countPerPage,
    totalCount,
    totalPages,
  };
};

export const normalizeProductImageUrl = (url?: string | null): string => {
  if (!url) return FALLBACK_PRODUCT_IMAGE;

  const cleanedUrl = url.replace(/\\/g, "/").trim();
  if (!cleanedUrl) return FALLBACK_PRODUCT_IMAGE;
  if (cleanedUrl.startsWith("http://") || cleanedUrl.startsWith("https://")) {
    return cleanedUrl;
  }
  if (cleanedUrl.startsWith("/")) {
    return `${baseURL}/uploads${cleanedUrl}`;
  }

  return `${baseURL}/uploads/${cleanedUrl}`;
};

export const clampProductRating = (rating?: number | null): number => {
  const numericRating = Number(rating ?? 0);
  if (!Number.isFinite(numericRating)) return 0;
  return Math.min(5, Math.max(0, numericRating));
};

export const mapApiProductToCardProduct = (
  product: ApiProduct,
  options: { isNew?: boolean } = {}
): NewArrivalProduct => {
  const productImages = product.productImages ?? [];
  const primaryImage =
    productImages.find((image) => image.isDefault)?.imageUrl ??
    productImages.find((image) => image.isDefault)?.url ??
    productImages[0]?.imageUrl ??
    productImages[0]?.url;
  const sellingPrice = parseCurrencyToNumber(product.sellingPrice);
  const showingPrice = parseCurrencyToNumber(product.showingPrice);
  const currentPrice = sellingPrice || showingPrice || 0;
  const availableStock = Number(product.availableTotalStockQty ?? 0);

  return {
    id: product.id,
    marketId: Number.isFinite(Number(product.marketId)) ? Number(product.marketId) : undefined,
    title: product.name?.trim() || "Untitled Product",
    price: formatLkr(currentPrice),
    oldPrice: showingPrice > currentPrice ? formatLkr(showingPrice) : undefined,
    rating: clampProductRating(product.rating),
    stockQty: Number.isFinite(availableStock) ? Math.max(0, availableStock) : 0,
    img: normalizeProductImageUrl(primaryImage),
    isNew: options.isNew,
    category: product.category?.name || undefined,
    inStock: Number(product.availableTotalStockQty ?? 0) > 0,
  };
};

export const mergeUniqueProducts = <T extends { id?: number }>(previous: T[], next: T[]): T[] => {
  const productsById = new Map<number, T>();
  previous.forEach((product) => {
    if (typeof product.id === "number") {
      productsById.set(product.id, product);
    }
  });
  next.forEach((product) => {
    if (typeof product.id === "number") {
      productsById.set(product.id, product);
    }
  });

  return Array.from(productsById.values());
};

const formatLocalDateTime = (date: Date, endOfDay = false): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T${endOfDay ? "23:59:59" : "00:00:00"}`;
};

export const getRecentDateRange = (daysBack: number): { fromDate: string; toDate: string } => {
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - daysBack);

  return {
    fromDate: formatLocalDateTime(fromDate),
    toDate: formatLocalDateTime(toDate, true),
  };
};
