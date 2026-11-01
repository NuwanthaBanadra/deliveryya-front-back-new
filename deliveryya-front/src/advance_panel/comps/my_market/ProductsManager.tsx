import {
    ChartBarIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, FunnelIcon, MagnifyingGlassIcon, PencilIcon, PlusIcon, TrashIcon, XMarkIcon
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import { FaBoxesStacked, FaTag } from 'react-icons/fa6';
import { MdInventory2, MdStorefront } from 'react-icons/md';
import { useNavigate, useOutletContext } from 'react-router-dom';
import Select from 'react-select';
import Swal from 'sweetalert2';
import { hasAccess } from '../../../util/AccessController';
import axiosInstance, { baseURL } from '../../../util/AxiosUtil';
import { FRONTEND_ACCESS_IDS } from '../../../util/FrontendAccess';
import AddProduct from './AddProduct';
import ProductStats from './product_maneger/ProductStats';
import VariantManager from './product_maneger/VariantManager';
import type { ProductFormData, ProductVariant } from './products/types';
import ForceDeleteDialog from '../../../page_comps/ForceDeleteDialog';

export interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    oldPrice?: number;
    category: string;
    image: string;
    stock: number;
    rating: number;
    reviews: number;
    sold: number;
    isActive: boolean;
    createdAt: string;
    cost?: number;
    showingPrice?: number;
    sellingPrice?: number;
    unit?: string;
    color?: string;
    emi?: string;
    weight?: number;
    colors?: string[];
    variantCount?: number;
    code?: string;
}

interface Category {
    id: number;
    name: string;
}

interface Brand {
    id: number;
    name: string;
    markets?: { id: number } | null;
    marketId?: number | null;
}

interface Unit {
    id: number;
    name: string;
}
interface MarketSize {
    id: number;
    name: string;
}

interface UnitOption {
    id?: number;
    name?: string;
    unitName?: string;
}

interface BackendProductImage {
    id: number;
    imageUrl?: string;
    url?: string;
    products: null;
}

interface BackendProduct {
    id: number;
    name: string;
    desc?: string;
    code: string;
    marketId: number;
    isActive: boolean;
    brand: {
        id: number;
        name: string;
        markets?: { id: number } | null;
    };
    category: {
        id: number;
        name: string;
        markets: null;
    };
    productImages: BackendProductImage[] | null;
}

interface FilterOptions {
    search: string;
    category: string;
    brand: string;
    status: string;
    sortBy: string;
    stockStatus: string;
}

interface ProductDetailsData {
    id: number;
    name: string;
    code: string;
    marketId: number;
    brandName: string;
    categoryName: string;
}

interface FilterSelectOption {
    value: string;
    label: string;
}

// Interface for backend stock response
interface BackendStock {
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
}

