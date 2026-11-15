import { useEffect, useMemo, useState } from 'react';
import { PencilIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import CategoryCard from './CategoryCard';
import BrandList from './BrandList';
import type { Brand, Category, Product } from './types';
import axiosInstance, { baseURL } from '../../../../util/AxiosUtil';
import Swal from 'sweetalert2';
import AddProduct from '../AddProduct';
import VariantManager from '../product_maneger/VariantManager';
import type { ProductFormData, ProductVariant } from '../products/types';
import { useOutletContext } from 'react-router-dom';
import { hasAccess } from '../../../../util/AccessController';
import { FRONTEND_ACCESS_IDS } from '../../../../util/FrontendAccess';

// Type Definitions
type ApiResponse<T> = {
  status: number | null;
  message: string;
  desc: string;
  object?: T;
  exData?: T;
};
type MarketSize = { id: number; name: string; marketId?: number };

type Paged<T> = {
  pageNumber: number;
  countPerPage: number;
  totalCount: number;
  totalPages: number;
  items: T[];
};

// API Response Types
type ApiCategory = {
  id: number;
  name: string;
  markets?: { id: number } | null;
  marketId?: number | null;
  isActive?: boolean | null;
};
type ApiBrand = {
  id: number;
  name: string;
  markets?: { id: number } | null;
  marketId?: number | null;
  isActive?: boolean | null;
};

type BackendProductImage = {
  id: number;
  imageUrl?: string;
  url?: string;
  products: null;
};

type ApiProduct = {
  id: number;
  name: string;
  code: string;
  marketId: number;
  isActive?: boolean;
  brand: {
    id: number;
    name: string;
    marketId: number;
  };
  category: {
    id: number;
    name: string;
    markets: null;
  };
  productImages: BackendProductImage[] | null;
};

type ProductDetailsData = {
  id: number;
  name: string;
  code: string;
  marketId: number;
  brandName: string;
  categoryName: string;
};

type BackendStock = {
  id: number;
  desc: string;
  cost: number;
  showingPrice: number;
  sellingPrice: number;
  qty: number;
  unit: {
    id: number;
    name: string;
  };
  products: {
    id: number;
    name: string;
    code: string;
    brand: {
      id: number;
      name: string;
      markets?: {
        id: number;
      } | null;
    };
    marketId: number;
    productImages: Array<{
      id: number;
      imageUrl?: string;
      url?: string;
      products: null;
    }> | null;
  };
  emi: string;
  color: string;
  sizes: {
    id: number;
    name: string;
  } | null;
  wpu: number;
  isActive?: boolean;
};

type Unit = {
  id: number;
  name: string;
};

type UnitOption = {
  id?: number;
  name?: string;
  unitName?: string;
};

type FeedbackRow = {
  id: number;
  comment: string;
  rating: number;
  productId: number;
  userId?: number;
  userName?: string;
  createdAt?: string;
  updatedAt?: string;
};

interface CategoryBrandsManagerProps {
  marketIdOverride?: number | null;
}

function CategoryBrandsManager({ marketIdOverride }: CategoryBrandsManagerProps) {
  const outletContext = useOutletContext<{ marketId: number | null } | undefined>();
  const marketId = marketIdOverride ?? outletContext?.marketId ?? null;
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeManagerTab, setActiveManagerTab] = useState<'categories' | 'brands'>('categories');
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);
  const [expandedBrandIds, setExpandedBrandIds] = useState<Set<number>>(new Set());
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [loadingBrandsByCategoryId, setLoadingBrandsByCategoryId] = useState<Record<string, boolean>>({});
  const [loadingProductsByBrandId, setLoadingProductsByBrandId] = useState<Record<number, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{
    categoryId: number;
    brandId: number;
    product: Product;
  } | null>(null);
  const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [showDeleteBrandConfirm, setShowDeleteBrandConfirm] = useState(false);
  const [isDeletingBrand, setIsDeletingBrand] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<{
    categoryId: number;
    brand: Brand;
  } | null>(null);
  const [showProductFormModal, setShowProductFormModal] = useState(false);
  const [selectedProductForForm, setSelectedProductForForm] = useState<Product | null>(null);
  const [productFormContext, setProductFormContext] = useState<{
    categoryId: number;
    brandId: number;
    categoryName?: string;
    brandName?: string;
  } | null>(null);
  const canDeleteProducts = useMemo(() => hasAccess(FRONTEND_ACCESS_IDS.PRODUCT_DELETE), []);
  const canDeleteCategories = useMemo(() => hasAccess(FRONTEND_ACCESS_IDS.PRODUCT_CATEGORY_DELETE), []);
  const canDeleteBrands = useMemo(() => hasAccess(FRONTEND_ACCESS_IDS.PRODUCT_BRAND_DELETE), []);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [viewProductDetails, setViewProductDetails] = useState<ProductDetailsData | null>(null);
  const [viewProductImages, setViewProductImages] = useState<string[]>([]);
  const [viewSelectedImage, setViewSelectedImage] = useState<string | null>(null);
  const [viewDetailsError, setViewDetailsError] = useState<string | null>(null);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImageFile, setNewCategoryImageFile] = useState<File | null>(null);
  const [newCategoryImagePreview, setNewCategoryImagePreview] = useState<string>('');
  const [newBrandName, setNewBrandName] = useState('');
  const [sizes, setSizes] = useState<MarketSize[]>([]);
  const [sizeName, setSizeName] = useState('');
  const [editingSize, setEditingSize] = useState<MarketSize | null>(null);
  const [isSavingSize, setIsSavingSize] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isSubmittingBrand, setIsSubmittingBrand] = useState(false);
  const [showVariantsModal, setShowVariantsModal] = useState(false);
  const [variantsModalProduct, setVariantsModalProduct] = useState<Product | null>(null);
  const [variantFieldErrors, setVariantFieldErrors] = useState<Record<string, string>>({});
  const [isSavingVariants, setIsSavingVariants] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [variantFormData, setVariantFormData] = useState<ProductFormData>({
    productName: '',
    code: '',
    category: '',
    categoryId: 0,
    brand: '',
    brandId: 0,
    marketId: marketId ?? 0,
    description: '',
    variants: [],
    images: [],
  });
  const [feedbackProduct, setFeedbackProduct] = useState<Product | null>(null);
  const [feedbackRows, setFeedbackRows] = useState<FeedbackRow[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [deletingFeedbackIds, setDeletingFeedbackIds] = useState<Record<number, boolean>>({});

  const normalizeImageUrl = (url?: string | null) => {
    if (!url) return null;
    const cleanedUrl = url.replace(/\\/g, '/').trim();
    if (cleanedUrl.startsWith('http://') || cleanedUrl.startsWith('https://')) return cleanedUrl;
    if (cleanedUrl.startsWith('/')) return `${baseURL}/uploads${cleanedUrl}`;
    return `${baseURL}/uploads/${cleanedUrl}`;
  };

  const getErrorMessage = (error: any, fallback: string) => {
    const data = error?.response?.data;
    const exData = data?.exData;

    if (exData && typeof exData === 'object' && !Array.isArray(exData)) {
      const firstDetail = Object.values(exData).find((value) => String(value || '').trim());
      if (firstDetail) return String(firstDetail);
    }

    if (typeof exData === 'string' && exData.trim()) return exData.trim();
    if (typeof data?.desc === 'string' && data.desc.trim()) return data.desc.trim();
    if (typeof data?.message === 'string' && data.message.trim() && data.message !== 'Error') return data.message.trim();
    if (typeof error?.message === 'string' && error.message.trim()) return error.message.trim();
    return fallback;
  };

  const showToast = (icon: 'success' | 'error' | 'warning' | 'info', title: string, text: string) => {
    Swal.fire({
      icon,
      title,
      text,
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      timer: icon === 'error' ? 3500 : 2500,
    });
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  };

  const toUnitOptions = (rawUnits: UnitOption[]): Unit[] => {
    return rawUnits
      .map((unit, index) => ({
        id: typeof unit.id === 'number' ? unit.id : index + 1,
        name: (unit.name || unit.unitName || '').trim(),
      }))
      .filter((unit) => unit.name.length > 0);
  };

  const mergeUnits = (base: Unit[], next: Unit[]) => {
    const map = new Map<string, Unit>();
    base.forEach((unit) => map.set(unit.name.toLowerCase(), unit));
    next.forEach((unit) => {
      const key = unit.name.toLowerCase();
      if (!map.has(key)) map.set(key, unit);
    });
    return Array.from(map.values());
  };

  const mapCategory = (category: ApiCategory): Category => ({
    id: category.id,
    name: category.name,
    status: category.isActive === false ? 'inactive' : 'active',
    productsCount: 0,
    markets: category.markets ?? null,
    brands: []
  });

  const getCategoryMarketId = (category: ApiCategory): number | null => {
    const directMarketId = Number(category.marketId);
    if (Number.isFinite(directMarketId) && directMarketId > 0) return directMarketId;

    const nestedMarketId = Number(category.markets?.id);
    if (Number.isFinite(nestedMarketId) && nestedMarketId > 0) return nestedMarketId;

    return null;
  };

  const mapBrand = (brand: ApiBrand): Brand => ({
    id: brand.id,
    name: brand.name,
    status: brand.isActive === true ? 'active' : 'inactive',
    productsCount: 0,
    marketId: Number(brand.markets?.id ?? brand.marketId ?? marketId ?? 0),
    markets: brand.markets ?? null,
    products: []
  });

  const getProductsCountForBrand = async (brandId: number): Promise<number> => {
    const payload = { pageNumber: 0, countPerPage: 1, brandId };

    try {
      let response = await axiosInstance.post<ApiResponse<Paged<ApiProduct>>>(
        '/products/get-products',
        payload
      );

      const postItems = response.data.exData?.items || response.data.object?.items || [];
      const postTotalCount = response.data.exData?.totalCount ?? response.data.object?.totalCount;

      if (response.data.message === 'Success') {
        return postTotalCount ?? postItems.length;
      }

      response = await axiosInstance.get<ApiResponse<Paged<ApiProduct>>>(
        '/products/get-products',
        { params: payload }
      );

      const getItems = response.data.exData?.items || response.data.object?.items || [];
      const getTotalCount = response.data.exData?.totalCount ?? response.data.object?.totalCount;

      return response.data.message === 'Success' ? (getTotalCount ?? getItems.length) : 0;
    } catch (error) {
      console.warn(`Failed to load product count for brand ${brandId}:`, error);
      return 0;
    }
  };

  const mapProduct = (product: ApiProduct, primaryStock?: BackendStock): Product => {
    const productImages = product.productImages || [];
    const stockImages = primaryStock?.products?.productImages || [];
    const imagesSource = stockImages.length > 0 ? stockImages : productImages;

    const firstImage = imagesSource.length > 0
      ? normalizeImageUrl(imagesSource[0].imageUrl || imagesSource[0].url) || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80'
      : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80';

    const showingPrice = primaryStock?.showingPrice ?? 0;
    const sellingPrice = primaryStock?.sellingPrice ?? 0;
    const price = sellingPrice || showingPrice || 0;
    const oldPrice = showingPrice && sellingPrice && showingPrice > sellingPrice
      ? showingPrice
      : undefined;

    return {
      id: product.id,
      name: product.name,
      code: product.code,
      description: primaryStock?.desc || product.code || 'No description available',
      category: product.category,
      categoryId: product.category?.id,
      price,
      oldPrice,
      isActive: product.isActive ?? true,
      image: firstImage,
      stock: primaryStock?.qty ?? 0,
      brand: product.brand,
      marketId: product.marketId,
      rating: 4.5,
      reviews: 0,
      sold: 0,
      cost: primaryStock?.cost,
      showingPrice: primaryStock?.showingPrice,
      sellingPrice: primaryStock?.sellingPrice,
      unit: primaryStock?.unit?.name,
      color: primaryStock?.color,
      emi: primaryStock?.emi,
      weight: primaryStock?.wpu,
      createdAt: new Date().toISOString().split('T')[0],
    };
  };

  const loadCategories = async (scopeMarketId: number) => {
    setIsLoadingCategories(true);
    setCategoriesError(null);
    try {
      const response = await axiosInstance.post<ApiResponse<Paged<ApiCategory>>>(
        'products/get-categories',
        { pageNumber: 0, countPerPage: 100, marketId: scopeMarketId, isActive: null }
      );

      if (response.data.message === 'Success' && response.data.object?.items) {
        const mappedCategories = response.data.object.items
          .filter((category) => getCategoryMarketId(category) === scopeMarketId)
          .map(mapCategory);
        setCategories(mappedCategories);
      } else {
        console.warn('Unexpected response structure for categories:', response.data);
        setCategoriesError('Failed to load categories.');
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategoriesError('Failed to load categories.');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const loadBrands = async (scopeMarketId: number) => {
    setCategoriesError(null);
    setLoadingBrandsByCategoryId((prev) => ({ ...prev, all: true }));
    try {
      const response = await axiosInstance.post<ApiResponse<Paged<ApiBrand>>>(
        'products/get-brands',
        { pageNumber: 0, countPerPage: 100, marketId: scopeMarketId, categoryId: null, isActive: null }
      );
      if (response.data.message !== 'Success' || !response.data.object?.items) {
        throw new Error('Failed to load brands.');
      }
      const mappedBrands = await Promise.all(response.data.object.items.map(async (brand) => ({
        ...mapBrand(brand),
        productsCount: await getProductsCountForBrand(brand.id),
      })));
      setBrands(mappedBrands);
    } catch (error) {
      console.error('Failed to load market brands:', error);
      setCategoriesError('Failed to load brands.');
      setBrands([]);
    } finally {
      setLoadingBrandsByCategoryId((prev) => ({ ...prev, all: false }));
    }
  };

  useEffect(() => {
    if (!marketId) {
      setCategories([]);
      setCategoriesError(null);
      return;
    }

    setVariantFormData((prev) => ({ ...prev, marketId }));
    void loadCategories(marketId);
    void loadBrands(marketId);
    void loadSizes(marketId);
  }, [marketId]);

  const updateCategory = (categoryId: number, updater: (category: Category) => Category) => {
    setCategories((prev) => prev.map((category) => (category.id === categoryId ? updater(category) : category)));
  };

  const updateBrand = (brandId: number, updater: (brand: Brand) => Brand) => {
    setBrands((prev) => prev.map((brand) => (brand.id === brandId ? updater(brand) : brand)));
  };

  const ensureBrandsLoaded = async (categoryId: number) => {
    if (loadingBrandsByCategoryId[categoryId]) return;

    setLoadingBrandsByCategoryId((prev) => ({ ...prev, [categoryId]: true }));
    try {
      const response = await axiosInstance.post<ApiResponse<Paged<ApiBrand>>>(
        'products/get-brands',
        { pageNumber: 0, countPerPage: 100, marketId, categoryId: null, isActive: null }
      );

      if (response.data.message === 'Success' && response.data.object?.items) {
        const items = response.data.object.items;

        const brandsWithCounts = await Promise.all(
          items.map(async (brand) => ({
            ...mapBrand(brand),
            productsCount: await getProductsCountForBrand(brand.id),
          }))
        );

        setBrands(brandsWithCounts);

      } else {
        console.warn('Unexpected response structure for brands:', response.data);
        setCategoriesError('Failed to load brands.');
      }

    } catch (error) {
      console.error('Failed to load brands:', error);
      setCategoriesError('Failed to load brands.');

    } finally {
      setLoadingBrandsByCategoryId((prev) => ({ ...prev, [categoryId]: false }));
    }
  };

  const ensureProductsLoaded = async (categoryId: number, brandId: number) => {
    if (loadingProductsByBrandId[brandId]) return;

    setLoadingProductsByBrandId((prev) => ({ ...prev, [brandId]: true }));
    try {
      // Load products for the brand
      const productsPayload = { pageNumber: 0, countPerPage: 50, brandId };
      let productsResponse = await axiosInstance.post<ApiResponse<Paged<ApiProduct>>>(
        '/products/get-products',
        productsPayload
      );

      const productItems: ApiProduct[] =
        productsResponse.data.exData?.items || productsResponse.data.object?.items || [];

      if (productsResponse.data.message !== 'Success' || productItems.length === 0) {
        productsResponse = await axiosInstance.post<ApiResponse<Paged<ApiProduct>>>(
          '/products/get-products',
          productsPayload
        );
      }

      // Load stocks data
      let stockItems: BackendStock[] = [];
      try {
        const stockPayload = { pageNumber: 0, countPerPage: 1000, brandId };
        let stocksResponse = await axiosInstance.post<ApiResponse<Paged<BackendStock>>>(
          '/stocks/get-stocks',
          stockPayload
        );

        const stocksFromPost = stocksResponse.data.exData?.items || stocksResponse.data.object?.items || [];

        if (stocksResponse.data.message !== 'Success' || stocksFromPost.length === 0) {
          stocksResponse = await axiosInstance.post<ApiResponse<Paged<BackendStock>>>(
            '/stocks/get-stocks',
            stockPayload
          );
        }

        if (stocksResponse.data.message === 'Success') {
          stockItems = stocksResponse.data.exData?.items || stocksResponse.data.object?.items || [];
        }
      } catch (stockError) {
        console.warn('Failed to load stock details:', stockError);
      }

      // Map stocks by product ID
      const stocksByProductId = new Map<number, BackendStock[]>();
      stockItems.forEach((stock) => {
        const productId = stock.products?.id;
        if (!productId) return;
        const existing = stocksByProductId.get(productId) || [];
        existing.push(stock);
        stocksByProductId.set(productId, existing);
      });

      if (productsResponse.data.message === 'Success' && productItems.length > 0) {
        const items = productItems;
        const totalCount = productsResponse.data.object?.totalCount ?? items.length;

        // Map products with stock data
        const mappedProducts = items.map((product) => {
          const relatedStocks = stocksByProductId.get(product.id) || [];
          const primaryStock = relatedStocks[0];
          const mapped = mapProduct(product, primaryStock);
          return {
            ...mapped,
            stock: relatedStocks.reduce((sum, stock) => sum + (stock.qty || 0), 0),
          };
        });

        updateBrand(brandId, (brand) => ({ ...brand, products: mappedProducts, productsCount: totalCount }));
      } else {
        console.warn('Unexpected response structure for products:', productsResponse.data);
        setCategoriesError('Failed to load products.');
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setCategoriesError('Failed to load products.');
    } finally {
      setLoadingProductsByBrandId((prev) => ({ ...prev, [brandId]: false }));
    }
  };

  const loadUnits = async () => {
    try {
      const response = await axiosInstance.get('/products/get-units');

      let unitsData: UnitOption[] = [];
      if (response.data.message === 'Success' && Array.isArray(response.data.object?.items)) {
        unitsData = response.data.object.items;
      } else if (Array.isArray(response.data.object)) {
        unitsData = response.data.object;
      } else if (Array.isArray(response.data.data)) {
        unitsData = response.data.data;
      } else if (Array.isArray(response.data.items)) {
        unitsData = response.data.items;
      } else if (Array.isArray(response.data.object?.data)) {
        unitsData = response.data.object.data;
      } else if (Array.isArray(response.data)) {
        unitsData = response.data;
      }

      setUnits(toUnitOptions(unitsData));
    } catch (error) {
      console.error('Failed to load units:', error);
      setUnits([]);
    }
  };

  const loadSizes = async (scopeMarketId: number) => {
    try {
      const response = await axiosInstance.get('/products/get-sizes', { params: { marketId: scopeMarketId } });
      const items = response.data.object ?? response.data.exData ?? [];
      setSizes(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Failed to load market sizes:', error);
      setSizes([]);
    }
  };

  const saveSize = async () => {
    const name = sizeName.trim();
    if (!marketId || !name) return;
    setIsSavingSize(true);
    try {
      const payload = { name, marketId };
      if (editingSize) {
        await axiosInstance.put(`/products/update-size?id=${editingSize.id}`, payload);
      } else {
        await axiosInstance.post('/products/set-size', payload);
      }
      await loadSizes(marketId);
      setSizeName('');
      setEditingSize(null);
      showToast('success', editingSize ? 'Size Updated' : 'Size Added', `${name} is ready for this market.`);
    } catch (error) {
      showToast('error', 'Size Not Saved', getErrorMessage(error, 'Could not save this size.'));
    } finally {
      setIsSavingSize(false);
    }
  };

  const loadProductStocks = async (productId: number): Promise<BackendStock[]> => {
    const basePayload = {
      pageNumber: 0,
      countPerPage: 1000,
      productId,
    };

    const responses = await Promise.allSettled(
      [true, false].map((isActive) =>
        axiosInstance.post<ApiResponse<Paged<BackendStock>>>('/stocks/get-stocks', {
          ...basePayload,
          isActive,
        })
      )
    );

    const stocksById = new Map<number, BackendStock>();
    responses.forEach((result) => {
      if (result.status !== 'fulfilled' || result.value.data.message !== 'Success') return;

      const items = result.value.data.exData?.items || result.value.data.object?.items || [];
      items.forEach((stock) => {
        if (stock.id) stocksById.set(stock.id, stock);
      });
    });

    if (stocksById.size > 0) {
      return Array.from(stocksById.values());
    }

    const failed = responses.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected') {
      throw failed.reason;
    }

    return [];
  };

  const mapStocksToVariants = (stocks: BackendStock[]): ProductVariant[] => {
    return stocks.map((stock) => ({
      id: stock.id.toString(),
      color: stock.color || '#000000',
      colorName: stock.color || '',
      size: stock.sizes?.name || '',
      showingPrice: stock.showingPrice?.toString() || '',
      sellingPrice: stock.sellingPrice?.toString() || '',
      cost: stock.cost?.toString() || '',
      weight: stock.wpu?.toString() || '',
      unit: stock.unit?.name || '',
      quantity: stock.qty?.toString() || '',
      emi: stock.emi || undefined,
      description: stock.desc || '',
      unitId: stock.unit?.id,
      sizeId: stock.sizes?.id || undefined,
      isActive: typeof stock.isActive === 'boolean' ? stock.isActive : true,
    }));
  };

  const handleOpenVariantsModal = async (categoryId: number, brandId: number, product: Product) => {
    setProductFormContext({ categoryId, brandId });
    setVariantsModalProduct(product);
    setVariantFieldErrors({});

    try {
      const productStocks = await loadProductStocks(product.id);
      const stockUnits: Unit[] = productStocks
        .filter((stock) => stock.unit?.name)
        .map((stock, index) => ({
          id: stock.unit?.id || index + 1,
          name: stock.unit?.name || '',
        }));

      if (stockUnits.length > 0) {
        setUnits((prev) => mergeUnits(prev, stockUnits));
      }

      if (units.length === 0) {
        await loadUnits();
      }

      setVariantFormData({
        productName: product.name,
        code: product.code || product.id.toString(),
        category: typeof product.category === 'string' ? product.category : product.category?.name || '',
        categoryId,
        brand: '',
        brandId,
        marketId: marketId ?? 0,
        description: product.description || '',
        variants: mapStocksToVariants(productStocks),
        images: [],
      });
      setShowVariantsModal(true);
    } catch (error: any) {
      const message = getErrorMessage(error, 'Failed to load product stocks.');
      showToast('error', 'Load Failed', message);
      setVariantsModalProduct(null);
      setProductFormContext(null);
    }
  };

  const closeVariantsModal = () => {
    setShowVariantsModal(false);
    setVariantsModalProduct(null);
    setVariantFieldErrors({});
  };

  const handleVariantInputChange = (field: keyof ProductFormData, value: ProductVariant[]) => {
    if (field !== 'variants') return;

    setVariantFormData((prev) => ({ ...prev, variants: value }));
    setVariantFieldErrors((prev) => {
      const cleared = { ...prev };
      delete cleared.variants;
      Object.keys(cleared).forEach((key) => {
        if (key.startsWith('variant_')) delete cleared[key];
      });
      return cleared;
    });
  };

  const validateVariantRows = () => {
    const errors: Record<string, string> = {};

    if (variantFormData.variants.length === 0) {
      errors.variants = 'At least one product variant is required';
      return errors;
    }

    variantFormData.variants.forEach((variant, index) => {
      if (!variant.sellingPrice || parseFloat(variant.sellingPrice.toString()) <= 0) {
        errors[`variant_${index}_sellingPrice`] = 'Selling price must be greater than 0';
      }
      if (!variant.quantity || parseFloat(variant.quantity.toString()) < 0) {
        errors[`variant_${index}_quantity`] = 'Quantity must be 0 or greater';
      }
      if (!variant.cost || parseFloat(variant.cost.toString()) < 0) {
        errors[`variant_${index}_cost`] = 'Cost must be a positive number';
      }
      if (!variant.unit?.trim()) {
        errors[`variant_${index}_unit`] = 'Unit is required';
      }
      if (!variant.color?.trim()) {
        errors[`variant_${index}_color`] = 'Color is required';
      }
      if (!variant.weight) {
        errors[`variant_${index}_weight`] = 'Weight is required';
      }
    });

    return errors;
  };

  const handleSaveVariants = async () => {
    if (!variantsModalProduct || !productFormContext) return;

    const errors = validateVariantRows();
    if (Object.keys(errors).length > 0) {
      setVariantFieldErrors(errors);
      return;
    }

    setIsSavingVariants(true);

    try {
      const payload = {
        productId: variantsModalProduct.id,
        stockDtoList: variantFormData.variants.map((variant) => {
          let stockId = null;
          if (variant.id) {
            const parsedId = parseInt(variant.id, 10);
            if (!Number.isNaN(parsedId) && !variant.id.startsWith('temp_')) {
              stockId = parsedId;
            }
          }

          const unitId = variant.unitId || units.find((unit) => unit.name === variant.unit)?.id || 1;

          return {
            id: stockId,
            desc: variant.description || variantsModalProduct.description || 'Product variant',
            cost: parseFloat(variant.cost?.toString() || '0'),
            showingPrice: variant.showingPrice ? parseFloat(variant.showingPrice.toString()) : null,
            sellingPrice: parseFloat(variant.sellingPrice?.toString() || '0'),
            qty: parseFloat(variant.quantity?.toString() || '0'),
            unit: { id: unitId },
            color: variant.colorName || variant.color || 'Default',
            emi: variant.emi || '',
            sizes: variant.sizeId ? { id: variant.sizeId } : null,
            wpu: parseFloat(variant.weight?.toString() || '0') || 0,
            isActive: variant.isActive ?? true,
          };
        }),
      };

      await axiosInstance.post('/stocks/update-stock', payload);
      showToast('success', 'Stocks Updated', 'Product stocks and variants were updated successfully.');
      closeVariantsModal();
      await ensureProductsLoaded(productFormContext.categoryId, productFormContext.brandId);
    } catch (error: any) {
      const message = getErrorMessage(error, 'Failed to update product stocks.');
      showToast('error', 'Update Failed', message);
    } finally {
      setIsSavingVariants(false);
    }
  };

  const handleToggleVariantStatus = async (variantId: string) => {
    if (!variantsModalProduct) return;

    const variant = variantFormData.variants.find((item) => item.id === variantId);
    if (!variant) return;

    const newStatus = !(variant.isActive ?? true);
    const actionText = newStatus ? 'activate' : 'deactivate';
    const result = await Swal.fire({
      title: `Confirm ${actionText}`,
      text: `Are you sure you want to ${actionText} this stock row?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, proceed',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    setVariantFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((item) => item.id === variantId ? { ...item, isActive: newStatus } : item),
    }));

    try {
      if (!variantId.startsWith('temp_')) {
        const stockId = parseInt(variantId, 10);
        if (!Number.isNaN(stockId)) {
          await axiosInstance.put('/stocks/update-stock-status', null, {
            params: { stockId, isActive: newStatus },
          });
        }
      }
      showToast('success', 'Status Updated', `Stock row has been ${newStatus ? 'activated' : 'deactivated'}.`);
    } catch (error: any) {
      setVariantFormData((prev) => ({
        ...prev,
        variants: prev.variants.map((item) => item.id === variantId ? { ...item, isActive: !newStatus } : item),
      }));
      showToast('error', 'Update Failed', getErrorMessage(error, 'Failed to update stock status.'));
    }
  };

  const handleDeleteVariant = async (variantId: string): Promise<boolean> => {
    if (variantId.startsWith('temp_')) return true;
    if (!canDeleteProducts) return false;

    const stockId = parseInt(variantId, 10);
    if (Number.isNaN(stockId)) return true;

    const result = await Swal.fire({
      title: 'Delete stock row?',
      text: 'This stock row will be removed from the product.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      confirmButtonColor: '#EF4444',
    });

    if (!result.isConfirmed) return false;

    try {
      await axiosInstance.delete('/stocks/delete-stock', {
        params: { stockIds: stockId },
      });
      showToast('success', 'Stock Deleted', 'Stock row was deleted successfully.');

      if (productFormContext) {
        await ensureProductsLoaded(productFormContext.categoryId, productFormContext.brandId);
      }

      return true;
    } catch (error: any) {
      showToast('error', 'Delete Failed', getErrorMessage(error, 'Failed to delete stock row.'));
      return false;
    }
  };

  const handleStatusChange = async (categoryId: number, isActive: boolean) => {
    try {
      const response = await axiosInstance.put('/products/update-category-status', null, {
        params: { id: categoryId, isActive },
      });
      if (response.data?.message !== 'Success') {
        throw new Error(response.data?.desc || 'Category status could not be updated.');
      }

      setCategories((prev) =>
        prev.map((category) =>
          category.id === categoryId
            ? { ...category, status: isActive ? 'active' : 'inactive' }
            : category
        )
      );

      Swal.fire({
        icon: 'success',
        title: 'Status Updated',
        text: `Category has been ${isActive ? 'activated' : 'deactivated'}.`,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 2000,
      });
    } catch (error: any) {
      console.error('Failed to update category status:', error);

      const message =
        error?.response?.data?.desc ||
        error?.response?.data?.message ||
        'Failed to update category status.';

      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: message,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3000,
      });
    }
  };

  const handleBrandStatusChange = async (
    categoryId: number,
    brandId: number,
    isActive: boolean
  ) => {
    try {
      const response = await axiosInstance.put('/products/update-brand-status', null, {
        params: { id: brandId, isActive },
      });
      if (response.data?.message !== 'Success') {
        throw new Error(response.data?.desc || 'Brand status could not be updated.');
      }

      updateBrand(brandId, (brand) => ({
        ...brand,
        status: isActive ? 'active' : 'inactive',
      }));

      Swal.fire({
        icon: 'success',
        title: 'Status Updated',
        text: `Brand has been ${isActive ? 'activated' : 'deactivated'}.`,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 2000,
      });
    } catch (error: any) {
      console.error('Failed to update brand status:', error);

      const message =
        error?.response?.data?.desc ||
        error?.response?.data?.message ||
        'Failed to update brand status.';

      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: message,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3000,
      });
    }
  };

  const handleDeleteCategory = (categoryId: number) => {
    if (!canDeleteCategories) return;

    const selectedCategory = categories.find((category) => category.id === categoryId) || null;
    setCategoryToDelete(selectedCategory);
    setShowDeleteCategoryConfirm(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete || !canDeleteCategories) return;

    setIsDeletingCategory(true);
    try {
      await axiosInstance.delete(`/products/delete-category?id=${categoryToDelete.id}`);

      setCategories((prev) => prev.filter((category) => category.id !== categoryToDelete.id));
      setExpandedCategoryId((prev) => (prev === categoryToDelete.id ? null : prev));
      setShowDeleteCategoryConfirm(false);
      setCategoryToDelete(null);

      Swal.fire({
        icon: 'success',
        title: 'Category Deleted',
        text: `"${categoryToDelete.name}" has been deleted successfully.`,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 2500,
      });
    } catch (error: any) {
      console.error('Failed to delete category:', error);

      const message =
        error?.response?.data?.desc ||
        error?.response?.data?.message ||
        'Failed to delete category. Please try again.';

      Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: message,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3000,
      });
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleExpandCategory = (categoryId: number) => {
    setExpandedCategoryId((prev) => {
      const next = prev === categoryId ? null : categoryId;
      return next;
    });
  };

  const handleExpandBrand = (brandId: number) => {
    setExpandedBrandIds((prev) => {
      const next = new Set(prev);
      if (next.has(brandId)) {
        next.delete(brandId);
      } else {
        next.add(brandId);
        void ensureProductsLoaded(0, brandId);
      }
      return next;
    });
  };

  const handleEditProduct = (categoryId: number, brandId: number, product: Product) => {
    setSelectedProductForForm({
      ...product,
      category: product.category || { id: categoryId, name: typeof product.category === 'string' ? product.category : 'Uncategorized' },
      brand: product.brand || { id: brandId, name: product.brand?.name || 'Unknown' },
    });
    setProductFormContext({ categoryId, brandId });
    setShowProductFormModal(true);
  };

  const handleViewProduct = async (categoryId: number, brandId: number, product: Product) => {
    setProductFormContext({ categoryId, brandId });
    setViewProduct(product);
    setViewProductImages(product.image ? [product.image] : []);
    setViewSelectedImage(product.image || null);
    setViewProductDetails({
      id: product.id,
      name: product.name,
      code: product.code,
      marketId: 0,
      brandName: 'N/A',
      categoryName: typeof product.category === 'string' ? product.category : product.category?.name || 'Uncategorized',
    });
    setViewDetailsError(null);
    setShowViewModal(true);

    try {
      const response = await axiosInstance.get(`/products/get-products-by-id?id=${product.id}`);
      const productObject = response.data?.object;

      if (productObject && typeof productObject === 'object') {
        const details = productObject as ApiProduct;

        const responseImages = (details.productImages || [])
          .map((img) => normalizeImageUrl(img.imageUrl || img.url))
          .filter((img): img is string => Boolean(img));

        const mergedImages = responseImages.length > 0
          ? responseImages
          : (product.image ? [product.image] : []);

        setViewProductImages(mergedImages);
        setViewSelectedImage(mergedImages[0] || null);

        setViewProductDetails({
          id: details.id,
          name: details.name,
          code: details.code,
          marketId: details.marketId,
          brandName: details.brand?.name || 'N/A',
          categoryName: details.category?.name || (typeof product.category === 'string' ? product.category : product.category?.name) || 'Uncategorized',
        });
      }
    } catch (error) {
      console.error('Failed to fetch product details:', error);
      setViewDetailsError('Could not refresh full product details from the server. Showing available data.');
    }
  };

  const closeProductFormModal = () => {
    setShowProductFormModal(false);
    setSelectedProductForForm(null);
    setProductFormContext(null);
  };

  const handleOpenAddProductModal = (
    categoryId: number,
    brandId: number,
    categoryName: string,
    brandName: string
  ) => {
    setSelectedProductForForm(null);
    setProductFormContext({ categoryId, brandId, categoryName, brandName });
    setShowProductFormModal(true);
  };

  const handleProductFormSaved = async () => {
    if (productFormContext) {
      await ensureProductsLoaded(productFormContext.categoryId, productFormContext.brandId);
    }
    closeProductFormModal();
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewProduct(null);
    setViewProductDetails(null);
    setViewProductImages([]);
    setViewSelectedImage(null);
    setViewDetailsError(null);
  };

  const handleDeleteProduct = (categoryId: number, brandId: number, product: Product) => {
    if (!canDeleteProducts) return;

    setProductToDelete({ categoryId, brandId, product });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete || !canDeleteProducts) return;

    setIsDeleting(true);
    try {
      await axiosInstance.delete('/products/delete-product-by-id', {
        params: { id: productToDelete.product.id },
      });

      updateBrand(productToDelete.brandId, (brand) => {
        const nextProducts = brand.products.filter((item) => item.id !== productToDelete.product.id);
        const currentCount = brand.productsCount ?? brand.products.length;
        const nextCount = Math.max(0, currentCount - 1);
        return {
          ...brand,
          products: nextProducts,
          productsCount: nextCount,
        };
      });

      Swal.fire({
        icon: 'success',
        title: 'Product Deleted!',
        text: `"${productToDelete.product.name}" has been deleted successfully.`,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3000,
        background: '#FFF4EE',
        color: '#1A1F3A',
        iconColor: '#00BFA5',
        customClass: {
          popup: 'rounded-xl shadow-2xl',
          timerProgressBar: 'bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A]'
        }
      });

      setShowDeleteConfirm(false);
      setProductToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete product:', error);

      const errorMessage = getErrorMessage(error, 'Failed to delete product. Please try again.');

      Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: errorMessage,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3000,
        background: '#FEF2F2',
        color: '#991B1B',
        iconColor: '#DC2626'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (
    categoryId: number,
    brandId: number,
    productId: number,
    isActive: boolean
  ) => {
    const product = brands
      .flatMap((brand) => brand.products)
      .find((item) => item.id === productId);
    const actionText = isActive ? 'activate' : 'deactivate';
    const result = await Swal.fire({
      title: `Confirm ${actionText}`,
      text: `Are you sure you want to ${actionText} "${product?.name || 'this product'}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, proceed',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await axiosInstance.put('/products/update-product-status', null, {
        params: { productId, isActive },
      });

      updateBrand(brandId, (brand) => ({
        ...brand,
        products: brand.products.map((product) =>
          product.id === productId ? { ...product, isActive } : product
        )
      }));

      Swal.fire({
        icon: 'success',
        title: 'Status Updated!',
        text: `Product status has been ${isActive ? 'activated' : 'deactivated'}.`,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 2000,
      });
    } catch (error) {
      console.error('Failed to toggle product status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: getErrorMessage(error, 'Failed to update product status.'),
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3000,
      });
    }
  };

  const handleInitiateBrandDelete = (brand: Brand) => {
    if (!canDeleteBrands) return;

    setBrandToDelete({ categoryId: 0, brand });
    setShowDeleteBrandConfirm(true);
  };

  const confirmDeleteBrand = async () => {
    if (!brandToDelete || !canDeleteBrands) return;

    setIsDeletingBrand(true);
    try {
      await axiosInstance.delete(`/products/delete-brand?id=${brandToDelete.brand.id}`);

      setBrands((prev) => prev.filter((brand) => brand.id !== brandToDelete.brand.id));

      setShowDeleteBrandConfirm(false);
      setBrandToDelete(null);

      Swal.fire({
        icon: 'success',
        title: 'Brand Deleted',
        text: `"${brandToDelete.brand.name}" has been deleted successfully.`,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 2500,
      });
    } catch (error: any) {
      console.error('Failed to delete brand:', error);

      let errorMessage = 'Failed to delete brand. Please try again.';
      if (error.response) {
        const { status, data } = error.response;
        errorMessage = data.desc || `Error ${status}: Failed to delete brand`;
      }

      Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: errorMessage,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3000,
        background: '#FEF2F2',
        color: '#991B1B',
        iconColor: '#DC2626'
      });
    } finally {
      setIsDeletingBrand(false);
    }
  };

  const resetAddCategoryModal = () => {
    setShowAddCategoryModal(false);
    setNewCategoryName('');
    setNewCategoryImageFile(null);
    setNewCategoryImagePreview('');
  };

  const uploadCategoryImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('files', file);

    const response = await axiosInstance.post<ApiResponse<string[]>>('/storage/upload?path=categories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data?.message === 'Success' || response.data?.message === 'success') {
      const uploadedPaths: string[] = Array.isArray(response.data.object) ? response.data.object : [];
      if (!uploadedPaths.length) {
        throw new Error('No category image path returned from upload service');
      }
      return uploadedPaths[0];
    }

    throw new Error(response.data?.desc || 'Failed to upload category image');
  };

  const handleCategoryImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setNewCategoryImageFile(file);

    if (file) {
      setNewCategoryImagePreview(URL.createObjectURL(file));
    } else {
      setNewCategoryImagePreview('');
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      Swal.fire({
        icon: 'warning',
        title: 'Category name required',
        text: 'Please enter a category name.',
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 2500,
      });
      return;
    }

    if (!marketId) {
      Swal.fire({
        icon: 'warning',
        title: 'Market not ready',
        text: 'Unable to determine the active market yet. Please try again in a moment.',
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 2500,
      });
      return;
    }

    if (!newCategoryImageFile) {
      Swal.fire({
        icon: 'warning',
        title: 'Category image required',
        text: 'Please select an image for the category.',
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 2500,
      });
      return;
    }

    setIsSubmittingCategory(true);
    try {
      const uploadedCategoryImagePath = await uploadCategoryImage(newCategoryImageFile);

      await axiosInstance.post('/products/set-category', {
        name,
        marketId,
        img: uploadedCategoryImagePath,
      });

      await loadCategories(marketId);
      resetAddCategoryModal();

      Swal.fire({
        icon: 'success',
        title: 'Category Created',
        text: `"${name}" added successfully.`,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 2500,
      });
    } catch (error: any) {
      const message = error?.response?.data?.desc || error?.response?.data?.message || 'Failed to create category.';
      Swal.fire({
        icon: 'error',
        title: 'Create Failed',
        text: message,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3000,
      });
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleCreateBrand = async () => {
    const name = newBrandName.trim();
    if (!name || !marketId) {
      Swal.fire({
        icon: 'warning',
        title: 'Brand details required',
        text: 'Please enter a brand name for this market.',
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 2500,
      });
      return;
    }

    setIsSubmittingBrand(true);
    try {
      await axiosInstance.post('/products/set-brand', {
        name,
        marketId,
      });

      await loadBrands(marketId);

      setShowAddBrandModal(false);
      setNewBrandName('');

      Swal.fire({
        icon: 'success',
        title: 'Brand Created',
        text: `"${name}" has been added successfully.`,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 2500,
      });
    } catch (error: any) {
      const message = error?.response?.data?.desc || error?.response?.data?.message || 'Failed to create brand.';
      Swal.fire({
        icon: 'error',
        title: 'Create Failed',
        text: message,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3000,
      });
    } finally {
      setIsSubmittingBrand(false);
    }
  };

  const loadFeedbacks = async (product: Product) => {
    setIsLoadingFeedback(true);
    setFeedbackError(null);
    try {
      const response = await axiosInstance.post('/feedback/get-feedbacks', {
        pageNumber: 0,
        countPerPage: 50,
        productId: product.id,
        userId: null,
        search: '',
        fromDate: null,
        toDate: null,
      });

      const payload = response.data?.object ?? response.data?.exData;
      const rows = Array.isArray(payload?.feedbacks) ? payload.feedbacks : [];
      setFeedbackRows(rows.map((item: any) => ({
        id: Number(item.id) || 0,
        comment: String(item.comment || ''),
        rating: Number(item.rating) || 0,
        productId: Number(item.productId) || product.id,
        userId: Number(item.userId) || undefined,
        userName: item.userName || '',
        createdAt: item.createdAt || '',
        updatedAt: item.updatedAt || '',
      })).filter((item: FeedbackRow) => item.id > 0));
    } catch (error: any) {
      const message = getErrorMessage(error, 'Failed to load product feedback.');
      setFeedbackError(message);
      setFeedbackRows([]);
      showToast('error', 'Feedback Load Failed', message);
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  const handleOpenFeedback = (product: Product) => {
    setFeedbackProduct(product);
    setFeedbackRows([]);
    setFeedbackError(null);
    void loadFeedbacks(product);
  };

  const closeFeedbackModal = () => {
    setFeedbackProduct(null);
    setFeedbackRows([]);
    setFeedbackError(null);
    setDeletingFeedbackIds({});
  };

  const handleDeleteFeedback = async (feedbackId: number) => {
    if (!canDeleteProducts) return;

    const result = await Swal.fire({
      title: 'Delete feedback?',
      text: 'This customer feedback will be removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      confirmButtonColor: '#EF4444',
    });

    if (!result.isConfirmed) return;

    setDeletingFeedbackIds((prev) => ({ ...prev, [feedbackId]: true }));
    try {
      await axiosInstance.delete('/feedback/delete-feedback', {
        params: { id: feedbackId },
      });
      if (feedbackProduct) {
        await loadFeedbacks(feedbackProduct);
      } else {
        setFeedbackRows((prev) => prev.filter((feedback) => feedback.id !== feedbackId));
      }
      showToast('success', 'Feedback Deleted', 'Product feedback was deleted successfully.');
    } catch (error: any) {
      showToast('error', 'Delete Failed', getErrorMessage(error, 'Failed to delete feedback.'));
    } finally {
      setDeletingFeedbackIds((prev) => ({ ...prev, [feedbackId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Categories & Brands
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage category status and browse connected brands and products.
          </p>
        </div>
      </div> */}

      <div className="rounded-2xl border border-violet-200 bg-linear-to-br from-violet-50 via-white to-orange-50 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Market Options</p>
            <h3 className="mt-1 text-lg font-black text-gray-900">Sizes for this market</h3>
            <p className="mt-1 text-sm text-gray-500">Create reusable sizes for product variants. Delete can be added later.</p>
          </div>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">{sizes.length} sizes</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {sizes.map((size) => (
            <button key={size.id} type="button" onClick={() => { setEditingSize(size); setSizeName(size.name); }}
              className="group inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-violet-400">
              {size.name}<PencilIcon className="h-3.5 w-3.5 text-violet-500 opacity-0 group-hover:opacity-100" />
            </button>
          ))}
          {sizes.length === 0 && <span className="text-sm text-gray-500">No custom sizes yet.</span>}
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input value={sizeName} maxLength={30} onChange={(event) => setSizeName(event.target.value)}
            placeholder={editingSize ? 'Update size name' : 'Add size, e.g. XXL or 42'}
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          <button type="button" disabled={isSavingSize || !sizeName.trim()} onClick={() => void saveSize()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {isSavingSize ? 'Saving...' : editingSize ? 'Update Size' : 'Add Size'}
          </button>
          {editingSize && <button type="button" onClick={() => { setEditingSize(null); setSizeName(''); }}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600">Cancel</button>}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex border-b border-gray-200 bg-gray-50 p-2">
          {([
            ['categories', 'Categories', categories.length],
            ['brands', 'Brands', brands.length],
          ] as const).map(([tab, label, count]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveManagerTab(tab)}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${
                activeManagerTab === tab
                  ? 'bg-white text-[#D17F0A] shadow-sm ring-1 ring-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {label} <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs">{count}</span>
            </button>
          ))}
        </div>

        {activeManagerTab === 'categories' ? (
          <div className="p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-gray-900">Market categories</h3>
                <p className="text-sm text-gray-500">Organize products into clear, independent collections.</p>
              </div>
              <button type="button" onClick={() => setShowAddCategoryModal(true)}
                className="inline-flex items-center gap-1 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#FFA726] px-3 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90">
                <PlusIcon className="h-4 w-4" /> Add category
              </button>
            </div>
            {isLoadingCategories ? <div className="py-10 text-center text-sm text-gray-500">Loading categories...</div> :
              categories.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">No categories in this market yet.</div> :
              <div className="grid gap-3 md:grid-cols-2">
                {categories.map((category) => (
                  <CategoryCard key={category.id} category={category} isExpanded={false}
                    onExpand={handleExpandCategory} onStatusChange={handleStatusChange}
                    onDelete={handleDeleteCategory} canDelete={canDeleteCategories} onRefresh={() => { if (marketId) { loadCategories(marketId); loadBrands(marketId); } }} />
                ))}
              </div>}
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-gray-900">Market brands</h3>
                <p className="text-sm text-gray-500">Brands are shared across this market and are not tied to one category.</p>
              </div>
              <button type="button" onClick={() => setShowAddBrandModal(true)}
                className="inline-flex items-center gap-1 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#FFA726] px-3 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90">
                <PlusIcon className="h-4 w-4" /> Add brand
              </button>
            </div>
            {loadingBrandsByCategoryId.all ? <div className="py-10 text-center text-sm text-gray-500">Loading brands...</div> :
              brands.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">No brands in this market yet.</div> :
              <div className="space-y-3">
                {brands.map((brand) => (
                  <BrandList key={brand.id} brand={brand} isExpanded={expandedBrandIds.has(brand.id)}
                    isLoading={!!loadingProductsByBrandId[brand.id]} onExpand={handleExpandBrand}
                    onStatusChange={(brandId, isActive) => handleBrandStatusChange(0, brandId, isActive)}
                    onAddProduct={() => handleOpenAddProductModal(categories[0]?.id || 0, brand.id, categories[0]?.name || '', brand.name)}
                    onEdit={(product) => handleEditProduct(product.categoryId || categories[0]?.id || 0, brand.id, product)}
                    onDelete={(product) => handleDeleteProduct(product.categoryId || categories[0]?.id || 0, brand.id, product)}
                    onView={(product) => handleViewProduct(product.categoryId || categories[0]?.id || 0, brand.id, product)}
                    onManageVariants={(product) => handleOpenVariantsModal(product.categoryId || categories[0]?.id || 0, brand.id, product)}
                    onViewFeedback={handleOpenFeedback}
                    onToggleStatus={(productId, isActive) => handleToggleStatus(0, brand.id, productId, isActive)}
                    onDeleteBrand={() => handleInitiateBrandDelete(brand)}
                    canDeleteProducts={canDeleteProducts} canDeleteBrand={canDeleteBrands} onRefresh={() => { if (marketId) { loadCategories(marketId); loadBrands(marketId); } }} />
                ))}
              </div>}
          </div>
        )}
        {categoriesError && <p className="px-6 pb-4 text-xs text-red-500">{categoriesError}</p>}
      </div>

      {showDeleteConfirm && productToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl animate-slideDown">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <TrashIcon className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
              Delete Product?
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete "
              <strong>{productToDelete.product.name}</strong>"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setProductToDelete(null);
                }}
                disabled={isDeleting}
                className="flex-1 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h3 className="text-lg font-bold text-gray-900">Add New Category</h3>
              <button
                type="button"
                onClick={resetAddCategoryModal}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close add category modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <label htmlFor="new-category-name" className="mb-2 block text-sm font-semibold text-gray-700">Category Name</label>
                <input
                  id="new-category-name"
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Mobile Phones"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20"
                />
              </div>

              <div>
                <label htmlFor="new-category-image" className="mb-2 block text-sm font-semibold text-gray-700">Category Image</label>
                <input
                  id="new-category-image"
                  type="file"
                  accept="image/*"
                  onChange={handleCategoryImageChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20"
                />
                {newCategoryImagePreview && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    <img
                      src={newCategoryImagePreview}
                      alt="Category preview"
                      className="h-36 w-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetAddCategoryModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={isSubmittingCategory}
                  className="rounded-lg bg-linear-to-r from-[#F59B0F] to-[#FFA726] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmittingCategory ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h3 className="text-lg font-bold text-gray-900">Add New Brand</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddBrandModal(false);
                  setNewBrandName('');
                }}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close add brand modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Brand Name</label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="e.g. Samsung"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20"
                />
              </div>

              <div className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-sm text-orange-800">
                This brand will be available throughout the selected market. Products can be assigned to any category later.
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBrandModal(false);
                    setNewBrandName('');
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateBrand}
                  disabled={isSubmittingBrand}
                  className="rounded-lg bg-linear-to-r from-[#F59B0F] to-[#FFA726] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmittingBrand ? 'Creating...' : 'Create Brand'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProductFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="scrollbar-hide relative max-h-[94vh] w-full max-w-7xl overflow-y-auto rounded-3xl bg-gray-50 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-5 py-4 backdrop-blur sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {selectedProductForForm ? 'Edit Product' : 'Add Product'}
                </h2>
                <p className="text-sm text-white/80">
                  {selectedProductForForm ? 'Update product details and variants.' : 'Create a new product for this brand.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeProductFormModal}
                className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
                aria-label="Close edit product modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <AddProduct
                inModal
                productToEdit={selectedProductForForm}
                initialSelection={selectedProductForForm ? undefined : {
                  categoryId: productFormContext?.categoryId || 0,
                  categoryName: productFormContext?.categoryName || '',
                  brandId: productFormContext?.brandId || 0,
                  brandName: productFormContext?.brandName || '',
                }}
                onClose={closeProductFormModal}
                onSaved={handleProductFormSaved}
              />
            </div>
          </div>
        </div>
      )}

      {showVariantsModal && variantsModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="scrollbar-hide relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-gray-50 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-5 py-4 backdrop-blur sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Stock Manager</p>
                <h3 className="mt-1 text-xl font-black text-white sm:text-3xl">{variantsModalProduct.name}</h3>
              </div>
              <button
                type="button"
                onClick={closeVariantsModal}
                className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
                aria-label="Close stock manager"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <VariantManager
                formData={variantFormData}
                onInputChange={handleVariantInputChange}
                fieldErrors={variantFieldErrors}
                units={units}
                sizes={sizes}
                onToggleVariantStatus={handleToggleVariantStatus}
                onDeleteVariant={canDeleteProducts ? handleDeleteVariant : undefined}
              />

              <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeVariantsModal}
                  disabled={isSavingVariants}
                  className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveVariants}
                  disabled={isSavingVariants}
                  className="px-6 py-3 rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white font-medium transition-all duration-300 shadow-lg disabled:opacity-50"
                >
                  {isSavingVariants ? 'Updating Stocks...' : 'Save Stocks'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showViewModal && viewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="scrollbar-hide relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-gray-50 shadow-2xl">
            <div className="relative overflow-hidden bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-5 pb-5 pt-6 sm:px-6">
              <button
                type="button"
                onClick={closeViewModal}
                className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
                aria-label="Close view product modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <h3 className="text-2xl font-bold text-white">{viewProduct.name}</h3>
              <p className="mt-1 text-sm text-white/85">Product details</p>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              {viewDetailsError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {viewDetailsError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <img
                      src={viewSelectedImage || viewProduct.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'}
                      alt={viewProduct.name}
                      className="h-72 w-full object-cover"
                    />
                  </div>
                  {viewProductImages.length > 1 && (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {viewProductImages.map((imageUrl, idx) => (
                        <button
                          key={`${imageUrl}-${idx}`}
                          type="button"
                          onClick={() => setViewSelectedImage(imageUrl)}
                          className={`overflow-hidden rounded-lg border ${viewSelectedImage === imageUrl ? 'border-[#F59B0F]' : 'border-gray-200'} bg-white`}
                        >
                          <img src={imageUrl} alt={`Preview ${idx + 1}`} className="h-16 w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Product ID</p>
                      <p className="font-semibold text-gray-900">{viewProductDetails?.id || viewProduct.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Code</p>
                      <p className="font-semibold text-gray-900">{viewProductDetails?.code || viewProduct.code}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Category</p>
                      <p className="font-semibold text-gray-900">{viewProductDetails?.categoryName || (typeof viewProduct.category === 'string' ? viewProduct.category : viewProduct.category?.name) || 'Uncategorized'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Brand</p>
                      <p className="font-semibold text-gray-900">{viewProductDetails?.brandName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Price</p>
                      <p className="font-semibold text-[#F59B0F]">LKR {viewProduct.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Stock</p>
                      <p className="font-semibold text-gray-900">{viewProduct.stock ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className={`font-semibold ${viewProduct.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                        {viewProduct.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Unit</p>
                      <p className="font-semibold text-gray-900">{viewProduct.unit || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="mt-1 text-sm text-gray-800">{viewProduct.description || 'No description available'}</p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        closeViewModal();
                        setSelectedProductForForm(viewProduct);
                        setShowProductFormModal(true);
                      }}
                      className="rounded-lg bg-linear-to-r from-[#F59B0F] to-[#FFA726] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                    >
                      Edit Product
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {feedbackProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="scrollbar-hide relative max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-gray-50 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Product Feedback</p>
                <h3 className="mt-1 text-xl font-black text-white">{feedbackProduct.name}</h3>
              </div>
              <button
                type="button"
                onClick={closeFeedbackModal}
                className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
                aria-label="Close feedback modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              {feedbackError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {feedbackError}
                </div>
              )}

              {isLoadingFeedback ? (
                <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm font-semibold text-gray-500">
                  Loading feedback...
                </div>
              ) : feedbackRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm font-semibold text-gray-500">
                  No feedback found for this product.
                </div>
              ) : (
                <div className="space-y-3">
                  {feedbackRows.map((feedback) => (
                    <div key={feedback.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-gray-900">{feedback.userName || `User #${feedback.userId || '-'}`}</p>
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                              Rating {feedback.rating}/5
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-gray-500">
                            {formatDateTime(feedback.createdAt || feedback.updatedAt)}
                          </p>
                        </div>
                        {canDeleteProducts && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteFeedback(feedback.id)}
                            disabled={deletingFeedbackIds[feedback.id] === true}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                          >
                            {deletingFeedbackIds[feedback.id] === true ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-gray-700 whitespace-pre-wrap">
                        {feedback.comment || 'No comment provided.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteBrandConfirm && brandToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl animate-slideDown">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <TrashIcon className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
              Delete Brand?
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete "
              <strong>{brandToDelete.brand.name}</strong>"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteBrandConfirm(false);
                  setBrandToDelete(null);
                }}
                disabled={isDeletingBrand}
                className="flex-1 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteBrand}
                disabled={isDeletingBrand}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingBrand ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteCategoryConfirm && categoryToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl animate-slideDown">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <TrashIcon className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
              Delete Category?
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete "
              <strong>{categoryToDelete.name}</strong>"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteCategoryConfirm(false);
                  setCategoryToDelete(null);
                }}
                disabled={isDeletingCategory}
                className="flex-1 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCategory}
                disabled={isDeletingCategory}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingCategory ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoryBrandsManager;