function ProductsManager() {
    const navigate = useNavigate();
    const { marketId } = useOutletContext<{ marketId: number | null }>();
    const resolvedMarketId = marketId ?? 0;
    const [isLoading, setIsLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const canDeleteProducts = useMemo(() => hasAccess(FRONTEND_ACCESS_IDS.PRODUCT_DELETE), []);
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewProduct, setViewProduct] = useState<Product | null>(null);
    const [viewProductDescription, setViewProductDescription] = useState<string>('');
    const [viewProductDetails, setViewProductDetails] = useState<ProductDetailsData | null>(null);
    const [viewProductStocks, setViewProductStocks] = useState<BackendStock[]>([]);
    const [viewProductImages, setViewProductImages] = useState<string[]>([]);
    const [viewSelectedImage, setViewSelectedImage] = useState<string | null>(null);
    const [viewDetailsError, setViewDetailsError] = useState<string | null>(null);
    const [showVariantsModal, setShowVariantsModal] = useState(false);
    const [variantsModalProduct, setVariantsModalProduct] = useState<Product | null>(null);
    const [variantFieldErrors, setVariantFieldErrors] = useState<Record<string, string>>({});
    const [isSavingVariants, setIsSavingVariants] = useState(false);
    const [showProductFormModal, setShowProductFormModal] = useState(false);
    const [selectedProductForForm, setSelectedProductForForm] = useState<Product | null>(null);
    const [units, setUnits] = useState<Unit[]>([]);
    const [sizes, setSizes] = useState<MarketSize[]>([]);
    const [stocksByProductId, setStocksByProductId] = useState<Record<number, BackendStock[]>>({});
    const [productDetailsById, setProductDetailsById] = useState<Record<number, ProductDetailsData>>({});
    const [variantFormData, setVariantFormData] = useState<ProductFormData>({
        productName: '',
        code: '',
        category: '',
        categoryId: 0,
        brand: '',
        brandId: 0,
        marketId: resolvedMarketId,
        description: '',
        variants: [],
        images: [],
    });

    // State for categories and brands
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loadingData, setLoadingData] = useState({
        categories: true,
        brands: true,
        products: true,
        stats: true
    });

    const normalizeImageUrl = (url?: string | null) => {
        if (!url) return null;
        const cleanedUrl = url.replace(/\\/g, '/').trim();
        if (cleanedUrl.startsWith('http://') || cleanedUrl.startsWith('https://')) return cleanedUrl;
        if (cleanedUrl.startsWith('/')) return `${baseURL}/uploads${cleanedUrl}`;
        return `${baseURL}/uploads/${cleanedUrl}`;
    };

    const stripHtml = (html?: string | null) => {
        if (!html) return '';
        try {
            return html.replace(/<[^>]*>/g, '').trim();
        } catch (e) {
            return html;
        }
    };

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const productsPerPage = 12;

    const [filters, setFilters] = useState<FilterOptions>({
        search: '',
        category: 'all',
        brand: 'all',
        status: 'all',
        sortBy: 'newest',
        stockStatus: 'all',
    });

    const [stats, setStats] = useState({
        totalProducts: 0,
        activeProducts: 0,
        totalRevenue: 0,
        totalSold: 0,
        totalViews: 0,
        averageRating: 4.7,
        revenueChange: 15.3,
        salesChange: 8.7,
    });

    const filterSelectStyles = {
        control: (base: any, state: any) => ({
            ...base,
            minHeight: '46px',
            borderWidth: '2px',
            borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
            borderRadius: '0.5rem',
            boxShadow: state.isFocused ? '0 0 0 2px rgba(245, 155, 15, 0.2)' : 'none',
            '&:hover': {
                borderColor: '#FCD34D',
            },
            transition: 'all 0.3s',
        }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#FEF3C7' : 'white',
            color: state.isSelected ? 'white' : '#1F2937',
            cursor: 'pointer',
            '&:active': {
                backgroundColor: '#F59B0F',
            },
        }),
        placeholder: (base: any) => ({
            ...base,
            color: '#9CA3AF',
        }),
        menu: (base: any) => ({
            ...base,
            zIndex: 40,
        }),
        menuPortal: (base: any) => ({
            ...base,
            zIndex: 9999,
        }),
    };

    const selectPortalTarget = useMemo(() => {
        if (typeof document === 'undefined') {
            return undefined;
        }
        return document.body;
    }, []);

    const categoryFilterOptions = useMemo<FilterSelectOption[]>(() => {
        const categoryOptions = categories.map((cat) => ({
            value: cat.name,
            label: cat.name,
        }));

        return [{ value: 'all', label: 'All Categories' }, ...categoryOptions];
    }, [categories]);

    const brandFilterOptions = useMemo<FilterSelectOption[]>(() => {
        const brandOptions = brands.map((brand) => ({
            value: brand.name,
            label: brand.name,
        }));

        return [{ value: 'all', label: 'All Brands' }, ...brandOptions];
    }, [brands]);

    const statusFilterOptions: FilterSelectOption[] = [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
    ];

    const stockFilterOptions: FilterSelectOption[] = [
        { value: 'all', label: 'All Stock' },
        { value: 'in-stock', label: 'In Stock' },
        { value: 'low-stock', label: 'Low Stock (<10)' },
        { value: 'out-of-stock', label: 'Out of Stock' },
    ];

    const sortFilterOptions: FilterSelectOption[] = [
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'price-high', label: 'Price: High to Low' },
        { value: 'price-low', label: 'Price: Low to High' },
        { value: 'name-asc', label: 'Name: A to Z' },
        { value: 'name-desc', label: 'Name: Z to A' },
        { value: 'best-selling', label: 'Best Selling' },
        { value: 'rating', label: 'Highest Rating' },
    ];

    // Load data on mount
    useEffect(() => {
        if (!marketId) {
            setLoadingData(prev => ({
                ...prev,
                categories: false,
                brands: false,
                products: false,
                stats: false,
            }));
            setIsLoading(false);
            return;
        }

        setVariantFormData((prev) => ({ ...prev, marketId: resolvedMarketId }));
        loadProducts();
        loadCategories(resolvedMarketId);
        loadBrands(resolvedMarketId);
        loadUnits();
        loadSizes(resolvedMarketId);
    }, [marketId, resolvedMarketId]);

    const loadCategories = async (scopeMarketId: number) => {
        try {
            setLoadingData(prev => ({ ...prev, categories: true }));
            const response = await axiosInstance.post('/products/get-categories', {
                pageNumber: 0,
                countPerPage: 100,
                marketId: scopeMarketId,
                isActive: true,
            });

            if (response.data.message === 'Success' && response.data.object?.items) {
                setCategories(response.data.object.items.filter((category: any) => {
                    const categoryMarketId = Number(category?.marketId ?? category?.markets?.id);
                    return Number.isFinite(categoryMarketId) && categoryMarketId === scopeMarketId;
                }));
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        } finally {
            setLoadingData(prev => ({ ...prev, categories: false }));
        }
    };

    const loadBrands = async (scopeMarketId: number) => {
        try {
            setLoadingData(prev => ({ ...prev, brands: true }));
            const response = await axiosInstance.post('/products/get-brands', {
                pageNumber: 0,
                countPerPage: 100,
                marketId: scopeMarketId,
                isActive: true,
            });

            if (response.data.message === 'Success' && response.data.object?.items) {
                setBrands(response.data.object.items);
            }
        } catch (error) {
            console.error('Failed to load brands:', error);
        } finally {
            setLoadingData(prev => ({ ...prev, brands: false }));
        }
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

        base.forEach((unit) => {
            map.set(unit.name.toLowerCase(), unit);
        });

        next.forEach((unit) => {
            const key = unit.name.toLowerCase();
            if (!map.has(key)) {
                map.set(key, unit);
            }
        });

        return Array.from(map.values());
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

            const normalizedUnits = toUnitOptions(unitsData || []);
            setUnits(normalizedUnits);
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

    const loadProducts = async () => {
        setIsLoading(true);
        setLoadingData(prev => ({ ...prev, products: true, stats: true }));

        try {
            const payload = {
                pageNumber: 0,
                countPerPage: 100,
                marketId: resolvedMarketId,
            };

            let productsResponse = await axiosInstance.post('/products/get-products', payload);

            // const itemsFromPost: BackendProduct[] =
            //     productsResponse.data.exData?.items || productsResponse.data.object?.items || [];

            // if (productsResponse.data.message !== 'Success' || itemsFromPost.length === 0) {
            //     productsResponse = await axiosInstance.post('/products/get-products', payload);
            // }


            const items: BackendProduct[] =
                productsResponse.data.exData?.items || productsResponse.data.object?.items || [];

            let stocksItems: BackendStock[] = [];
            try {
                const stockPayload = {
                    pageNumber: 0,
                    countPerPage: 1000,
                    marketId: resolvedMarketId,
                };

                const stockResponses = await Promise.allSettled([
                    axiosInstance.post('/stocks/get-stocks', { ...stockPayload, isActive: true }),
                    axiosInstance.post('/stocks/get-stocks', { ...stockPayload, isActive: false }),
                ]);

                const stockItemsById = new Map<number, BackendStock>();

                stockResponses.forEach((result) => {
                    if (result.status !== 'fulfilled') {
                        return;
                    }

                    const response = result.value;
                    if (response.data.message !== 'Success') {
                        console.warn('Unexpected response structure for stocks:', response.data);
                        return;
                    }

                    const items = response.data.exData?.items || response.data.object?.items || [];
                    items.forEach((stock: BackendStock) => {
                        if (stock.id) {
                            stockItemsById.set(stock.id, stock);
                        }
                    });
                });

                if (stockItemsById.size === 0) {
                    const fallbackResponse = await axiosInstance.post('/stocks/get-stocks', stockPayload);
                    if (fallbackResponse.data.message === 'Success') {
                        const fallbackItems = fallbackResponse.data.exData?.items || fallbackResponse.data.object?.items || [];
                        fallbackItems.forEach((stock: BackendStock) => {
                            if (stock.id) {
                                stockItemsById.set(stock.id, stock);
                            }
                        });
                    } else {
                        console.warn('Unexpected response structure for stocks:', fallbackResponse.data);
                    }
                }

                stocksItems = Array.from(stockItemsById.values());
            } catch (stockError) {
                console.warn('Failed to load stock details:', stockError);
            }

            const stocksByProductId = new Map<number, BackendStock[]>();
            
            stocksItems.forEach((stock) => {
                const productId = stock.products?.id;
                if (!productId) return;
                const existing = stocksByProductId.get(productId) || [];
                existing.push(stock);
                stocksByProductId.set(productId, existing);
            });

            const stocksObject: Record<number, BackendStock[]> = {};
            stocksByProductId.forEach((value, key) => {
                stocksObject[key] = value;
            });
            setStocksByProductId(stocksObject);

            if (productsResponse.data.message === 'Success') {
                const backendProducts: Product[] = items.map((product) => {
                    const relatedStocks = stocksByProductId.get(product.id) || [];
                    const primaryStock = relatedStocks[0];
                    const totalQty = relatedStocks.reduce((sum, stock) => sum + (stock.qty || 0), 0);

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
                    const uniqueColors = Array.from(
                        new Set(
                            relatedStocks
                                .map((stock) => stock.color?.trim())
                                .filter((color): color is string => Boolean(color))
                        )
                    );

                    return {
                        id: product.id,
                        name: product.name,
                        description: product.desc?.trim() || 'No description available',
                        price,
                        oldPrice,
                        category: typeof product.category === 'string' ? product.category : product.category?.name || 'Uncategorized',
                        image: firstImage,
                        stock: totalQty,
                        rating: 4.5,
                        reviews: 0,
                        sold: 0,
                        isActive: product.isActive ?? true,
                        createdAt: new Date().toISOString().split('T')[0],
                        cost: primaryStock?.cost,
                        showingPrice: primaryStock?.showingPrice,
                        sellingPrice: primaryStock?.sellingPrice,
                        unit: primaryStock?.unit?.name,
                        color: primaryStock?.color,
                        colors: uniqueColors,
                        variantCount: relatedStocks.length,
                        emi: primaryStock?.emi,
                        weight: primaryStock?.wpu,
                    };
                });

                calculateStatistics(backendProducts);

                const detailsMap: Record<number, ProductDetailsData> = {};
                items.forEach((item) => {
                    detailsMap[item.id] = {
                        id: item.id,
                        name: item.name,
                        code: item.code,
                        marketId: item.marketId,
                        brandName: item.brand?.name || 'N/A',
                        categoryName: item.category?.name || 'Uncategorized',
                    };
                });
                setProductDetailsById(detailsMap);

                setProducts(backendProducts);
                setFilteredProducts(backendProducts);
            } else {
                console.warn('Unexpected response structure for products:', productsResponse.data);
                setProducts([]);
                setFilteredProducts([]);
                setProductDetailsById({});
                setStocksByProductId({});
            }
        } catch (error: any) {
            console.error('Failed to load products:', error);

            let errorMessage = 'Failed to load products. Please try again.';

            if (error.response) {
                const { status, data } = error.response;

                switch (status) {
                    case 400:
                        errorMessage = data.desc || 'Bad request. Please check your parameters.';
                        break;
                    case 401:
                        errorMessage = 'Authentication required. Please login again.';
                        localStorage.removeItem('jwtToken');
                        localStorage.removeItem('userId');
                        localStorage.removeItem('userNic');
                        navigate('/sign-in', { replace: true });
                        break;
                    case 403:
                        errorMessage = 'You do not have permission to view products.';
                        break;
                    case 404:
                        errorMessage = 'Products endpoint not found.';
                        break;
                    case 500:
                        errorMessage = 'Server error. Please try again later.';
                        break;
                    default:
                        errorMessage = data.desc || `Error ${status}: ${data.message || 'Unknown error'}`;
                }

                console.error('Backend error details:', {
                    status,
                    data,
                    request: error.config
                });
            } else if (error.request) {
                errorMessage = 'No response from server. Please check your internet connection.';
            } else if (error.message) {
                errorMessage = `Request error: ${error.message}`;
            }

        } finally {
            setIsLoading(false);
            setLoadingData(prev => ({ ...prev, products: false, stats: false }));
        }
    };

    // Calculate statistics from products data
    const calculateStatistics = (productsList: Product[]) => {
        const totalProducts = productsList.length;
        const activeProducts = productsList.filter(p => p.isActive).length;
        const totalRevenue = productsList.reduce((sum, p) => sum + (p.price * (p.sold || 0)), 0);
        const totalSold = productsList.reduce((sum, p) => sum + (p.sold || 0), 0);
        const totalViews = productsList.reduce((sum, p) => sum + (p.reviews || 0) * 10, 0); // Estimate views
        const averageRating = productsList.length > 0
            ? productsList.reduce((sum, p) => sum + p.rating, 0) / productsList.length
            : 4.7;

        setStats({
            totalProducts,
            activeProducts,
            totalRevenue,
            totalSold,
            totalViews,
            averageRating,
            revenueChange: 15.3, // These would need to be calculated from historical data
            salesChange: 8.7,
        });
    };


    // Apply filters whenever filters or products change
    useEffect(() => {
        applyFilters();
        setCurrentPage(1); // Reset to first page on filter change
    }, [filters, products]);

    const applyFilters = () => {
        let filtered = [...products];

        // Search filter
        if (filters.search) {
            filtered = filtered.filter(
                (product) =>
                    product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                    stripHtml(product.description).toLowerCase().includes(filters.search.toLowerCase()) ||
                    (typeof product.category === 'string' ? product.category : product.category?.name || '').toLowerCase().includes(filters.search.toLowerCase())
            );
        }

        // Category filter
        if (filters.category !== 'all') {
            filtered = filtered.filter((product) => (typeof product.category === 'string' ? product.category : product.category?.name) === filters.category);
        }

        // Status filter
        if (filters.status !== 'all') {
            filtered = filtered.filter((product) =>
                filters.status === 'active' ? product.isActive : !product.isActive
            );
        }

        // Stock status filter
        if (filters.stockStatus !== 'all') {
            filtered = filtered.filter((product) => {
                if (filters.stockStatus === 'in-stock') return product.stock > 10;
                if (filters.stockStatus === 'low-stock')
                    return product.stock > 0 && product.stock <= 10;
                if (filters.stockStatus === 'out-of-stock') return product.stock === 0;
                return true;
            });
        }

        // Sorting
        filtered.sort((a, b) => {
            switch (filters.sortBy) {
                case 'newest':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'oldest':
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'price-high':
                    return b.price - a.price;
                case 'price-low':
                    return a.price - b.price;
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'best-selling':
                    return (b.sold || 0) - (a.sold || 0);
                case 'rating':
                    return b.rating - a.rating;
                default:
                    return 0;
            }
        });

        setFilteredProducts(filtered);
    };

    // Pagination calculations
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

    // Filter change handler
    const handleFilterChange = (key: keyof FilterOptions, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({
            search: '',
            category: 'all',
            brand: 'all',
            status: 'all',
            sortBy: 'newest',
            stockStatus: 'all',
        });
    };

    // // Handlers
    const handleOpenAddProductModal = () => {
        setSelectedProductForForm(null);
        setShowProductFormModal(true);
    };

    const handleEditProduct = (product: Product) => {
        setSelectedProductForForm(product);
        setShowProductFormModal(true);
    };

    const closeProductFormModal = () => {
        setShowProductFormModal(false);
        setSelectedProductForForm(null);
    };

    const handleProductFormSaved = async () => {
        await loadProducts();
    };

    const handleDeleteProduct = (product: Product) => {
        if (!canDeleteProducts) return;

        setProductToDelete(product);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!productToDelete || !canDeleteProducts) return;

        setIsDeleting(true);
        try {
            const response = await axiosInstance.delete('/products/delete-product-by-id', {
                params: { id: productToDelete.id },
            });

            const desc = response?.data?.desc;

            // Remove from local state
            const remaining = products.filter((p) => p.id !== productToDelete.id);
            setProducts(remaining);

            // Recalculate stats
            calculateStatistics(remaining);

            Swal.fire({
                icon: 'success',
                title: 'Product Deleted!',
                text: desc || `${productToDelete.name} has been deleted successfully.`,
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
            let errorMessage = 'Failed to delete product. Please try again.';
            if (error?.response?.data) {
                errorMessage = error.response.data.desc || errorMessage;
            }

            Swal.fire({
                icon: 'error',
                title: 'Delete Failed',
                text: errorMessage,
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 4000,
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleViewProduct = async (product: Product) => {
        setViewProduct(product);
        setViewProductDescription(stripHtml(product.description || 'No description available.'));
        setViewProductStocks(stocksByProductId[product.id] || []);
        setViewProductImages(product.image ? [product.image] : []);
        setViewSelectedImage(product.image || null);
        setViewProductDetails(productDetailsById[product.id] || {
            id: product.id,
            name: product.name,
            code: 'N/A',
            marketId: resolvedMarketId,
            brandName: 'N/A',
            categoryName: typeof product.category === 'string' ? product.category : product.category?.name || 'Uncategorized',
        });
        setViewDetailsError(null);
        setShowViewModal(true);

        try {
            const response = await axiosInstance.get(`/products/get-products-by-id?id=${product.id}`);
            const productObject = response.data?.object;

            if (productObject && typeof productObject === 'object') {
                const details = productObject as BackendProduct;
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
                    categoryName: details.category?.name || 'Uncategorized',
                });
            }
        } catch (error) {
            console.error('Failed to fetch product details:', error);
            setViewDetailsError('Could not refresh full product details from the server. Showing available data.');
        }
    };

    const closeViewModal = () => {
        setShowViewModal(false);
        setViewProduct(null);
        setViewProductDescription('');
        setViewProductDetails(null);
        setViewProductStocks([]);
        setViewProductImages([]);
        setViewSelectedImage(null);
        setViewDetailsError(null);
    };

    const handleToggleStatus = async (productId: number, isActive: boolean) => {
        const product = products.find((p) => p.id === productId);
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
            const response = await axiosInstance.put('/products/update-product-status', null, {
                params: { productId, isActive },
            });

            // Update local state
            const updatedProducts = products.map((p) => (p.id === productId ? { ...p, isActive } : p));
            setProducts(updatedProducts);

            // Recalculate stats
            calculateStatistics(updatedProducts);

            const desc = response?.data?.desc;
            Swal.fire({
                icon: 'success',
                title: 'Status Updated!',
                text: desc || `Product status has been ${isActive ? 'activated' : 'deactivated'}.`,
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 2000,
            });
        } catch (error: any) {
            console.error('Failed to toggle product status:', error);
            let errorMessage = 'Failed to update product status. Please try again.';
            if (error?.response?.data) {
                errorMessage = error.response.data.desc || errorMessage;
            }

            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: errorMessage,
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3000,
            });
        }
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

    const handleOpenVariantsModal = async (product: Product) => {
        const productStocks = stocksByProductId[product.id] || [];
        const productVariants = mapStocksToVariants(productStocks);

        // Fallback to units found in product stocks so selector is still usable
        const stockUnits: Unit[] = productStocks
            .filter((stock) => stock.unit?.name)
            .map((stock, index) => ({
                id: stock.unit?.id || index + 1,
                name: stock.unit?.name || '',
            }));

        if (stockUnits.length > 0) {
            setUnits((prev) => mergeUnits(prev, stockUnits));
        }

        // Retry unit load when opening modal if units are empty
        if (units.length === 0) {
            await loadUnits();
        }

        setVariantsModalProduct(product);
        setVariantFieldErrors({});
        setVariantFormData({
            productName: product.name,
            code: product.id.toString(),
            category: typeof product.category === 'string' ? product.category : product.category?.name || '',
            categoryId: 0,
            brand: '',
            brandId: 0,
            marketId: resolvedMarketId,
            description: product.description || '',
            variants: productVariants,
            images: [],
        });
        setShowVariantsModal(true);
    };

    const closeVariantsModal = () => {
        setShowVariantsModal(false);
        setVariantsModalProduct(null);
        setVariantFieldErrors({});
    };

    const handleVariantInputChange = (field: keyof ProductFormData, value: ProductVariant[]) => {
        if (field !== 'variants') {
            return;
        }

        setVariantFormData((prev) => ({
            ...prev,
            variants: value,
        }));

        setVariantFieldErrors((prev) => {
            const cleared = { ...prev };
            delete cleared.variants;
            Object.keys(cleared).forEach((key) => {
                if (key.startsWith('variant_')) {
                    delete cleared[key];
                }
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
            if (!variant.quantity || parseFloat(variant.quantity.toString()) <= 0) {
                errors[`variant_${index}_quantity`] = 'Quantity must be greater than 0';
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
        if (!variantsModalProduct) {
            return;
        }

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
                        if (
                            !Number.isNaN(parsedId) &&
                            parsedId <= 2147483647 &&
                            parsedId >= -2147483648 &&
                            !variant.id.startsWith('temp_')
                        ) {
                            stockId = parsedId;
                        }
                    }

                    const unitId =
                        variant.unitId || units.find((unit) => unit.name === variant.unit)?.id || 1;

                    return {
                        id: stockId,
                        desc: variant.description || variantsModalProduct.description || 'Product variant',
                        cost: parseFloat(variant.cost?.toString() || '0'),
                        showingPrice: variant.showingPrice ? parseFloat(variant.showingPrice.toString()) : null,
                        sellingPrice: parseFloat(variant.sellingPrice?.toString() || '0'),
                        qty: parseFloat(variant.quantity?.toString() || '0'),
                        unit: {
                            id: unitId,
                        },
                        color: variant.color || 'Default',
                        emi: variant.emi || '',
                        sizes: variant.sizeId
                            ? { id: variant.sizeId }
                            : variant.size
                                ? { name: variant.size }
                                : null,
                        wpu: parseFloat(variant.weight?.toString() || '0') || 0,
                        isActive: variant.isActive ?? true,
                    };
                }),
            };

            await axiosInstance.post('/stocks/update-stock', payload);

            await Swal.fire({
                icon: 'success',
                title: 'Product Variants Updated!',
                text: 'Your product variants have been updated successfully.',
                showConfirmButton: false,
                timer: 2500,
                background: '#FFF4EE',
                color: '#1A1F3A',
                iconColor: '#00BFA5',
            });

            closeVariantsModal();
            await loadProducts();
        } catch (error) {
            console.error('Failed to update product variants:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: 'Failed to update product variants. Please try again.',
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3000,
                background: '#FEF2F2',
                color: '#991B1B',
                iconColor: '#DC2626',
            });
        } finally {
            setIsSavingVariants(false);
        }
    };

    const handleToggleVariantStatus = async (variantId: string) => {
        if (!variantsModalProduct) return;

        const variant = variantFormData.variants.find((v) => v.id === variantId);
        if (!variant) return;

        const newStatus = !(variant.isActive ?? true);
        const actionText = newStatus ? 'activate' : 'deactivate';

        const result = await Swal.fire({
            title: `Confirm ${actionText}`,
            text: `Are you sure you want to ${actionText} this variant?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, proceed',
            cancelButtonText: 'Cancel',
            reverseButtons: true,
        });

        if (!result.isConfirmed) return;

        try {
            // Update local state first
            const updatedVariants = variantFormData.variants.map((v) =>
                v.id === variantId ? { ...v, isActive: newStatus } : v
            );
            setVariantFormData((prev) => ({ ...prev, variants: updatedVariants }));

            // If this is an existing variant (not temporary), call the API
            if (!variantId.startsWith('temp_')) {
                const parsedStockId = parseInt(variantId, 10);
                if (!Number.isNaN(parsedStockId)) {
                    await axiosInstance.put('/stocks/update-stock-status', null, {
                        params: { stockId: parsedStockId, isActive: newStatus },
                    });
                }
            }

            Swal.fire({
                icon: 'success',
                title: 'Status Updated!',
                text: `Variant has been ${newStatus ? 'activated' : 'deactivated'} successfully.`,
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 2000,
            });
        } catch (error: any) {
            console.error('Failed to toggle variant status:', error);

            // Revert local state on error
            const revertedVariants = variantFormData.variants.map((v) =>
                v.id === variantId ? { ...v, isActive: !(newStatus) } : v
            );
            setVariantFormData((prev) => ({ ...prev, variants: revertedVariants }));

            let errorMessage = 'Failed to update variant status. Please try again.';
            if (error?.response?.data) {
                errorMessage = error.response.data.desc || errorMessage;
            }

            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: errorMessage,
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3000,
            });
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

            Swal.fire({
                icon: 'success',
                title: 'Stock Deleted',
                text: 'Stock row was deleted successfully.',
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 2500,
            });

            await loadProducts();
            return true;
        } catch (error: any) {
            const errorMessage = error?.response?.data?.desc || error?.response?.data?.message || error?.message || 'Failed to delete stock row.';

            Swal.fire({
                icon: 'error',
                title: 'Delete Failed',
                text: errorMessage,
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3500,
            });
            return false;
        }
    };

    const hasActiveFilters = Boolean(
        filters.search ||
        filters.category !== 'all' ||
        filters.brand !== 'all' ||
        filters.status !== 'all' ||
        filters.stockStatus !== 'all'
    );

    return (
        <>
            {/* Stats Section */}
            {!loadingData.stats && <ProductStats stats={stats} />}

            <div className="space-y-6">
                {/* Filters Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    {/* Top Row - Search and Filter Toggle */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search Bar */}
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search products by name..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 outline-none transition-all duration-300"
                            />
                        </div>

                        {/* Filter Toggle Button */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleOpenAddProductModal}
                                className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 bg-linear-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:from-emerald-600 hover:to-teal-600"
                            >
                                <PlusIcon className="w-5 h-5" />
                                <span>Add Product</span>
                            </button>

                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${showFilters
                                    ? 'bg-gradient-to-r from-[#F59B0F] to-[#FFA726] text-white shadow-lg'
                                    : 'border-2 border-gray-300 text-gray-700 hover:border-[#F59B0F]'
                                    }`}
                            >
                                <FunnelIcon className="w-5 h-5" />
                                <span className="hidden sm:inline">Filters</span>
                            </button>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="px-4 py-3 border-2 border-red-300 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-all duration-300 flex items-center gap-2"
                                    title="Clear all filters"
                                    aria-label="Clear all filters"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Expandable Filters Section */}
                    {showFilters && (
                        <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-slideDown">
                            {/* Category Filter */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Category
                                </label>
                                <Select
                                    inputId="products-filter-category"
                                    aria-label="Filter products by category"
                                    value={categoryFilterOptions.find((option) => option.value === filters.category) || categoryFilterOptions[0]}
                                    onChange={(option) => handleFilterChange('category', option?.value || 'all')}
                                    options={categoryFilterOptions}
                                    placeholder={loadingData.categories ? 'Loading categories...' : 'Select category'}
                                    menuPortalTarget={selectPortalTarget}
                                    menuPosition="fixed"
                                    styles={filterSelectStyles}
                                    className="react-select-container"
                                    classNamePrefix="react-select"
                                    isDisabled={loadingData.categories}
                                    isLoading={loadingData.categories}
                                />
                            </div>

                            {/* Brand Filter */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Brand
                                </label>
                                <Select
                                    inputId="products-filter-brand"
                                    aria-label="Filter products by brand"
                                    value={brandFilterOptions.find((option) => option.value === filters.brand) || brandFilterOptions[0]}
                                    onChange={(option) => handleFilterChange('brand', option?.value || 'all')}
                                    options={brandFilterOptions}
                                    placeholder={loadingData.brands ? 'Loading brands...' : 'Select brand'}
                                    menuPortalTarget={selectPortalTarget}
                                    menuPosition="fixed"
                                    styles={filterSelectStyles}
                                    className="react-select-container"
                                    classNamePrefix="react-select"
                                    isDisabled={loadingData.brands}
                                    isLoading={loadingData.brands}
                                />
                            </div>

                            {/* Status Filter */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                <Select
                                    inputId="products-filter-status"
                                    aria-label="Filter products by status"
                                    value={statusFilterOptions.find((option) => option.value === filters.status) || statusFilterOptions[0]}
                                    onChange={(option) => handleFilterChange('status', option?.value || 'all')}
                                    options={statusFilterOptions}
                                    menuPortalTarget={selectPortalTarget}
                                    menuPosition="fixed"
                                    styles={filterSelectStyles}
                                    className="react-select-container"
                                    classNamePrefix="react-select"
                                />
                            </div>

                            {/* Stock Status Filter */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Stock</label>
                                <Select
                                    inputId="products-filter-stock"
                                    aria-label="Filter products by stock status"
                                    value={stockFilterOptions.find((option) => option.value === filters.stockStatus) || stockFilterOptions[0]}
                                    onChange={(option) => handleFilterChange('stockStatus', option?.value || 'all')}
                                    options={stockFilterOptions}
                                    menuPortalTarget={selectPortalTarget}
                                    menuPosition="fixed"
                                    styles={filterSelectStyles}
                                    className="react-select-container"
                                    classNamePrefix="react-select"
                                />
                            </div>

                            {/* Sort By */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
                                <Select
                                    inputId="products-filter-sort"
                                    aria-label="Sort products by"
                                    value={sortFilterOptions.find((option) => option.value === filters.sortBy) || sortFilterOptions[0]}
                                    onChange={(option) => handleFilterChange('sortBy', option?.value || 'newest')}
                                    options={sortFilterOptions}
                                    menuPortalTarget={selectPortalTarget}
                                    menuPosition="fixed"
                                    styles={filterSelectStyles}
                                    className="react-select-container"
                                    classNamePrefix="react-select"
                                />
                            </div>
                        </div>
                    )}

                    {/* Active Filters Display */}
                    {hasActiveFilters && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {filters.search && (
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-[#F59B0F] rounded-full text-sm font-semibold">
                                    Search: "{filters.search}"
                                    <button
                                        type="button"
                                        onClick={() => handleFilterChange('search', '')}
                                        className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
                                        title="Remove search filter"
                                        aria-label="Remove search filter"
                                    >
                                        <XMarkIcon className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {filters.category !== 'all' && (
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                                    Category: {filters.category}
                                    <button
                                        type="button"
                                        onClick={() => handleFilterChange('category', 'all')}
                                        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                                        title="Remove category filter"
                                        aria-label="Remove category filter"
                                    >
                                        <XMarkIcon className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {filters.brand !== 'all' && (
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-sm font-semibold">
                                    Brand: {filters.brand}
                                    <button
                                        type="button"
                                        onClick={() => handleFilterChange('brand', 'all')}
                                        className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                                        title="Remove brand filter"
                                        aria-label="Remove brand filter"
                                    >
                                        <XMarkIcon className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {filters.status !== 'all' && (
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm font-semibold">
                                    Status: {filters.status}
                                    <button
                                        type="button"
                                        onClick={() => handleFilterChange('status', 'all')}
                                        className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
                                        title="Remove status filter"
                                        aria-label="Remove status filter"
                                    >
                                        <XMarkIcon className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {filters.stockStatus !== 'all' && (
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm font-semibold">
                                    Stock: {filters.stockStatus}
                                    <button
                                        type="button"
                                        onClick={() => handleFilterChange('stockStatus', 'all')}
                                        className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                                        title="Remove stock filter"
                                        aria-label="Remove stock filter"
                                    >
                                        <XMarkIcon className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="inline-block w-16 h-16 border-4 border-[#F59B0F] border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-600 font-semibold">Loading products...</p>
                        </div>
                    </div>
                )}

                {/* Results Count */}
                {!isLoading && filteredProducts.length > 0 && (
                    <div className="flex items-center justify-between">
                        <p className="text-gray-600 font-semibold">
                            Showing <span className="text-[#F59B0F]">{indexOfFirstProduct + 1}</span> -{' '}
                            <span className="text-[#F59B0F]">
                                {Math.min(indexOfLastProduct, filteredProducts.length)}
                            </span>{' '}
                            of <span className="text-[#F59B0F]">{filteredProducts.length}</span> products
                        </p>
                    </div>
                )}

                {/* Products Grid */}
                {!isLoading && currentProducts.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {currentProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onEdit={handleEditProduct}
                                onDelete={handleDeleteProduct}
                                onView={handleViewProduct}
                                onManageVariants={handleOpenVariantsModal}
                                onToggleStatus={handleToggleStatus}
                                canDelete={canDeleteProducts}
                                onRefresh={loadProducts}
                            />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && filteredProducts.length === 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 p-12 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
                            <FunnelIcon className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No Products Found</h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                            {hasActiveFilters
                                ? 'No products match your current filters. Try adjusting your search criteria or clear filters to see all products.'
                                : 'You have no products yet. Start adding products to see them here.'}
                        </p>
                    </div>
                )}

                {/* Pagination */}
                {!isLoading && filteredProducts.length > productsPerPage && (
                    <div className="flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-2 border-2 border-gray-300 rounded-lg hover:border-[#F59B0F] hover:text-[#F59B0F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Previous page"
                            aria-label="Previous page"
                        >
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>

                        <div className="flex gap-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                // Show first page, last page, current page, and pages around current
                                if (
                                    page === 1 ||
                                    page === totalPages ||
                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                ) {
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${currentPage === page
                                                ? 'bg-gradient-to-r from-[#F59B0F] to-[#FFA726] text-white'
                                                : 'border-2 border-gray-300 text-gray-700 hover:border-[#F59B0F]'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    );
                                } else if (page === currentPage - 2 || page === currentPage + 2) {
                                    return (
                                        <span key={page} className="px-2 py-2 text-gray-500">
                                            ...
                                        </span>
                                    );
                                }
                                return null;
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="p-2 border-2 border-gray-300 rounded-lg hover:border-[#F59B0F] hover:text-[#F59B0F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Next page"
                            aria-label="Next page"
                        >
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Variant Management Modal */}
                {showVariantsModal && variantsModalProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <div className="scrollbar-hide relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-gray-50 shadow-2xl">
                            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-5 py-4 backdrop-blur sm:px-6">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Variant Manager</p>
                                    <h3 className="mt-1 text-xl font-black text-white sm:text-3xl">
                                        {variantsModalProduct.name}
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeVariantsModal}
                                    className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
                                    title="Close variants modal"
                                    aria-label="Close variants modal"
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
                                        className="px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium transition-all duration-300 shadow-lg disabled:opacity-50"
                                    >
                                        {isSavingVariants ? 'Updating Variants...' : 'Save Variants'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add/Edit Product Modal */}
                {showProductFormModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <div className="scrollbar-hide relative max-h-[94vh] w-full max-w-7xl overflow-y-auto rounded-3xl bg-gray-50 shadow-2xl">
                            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-5 py-4 backdrop-blur sm:px-6">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Product Manager</p>
                                    <h3 className="mt-1 text-xl font-black text-white sm:text-3xl">
                                        {selectedProductForForm ? 'Update Product' : 'Add Product'}
                                    </h3>
                                    <p className="text-white/75 transition-colors duration-300">
                                        {selectedProductForForm ? 'Update product details and information' : 'Create a new product listing with detailed information'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeProductFormModal}
                                    className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
                                    title="Close product form"
                                    aria-label="Close product form"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-5 sm:p-6">
                                <AddProduct
                                    inModal
                                    productToEdit={selectedProductForForm}
                                    onClose={closeProductFormModal}
                                    onSaved={handleProductFormSaved}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Product Show Modal Confirmation Modal */}
                {showViewModal && viewProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <div className="scrollbar-hide relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-gray-50 shadow-2xl">
                            <div className="relative overflow-hidden bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-5 pb-5 pt-6 sm:px-6">
                                <button
                                    type="button"
                                    onClick={closeViewModal}
                                    className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
                                    title="Close product details"
                                    aria-label="Close product details"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Product Overview</p>
                                <h3 className="mt-2 flex items-center gap-2 text-2xl font-black text-white sm:text-3xl">
                                    <MdInventory2 className="h-7 w-7" />
                                    {viewProduct.name}
                                </h3>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${viewProduct.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'}`}>
                                        {viewProduct.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
                                        <FaTag className="h-3.5 w-3.5" />
                                        Code: {viewProductDetails?.code || 'N/A'}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
                                        <FaBoxesStacked className="h-3.5 w-3.5" />
                                        {viewProductStocks.length} stock rows
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-6 p-5 sm:p-6">
                                {viewDetailsError && (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                                        {viewDetailsError}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-1">
                                        <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                                            <img
                                                src={viewSelectedImage || viewProduct.image}
                                                alt={viewProduct.name}
                                                className="h-60 w-full object-cover"
                                            />
                                        </div>

                                        {viewProductImages.length > 1 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {viewProductImages.map((imageUrl, index) => {
                                                    const isActiveImage = imageUrl === (viewSelectedImage || viewProduct.image);
                                                    return (
                                                        <button
                                                            key={`${imageUrl}-${index}`}
                                                            type="button"
                                                            onClick={() => setViewSelectedImage(imageUrl)}
                                                            className={`h-14 w-14 overflow-hidden rounded-lg border-2 bg-gray-50 transition ${isActiveImage
                                                                ? 'border-amber-400 ring-2 ring-amber-200'
                                                                : 'border-gray-200 hover:border-amber-300'
                                                                }`}
                                                            title={`Show image ${index + 1}`}
                                                            aria-label={`Show image ${index + 1}`}
                                                        >
                                                            <img
                                                                src={imageUrl}
                                                                alt={`${viewProduct.name} thumbnail ${index + 1}`}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                            <div className="rounded-xl border border-orange-100 bg-orange-50 p-3">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Selling <small>(LKR)</small></p>
                                                <p className="mt-1 text-base font-black text-[#D17F0A]">{(viewProduct.sellingPrice ?? viewProduct.price).toFixed(2)}</p>
                                            </div>
                                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Cost <small>(LKR)</small></p>
                                                <p className="mt-1 text-base font-black text-blue-700">{(viewProduct.cost ?? 0).toFixed(2)}</p>
                                            </div>
                                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Stock</p>
                                                <p className="mt-1 text-base font-black text-emerald-700">{viewProduct.stock}</p>
                                            </div>
                                            <div className="rounded-xl border border-purple-100 bg-purple-50 p-3">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">EMI</p>
                                                <p className="mt-1 text-base font-black text-purple-700">{viewProduct.emi || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                                                <MdStorefront className="h-4 w-4" />
                                                Product Information
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleEditProduct(viewProduct);
                                                    closeViewModal();
                                                }}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100"
                                                title="Edit Product"
                                                aria-label="Edit product"
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700 sm:grid-cols-2">
                                            <p className="flex items-center gap-1.5"><span className="text-gray-500">Category:</span> <span className="font-semibold">{viewProductDetails?.categoryName || (typeof viewProduct.category === 'string' ? viewProduct.category : viewProduct.category?.name)}</span></p>
                                            <p><span className="text-gray-500">Brand:</span> <span className="font-semibold">{viewProductDetails?.brandName || 'N/A'}</span></p>
                                            <p><span className="text-gray-500">Color:</span> <span className="font-semibold">{viewProduct.color || 'N/A'}</span></p>
                                            <p><span className="text-gray-500">Unit:</span> <span className="font-semibold">{viewProduct.unit || 'N/A'}</span></p>
                                            <p><span className="text-gray-500">Weight:</span> <span className="font-semibold">{viewProduct.weight ?? 'N/A'}</span></p>
                                            <p><span className="text-gray-500">Showing Price <small>(LKR)</small>:</span> <span className="font-semibold">{(viewProduct.showingPrice ?? 0).toFixed(2)}</span></p>
                                        </div>

                                        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Description</p>
                                            <p className="mt-2 text-sm leading-6 text-gray-700 whitespace-pre-wrap">{viewProductDescription || 'No description available.'}</p>
                                        </div>
                                    </section>
                                </div>

                                <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                                                <MdInventory2 className="h-4 w-4" />
                                                Stocks Table
                                            </p>
                                            <h4 className="mt-1 text-lg font-black text-gray-900">Inventory Rows</h4>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center rounded-xl bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 ring-1 ring-orange-200">
                                                {viewProductStocks.length} entries
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    void handleOpenVariantsModal(viewProduct);
                                                    closeViewModal();
                                                }}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700 transition hover:bg-purple-100"
                                                title="Manage Variants"
                                                aria-label="Manage product variants"
                                            >
                                                <FaBoxesStacked className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {viewProductStocks.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
                                            No stock rows available for this product.
                                        </div>
                                    ) : (
                                        <div className="scrollbar-hide overflow-x-auto rounded-xl border border-gray-200">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="bg-linear-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                                        {/* <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Stock ID</th> */}
                                                        <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Color</th>
                                                        <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-gray-700">Size</th>
                                                        <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-gray-700">Qty</th>
                                                        <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-gray-700">Unit</th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-gray-700">Cost <small>(LKR)</small></th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-gray-700">Show <small>(LKR)</small></th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-gray-700">Sell <small>(LKR)</small></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 bg-white">
                                                    {viewProductStocks.map((stock) => (
                                                        <tr key={stock.id} className="hover:bg-orange-50/40 transition-colors">
                                                            {/* <td className="px-3 py-2.5 text-gray-700">{stock.id}</td> */}
                                                            <td className="px-3 py-2.5 text-gray-700">
                                                                {stock.color ? (
                                                                    <span
                                                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 shadow-sm"
                                                                        style={{ backgroundColor: resolveSwatchColor(stock.color) || '#9CA3AF' }}
                                                                        title={`Color: ${stock.color}`}
                                                                        aria-label={`Stock color ${stock.color}`}
                                                                    >
                                                                        <span className="sr-only">Color swatch</span>
                                                                    </span>
                                                                ) : (
                                                                    '-'
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center text-gray-700">{stock.sizes?.name || '-'}</td>
                                                            <td className="px-3 py-2.5 text-center font-bold text-gray-900">{stock.qty ?? 0}</td>
                                                            <td className="px-3 py-2.5 text-center text-gray-700">{stock.unit?.name || '-'}</td>
                                                            <td className="px-3 py-2.5 text-right text-gray-700">{(stock.cost ?? 0).toFixed(2)}</td>
                                                            <td className="px-3 py-2.5 text-right text-gray-700">{(stock.showingPrice ?? 0).toFixed(2)}</td>
                                                            <td className="px-3 py-2.5 text-right font-bold text-[#D17F0A]">{(stock.sellingPrice ?? 0).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
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
                                <strong>{productToDelete.name}</strong>"? This action cannot be undone.
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
                                        <>
                                            <CheckIcon className="w-5 h-5" />
                                            Delete
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

const resolveSwatchColor = (colorValue?: string): string | null => {
    const rawColor = colorValue?.trim();
    if (!rawColor) {
        return null;
    }

    const hexWithHash = rawColor.match(/#(?:[\dA-Fa-f]{8}|[\dA-Fa-f]{6}|[\dA-Fa-f]{4}|[\dA-Fa-f]{3})\b/);
    if (hexWithHash) {
        return hexWithHash[0];
    }

    if (/^(?:[\dA-Fa-f]{8}|[\dA-Fa-f]{6}|[\dA-Fa-f]{4}|[\dA-Fa-f]{3})$/.test(rawColor)) {
        return `#${rawColor}`;
    }

    if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
        if (CSS.supports('color', rawColor)) {
            return rawColor;
        }

        const nameMatch = rawColor.match(/[A-Za-z]+(?:\s+[A-Za-z]+)*/);
        if (nameMatch) {
            const normalizedName = nameMatch[0].toLowerCase().replace(/\s+/g, '');
            if (CSS.supports('color', normalizedName)) {
                return normalizedName;
            }
        }
    }

    return null;
};

// Updated Product Card Component with more details
function ProductCard({
    product,
    onEdit,
    onDelete,
    onView,
    onManageVariants,
    onToggleStatus,
    canDelete,
    onRefresh,
}: {
    product: Product;
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
    onView: (product: Product) => void;
    onManageVariants: (product: Product) => void;
    onToggleStatus: (productId: number, isActive: boolean) => void;
    canDelete: boolean;
    onRefresh: () => void;
}) {
    const swatchColors = Array.from(
        new Set((product.colors && product.colors.length > 0 ? product.colors : product.color ? [product.color] : []))
    );
    const visibleSwatches = swatchColors.slice(0, 3);
    const extraSwatchCount = Math.max(0, swatchColors.length - visibleSwatches.length);

    const discount = product.oldPrice && product.oldPrice > product.price
        ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
        : 0;

    // Calculate profit margin
    const profitMargin = product.cost
        ? Math.round(((product.price - product.cost) / product.price) * 100)
        : 0;

    return (
        <div className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl overflow-hidden transition-all duration-300 border border-gray-200">
            {/* Discount Badge */}
            {discount > 0 && product.isActive && (
                <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                    {discount}% OFF
                </div>
            )}

            {/* Image Container */}
            <div className="relative overflow-hidden bg-gray-100 h-56">
                <img
                    src={product.image}
                    alt={product.name}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${!product.isActive || product.stock === 0 ? 'opacity-50 grayscale' : ''
                        }`}
                />
                {!product.isActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm">
                            INACTIVE
                        </span>
                    </div>
                )}
                {product.stock === 0 && product.isActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm">
                            OUT OF STOCK
                        </span>
                    </div>
                )}

                {/* Additional badges */}
                {product.emi && (
                    <div className="absolute bottom-3 left-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-md">
                        EMI: {product.emi}
                    </div>
                )}
            </div>

            {/* Product Info */}
            <div className="p-4 space-y-3">
                <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-gray-900 group-hover:text-[#F59B0F] transition-colors text-base line-clamp-2">
                            {product.name}
                        </h3>
                    </div>

                    <div className="flex items-center gap-2 text-sm mb-2">
                        <span className="text-yellow-500 font-semibold">★ {product.rating}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">{product.reviews} reviews</span>
                    </div>

                    <div className="flex items-center gap-1 mb-2 flex-wrap">
                        <span className="inline-block px-2 py-1 bg-gradient-to-r from-[#00BFA5] to-[#1DE9B6] text-white text-xs rounded-full font-semibold">
                            {typeof product.category === 'string' ? product.category : product.category?.name || 'Category'}
                        </span>
                        {visibleSwatches.length > 0 && (
                            <div className="flex items-center gap-1">
                                {visibleSwatches.map((color, index) => (
                                    <span
                                        key={`${color}-${index}`}
                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 shadow-sm"
                                        style={{ backgroundColor: resolveSwatchColor(color) || '#9CA3AF' }}
                                        title={`Color: ${color}`}
                                        aria-label={`Product color ${color}`}
                                    >
                                        <span className="sr-only">Color swatch</span>
                                    </span>
                                ))}
                                {extraSwatchCount > 0 && (
                                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 px-1.5 text-[10px] font-semibold text-gray-600">
                                        +{extraSwatchCount}
                                    </span>
                                )}
                            </div>
                        )}
                        {product.unit && (
                            <span className="inline-block px-2 py-1 bg-gradient-to-r from-[#FFA726] to-[#FFB84D] text-white text-xs rounded-full font-semibold">
                                {product.unit}
                            </span>
                        )}
                        {product.variantCount && product.variantCount > 1 && (
                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-semibold">
                                {product.variantCount} variants
                            </span>
                        )}
                    </div>

                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-2xl font-bold text-[#F59B0F]">
                            <small>LKR </small>{product.price.toFixed(2)}
                        </span>
                        {product.oldPrice && product.oldPrice > product.price && (
                            <span className="text-sm line-through text-gray-400">
                                <small>LKR </small>{product.oldPrice.toFixed(2)}
                            </span>
                        )}
                        {product.cost && profitMargin > 0 && (
                            <span className="text-xs text-green-600 font-semibold ml-2">
                                +{profitMargin}% margin
                            </span>
                        )}
                    </div>

                    {/* Cost and weight info */}
                    <div className="text-xs text-gray-500 mb-2">
                        {/* {product.cost && (
                            <span className="mr-3">Cost: ${product.cost.toFixed(2)}</span>
                        )} */}
                        {product.weight && (
                            <span>Weight: {product.weight} {product.unit === 'grams' ? 'g' : product.unit === 'kg' ? 'kg' : 'units'}</span>
                        )}
                    </div>
                </div>

                {/* Enhanced Stats Grid */}
                <div className="grid grid-cols-4 gap-2 py-2 border-t border-b border-gray-200">
                    <div className="text-center">
                        <p className="text-xs text-gray-500 font-semibold">Stock</p>
                        <p
                            className={`text-sm font-bold ${product.stock > 10
                                ? 'text-green-600'
                                : product.stock > 0
                                    ? 'text-orange-500'
                                    : 'text-red-500'
                                }`}
                        >
                            {product.stock}
                        </p>
                    </div>
                    <div className="text-center border-l border-r border-gray-200">
                        <p className="text-xs text-gray-500 font-semibold">Sold</p>
                        <p className="text-sm font-bold text-blue-600">{product.sold || 0}</p>
                    </div>
                    <div className="text-center border-r border-gray-200">
                        <p className="text-xs text-gray-500 font-semibold">Rating</p>
                        <p className="text-sm font-bold text-yellow-600">{product.rating}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 font-semibold">Reviews</p>
                        <p className="text-sm font-bold text-purple-600">{product.reviews}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-5 gap-2">
                    <button
                        type="button"
                        onClick={() => onView(product)}
                        className="flex items-center justify-center p-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm hover:shadow-md"
                        title="View Details"
                        aria-label="View product details"
                    >
                        <EyeIcon className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onEdit(product)}
                        className="flex items-center justify-center p-2.5 bg-gradient-to-r from-[#F59B0F] to-[#FFA726] text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm hover:shadow-md"
                        title="Edit Product"
                        aria-label="Edit product"
                    >
                        <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onManageVariants(product)}
                        className="flex items-center justify-center p-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors shadow-sm hover:shadow-md"
                        title="Manage variants"
                        aria-label="Manage product variants"
                    >
                        <FaBoxesStacked className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onToggleStatus(product.id, !product.isActive)}
                        className={`flex items-center justify-center p-2.5 rounded-lg transition-colors shadow-sm hover:shadow-md ${product.isActive
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : 'bg-gray-500 hover:bg-gray-600 text-white'
                            }`}
                        title={
                            product.isActive ? 'Active - Click to Deactivate' : 'Inactive - Click to Activate'
                        }
                        aria-label={product.isActive ? 'Deactivate product' : 'Activate product'}
                    >
                        <ChartBarIcon className="w-5 h-5" />
                    </button>
                    {canDelete && (
                        <ForceDeleteDialog
                            entityType="Product"
                            entityId={product.id}
                            entityIdentifier={`${product.name} (${product.code || product.id})`}
                            onSuccess={onRefresh}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProductsManager;
