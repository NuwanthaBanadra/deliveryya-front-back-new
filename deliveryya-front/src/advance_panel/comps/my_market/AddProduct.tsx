import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import ProductDescription from './products/ProductDescription';
import ProductImages from './products/ProductImages';
//import UploadProgressBar from './products/UploadProgressBar';
import type { ProductFormData, ProductVariant } from './products/types';
import axiosInstance, { baseURL } from '../../../util/AxiosUtil';
import Swal from 'sweetalert2';

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

interface BackendProductImage {
  id: number;
  imageUrl?: string;
  url?: string;
}

interface ExistingProductImage {
  id: number;
  rawUrl: string;
  previewUrl: string;
}

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
    category?: {
      id: number;
      name: string;
      markets?: {
        id: number;
      } | null;
    } | null;
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

interface AddProductProps {
  productToEdit?: any;
  initialSelection?: {
    categoryId: number;
    categoryName: string;
    brandId: number;
    brandName: string;
  };
  inModal?: boolean;
  onClose?: () => void;
  onSaved?: () => void;
}

const AddProduct = ({
  productToEdit: modalProductToEdit,
  initialSelection,
  inModal = false,
  onClose,
  onSaved,
}: AddProductProps) => {
  const outletContext = useOutletContext<{ marketId: number | null } | undefined>();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we're editing a product
  const productToEdit = modalProductToEdit || location.state?.product;
  const isEditMode = !!productToEdit;

  // Get marketId from outlet context, or from the product being edited
  const marketId = outletContext?.marketId ?? productToEdit?.marketId ?? null;
  const resolvedMarketId = marketId ?? 0;

  const handleClose = () => {
    if (inModal && onClose) {
      onClose();
      return;
    }
    navigate(-1);
  };

  const [formData, setFormData] = useState<ProductFormData>({
    productName: '',
    code: '',
    category: '',
    categoryId: 0,
    brand: '',
    brandId: 0,
    marketId: resolvedMarketId,
    description: '',
    price: 0,
    discount: 0,
    stockQuantity: 0,
    availabilityStatus: '',
    variants: [],
    images: [],
  });

  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editProductId, setEditProductId] = useState<number | null>(null);
  const [scrollToErrorField, setScrollToErrorField] = useState<string | null>(null);
  const [existingProductImages, setExistingProductImages] = useState<ExistingProductImage[]>([]);
  const [selectedDefaultImageUrl, setSelectedDefaultImageUrl] = useState<string | null>(null);

  // Add these new states for separate update modes
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);

  // Upload progress states
  const [uploadProgress, setUploadProgress] = useState<{
    isUploading: boolean;
    currentFile: number;
    totalFiles: number;
    progress: number;
    fileName: string;
    status: 'queued' | 'uploading' | 'completed' | 'error';
    errorMessage?: string;
  }>({
    isUploading: false,
    currentFile: 0,
    totalFiles: 0,
    progress: 0,
    fileName: '',
    status: 'uploading',
  });

  // State for dynamic data
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState({
    categories: true,
    brands: true
  });

  const normalizeImageUrl = (url?: string | null) => {
    if (!url) return '';
    const cleanedUrl = url.replace(/\\/g, '/').trim();
    if (cleanedUrl.startsWith('http://') || cleanedUrl.startsWith('https://')) return cleanedUrl;
    if (cleanedUrl.startsWith('/')) return `${baseURL}/uploads${cleanedUrl}`;
    return `${baseURL}/uploads/${cleanedUrl}`;
  };

  const getRawImageUrl = (image?: BackendProductImage | null) => {
    const value = image?.imageUrl || image?.url || '';
    return value.replace(/\\/g, '/').trim();
  };

  const normalizeBackendErrorField = (field: string) => {
    const normalizedField = field.trim();

    switch (normalizedField) {
      case 'name':
      case 'productName':
        return 'productName';
      case 'code':
        return 'code';
      case 'category':
        return 'categoryId';
      case 'brand':
        return 'brandId';
      case 'description':
        return 'description';
      default:
        return normalizedField;
    }
  };

  // Load categories from backend
  const loadCategories = async (scopeMarketId: number) => {
    try {
      setLoading(prev => ({ ...prev, categories: true }));
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
      } else {
        console.warn('Unexpected response structure for categories:', response.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(prev => ({ ...prev, categories: false }));
    }
  };

  // Load brands from backend
  const loadBrands = async (scopeMarketId: number) => {
    try {
      setLoading(prev => ({ ...prev, brands: true }));
      const response = await axiosInstance.post('/products/get-brands', {
        pageNumber: 0,
        countPerPage: 100,
        marketId: scopeMarketId,
        isActive: true,
      });

      if (response.data.message === 'Success' && response.data.object?.items) {
        setBrands(response.data.object.items);
      } else {
        console.warn('Unexpected response structure for brands:', response.data);
      }
    } catch (error) {
      console.error('Failed to load brands:', error);
    } finally {
      setLoading(prev => ({ ...prev, brands: false }));
    }
  };

  useEffect(() => {
    if (!marketId) {
      setCategories([]);
      setBrands([]);
      setLoading((prev) => ({ ...prev, categories: false, brands: false }));
      return;
    }

    setFormData((prev) => ({ ...prev, marketId }));
    loadCategories(marketId);
    loadBrands(marketId);
  }, [marketId]);

  useEffect(() => {
    if (isEditMode || !initialSelection) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      categoryId: initialSelection.categoryId,
      category: initialSelection.categoryName,
      brandId: initialSelection.brandId,
      brand: initialSelection.brandName,
    }));
  }, [initialSelection, isEditMode]);

  const loadProductStocks = async (productId: number): Promise<BackendStock[]> => {
    const basePayload = {
      pageNumber: 0,
      countPerPage: 1000,
      productId,
    };

    const responses = await Promise.allSettled(
      [true, false].map((isActive) =>
        axiosInstance.post('/stocks/get-stocks', {
          ...basePayload,
          isActive,
        })
      )
    );

    const stocksById = new Map<number, BackendStock>();

    responses.forEach((result) => {
      if (result.status !== 'fulfilled' || result.value.data.message !== 'Success') {
        return;
      }

      const items = (result.value.data.exData?.items || result.value.data.object?.items || []) as BackendStock[];
      items.forEach((stock) => {
        if (stock.id) {
          stocksById.set(stock.id, stock);
        }
      });
    });

    if (stocksById.size === 0) {
      const fallbackResponse = await axiosInstance.post('/stocks/get-stocks', basePayload);
      if (fallbackResponse.data.message === 'Success') {
        const fallbackItems = (fallbackResponse.data.exData?.items || fallbackResponse.data.object?.items || []) as BackendStock[];
        fallbackItems.forEach((stock) => {
          if (stock.id) {
            stocksById.set(stock.id, stock);
          }
        });
      }
    }

    return Array.from(stocksById.values());
  };

  const loadProductDetails = async (productId: number) => {
    try {
      const [productResponse, stocksData] = await Promise.all([
        axiosInstance.get(`/products/get-products-by-id?id=${productId}`),
        loadProductStocks(productId),
      ]);

      const backendProduct = productResponse.data?.object as (
        Partial<BackendStock['products']> & { desc?: string }
      ) | null;
      const relatedStocks = stocksData.filter((stock) => stock.products.id === productId);

      if (relatedStocks.length > 0 || backendProduct) {
        const primaryStock = relatedStocks[0];
        const productInfo = primaryStock?.products || backendProduct;
        const productImages = [
          ...(productInfo?.productImages || []),
          ...(backendProduct?.productImages || []),
        ].reduce<ExistingProductImage[]>((acc, image) => {
          const rawUrl = getRawImageUrl(image);
          const previewUrl = normalizeImageUrl(rawUrl);

          if (!rawUrl || !previewUrl) {
            return acc;
          }

          if (acc.some((item) => item.id === image.id || item.previewUrl === previewUrl)) {
            return acc;
          }

          acc.push({
            id: image.id,
            rawUrl,
            previewUrl,
          });
          return acc;
        }, []);

        const resolvedBrand = productInfo?.brand || backendProduct?.brand || productToEdit?.brand;
        const resolvedCategory = productInfo?.category || backendProduct?.category || productToEdit?.category;

        const totalQty = relatedStocks.reduce((sum, stock) => sum + (stock.qty || 0), 0);

        const variants: ProductVariant[] = relatedStocks.map((stock) => {
            return {
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
            };
          });

        const productDescription = productToEdit?.description?.trim() || (relatedStocks
            .map(s => s.desc)
            .filter(Boolean)
            .find(desc => desc && desc.length > 20) ||
            relatedStocks[0]?.desc ||
            backendProduct?.desc ||
            '');

        const calculatedDiscount = primaryStock?.showingPrice && primaryStock.showingPrice > primaryStock.sellingPrice
            ? Math.round(((primaryStock.showingPrice - primaryStock.sellingPrice) / primaryStock.showingPrice) * 100)
            : 0;

        setEditProductId((primaryStock?.products?.id || productInfo?.id || productId) as number);
        setExistingProductImages(productImages);
        setSelectedDefaultImageUrl(productImages[0]?.previewUrl || null);
        setFormData(prev => ({
            ...prev,
            productName: productInfo?.name || productToEdit?.name || '',
            code: productInfo?.code || productId.toString(),
            description: productDescription,
            category: resolvedCategory?.name || productToEdit?.category?.name || productToEdit?.category || '',
            categoryId: resolvedCategory?.id || productToEdit?.category?.id || 0,
            brand: resolvedBrand?.name || productToEdit?.brand?.name || '',
            brandId: resolvedBrand?.id || productToEdit?.brand?.id || 0,
            price: primaryStock?.sellingPrice || 0,
            discount: calculatedDiscount,
            stockQuantity: totalQty,
            variants: variants.length > 0 ? variants : productToEdit ? [{
              id: 'temp_' + Date.now().toString(),
              color: productToEdit.color || '#000000',
              colorName: productToEdit.color || '',
              size: '',
              showingPrice: productToEdit.oldPrice?.toString() || '',
              sellingPrice: productToEdit.price?.toString() || '0',
              cost: productToEdit.cost?.toString() || '0',
              weight: productToEdit.weight?.toString() || '',
              unit: productToEdit.unit || '',
              quantity: productToEdit.stock?.toString() || '0',
              emi: productToEdit.emi || undefined,
              description: productToEdit.description || '',
            }] : [],
            images: (productImages.length > 0
              ? productImages.map((image) => image.previewUrl)
              : productToEdit?.image
                ? [productToEdit.image]
                : []) as string[],
          }));
        }
    } catch (error) {
      console.error('Failed to load product details:', error);
    }
  };

  // Helper to find category by name and set ID
  const findAndSetCategory = (categoryName: string) => {
    if (categories.length > 0) {
      const matchedCategory = categories.find((cat) => cat.name === categoryName);
      if (matchedCategory) {
        setFormData(prev => ({
          ...prev,
          category: categoryName,
          categoryId: matchedCategory.id
        }));
        return true;
      }
    }
    return false;
  };

  // Helper to find brand by name and set ID
  const findAndSetBrand = (brandName: string) => {
    if (brands.length > 0) {
      const matchedBrand = brands.find((brand) => brand.name === brandName);
      if (matchedBrand) {
        setFormData(prev => ({
          ...prev,
          brand: brandName,
          brandId: matchedBrand.id
        }));
        return true;
      }
    }
    return false;
  };

  // Auto-hide progress bar after images are loaded
  useEffect(() => {
    if (uploadProgress.status === 'queued' && formData.images.length > 0) {
      // Hide the progress bar after a brief delay to show the image preview
      const timer = setTimeout(() => {
        setUploadProgress(prev => ({
          ...prev,
          isUploading: false,
        }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [formData.images, uploadProgress.status]);

  useEffect(() => {
    if (!scrollToErrorField) {
      return;
    }

    const target = document.querySelector(`[data-error-field="${scrollToErrorField}"]`) as HTMLElement | null;

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setScrollToErrorField(null);
  }, [scrollToErrorField]);

  // Load product data when editing
  useEffect(() => {
    if (isEditMode && productToEdit?.id) {
      loadProductDetails(productToEdit.id);
    }
  }, [isEditMode, productToEdit]);

  // Ensure category/brand IDs are set after options load
  useEffect(() => {
    if (!isEditMode) return;

    let updated = false;
    const updates: Partial<ProductFormData> = {};

    // Match category by ID first, then by name
    if (categories.length > 0) {
      if (formData.categoryId > 0) {
        const matchedCategory = categories.find((cat) => cat.id === formData.categoryId);
        if (matchedCategory && formData.category !== matchedCategory.name) {
          updates.category = matchedCategory.name;
          updated = true;
        }
      } else if (formData.category) {
        const matchedCategory = categories.find((cat) => cat.name === formData.category);
        if (matchedCategory && formData.categoryId !== matchedCategory.id) {
          updates.categoryId = matchedCategory.id;
          updated = true;
        }
      }
    }

    // Match brand by ID first, then by name
    if (brands.length > 0) {
      if (formData.brandId > 0) {
        const matchedBrand = brands.find((brand) => brand.id === formData.brandId);
        if (matchedBrand && formData.brand !== matchedBrand.name) {
          updates.brand = matchedBrand.name;
          updated = true;
        }
      } else if (formData.brand) {
        const matchedBrand = brands.find((brand) => brand.name === formData.brand);
        if (matchedBrand && formData.brandId !== matchedBrand.id) {
          updates.brandId = matchedBrand.id;
          updated = true;
        }
      }
    }

    if (updated) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  }, [isEditMode, categories, brands]);

  const handleInputChange = (field: keyof ProductFormData, value: string | number | File[] | ProductVariant[] | any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    if (field === 'images' && Array.isArray(value)) {
      const remainingPreviewUrls = new Set(
        value.filter((item): item is string => typeof item === 'string')
      );

      setExistingProductImages((prev) =>
        prev.filter((image) => remainingPreviewUrls.has(image.previewUrl))
      );

      setSelectedDefaultImageUrl((prev) =>
        prev && remainingPreviewUrls.has(prev)
          ? prev
          : Array.from(remainingPreviewUrls)[0] || null
      );
    }

    // Clear the specific field error when user types
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field as string];
      return newErrors;
    });
  };

  const handleFilesSelected = (fileCount: number) => {
    // Show queued state when files are selected
    setUploadProgress(prev => ({
      ...prev,
      isUploading: true,
      totalFiles: fileCount,
      status: 'queued',
      fileName: `${fileCount} file${fileCount !== 1 ? 's' : ''} selected and ready to upload`,
      progress: 0,
      currentFile: 0,
    }));
  };

  const validateProductData = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!formData.productName.trim()) errors['productName'] = 'Product name is required';
    if (!formData.code.trim()) errors['code'] = 'Product code is required';
    if (!formData.categoryId) errors['categoryId'] = 'Category is required';
    if (!formData.brandId) errors['brandId'] = 'Brand is required';
    if (!formData.description.trim()) errors['description'] = 'Description is required';

    return errors;
  };

  const validateProductDetails = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!formData.productName.trim()) errors['productName'] = 'Product name is required';
    if (!formData.code.trim()) errors['code'] = 'Product code is required';
    if (!formData.categoryId) errors['categoryId'] = 'Category is required';
    if (!formData.brandId) errors['brandId'] = 'Brand is required';
    if (!formData.description.trim()) errors['description'] = 'Description is required';

    return errors;
  };

  // Upload product images to local storage endpoint (/storage/upload)
  const uploadProductImages = async (images: File[]): Promise<string[]> => {
    if (!images || images.length === 0) return [];

    try {
      setUploadProgress(prev => ({
        ...prev,
        isUploading: true,
        totalFiles: images.length,
        currentFile: 0,
        fileName: '',
        progress: 0,
        status: 'uploading',
      }));

      const formData = new FormData();
      images.forEach((file) => formData.append('files', file));

      const response = await axiosInstance.post('/storage/upload?path=products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setUploadProgress(prev => ({
              ...prev,
              progress: percent,
              // approximate current file by ratio
              currentFile: Math.min(images.length, Math.max(1, Math.round((percent / 100) * images.length))),
            }));
          }
        },
      });

      if (response.data && (response.data.message === 'Success' || response.data.message === 'success')) {
        const uploadedPaths: string[] = Array.isArray(response.data.object) ? response.data.object : [];
        setUploadProgress(prev => ({ ...prev, progress: 100, status: 'completed', isUploading: false }));
        return uploadedPaths;
      } else {
        const msg = response.data?.desc || 'Upload failed';
        setUploadProgress(prev => ({ ...prev, status: 'error', errorMessage: msg, isUploading: false }));
        throw new Error(msg);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const errMsg = error?.response?.data?.desc || error?.message || 'Upload failed';
      setUploadProgress(prev => ({ ...prev, status: 'error', errorMessage: errMsg, isUploading: false }));
      throw error;
    }
  };

  const retryRequest = async (fn: () => Promise<any>, retries = 2, delay = 1000): Promise<any> => {
    try {
      return await fn();
    } catch (error: any) {
      if (retries > 0 && (error.response?.status >= 500 || !error.response)) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryRequest(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  };

  const handleSaveDraft = async (): Promise<void> => {
    setIsSavingDraft(true);
    try {
      await Swal.fire({
        icon: 'success',
        title: 'Draft Saved!',
        text: 'Your product has been saved as a draft.',
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
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleUpdateProductDetails = async () => {
    if (!isEditMode || !editProductId) {
      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Product ID is missing. Cannot update product details.',
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3000,
      });
      return;
    }

    setFieldErrors({});
    const errors = validateProductDetails();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsUpdatingDetails(true);

    try {
      // First, upload all images to Cloudinary
      let imageUrls: string[] = [];
      if (formData.images && formData.images.length > 0) {
        const files = formData.images.filter(img => img instanceof File) as File[];
        if (files.length > 0) {
          imageUrls = await uploadProductImages(files);
        }
        // Add any existing URLs (from previous uploads)
        const existingUrls = existingProductImages
          .filter((image) =>
            formData.images.some((item) => typeof item === 'string' && item === image.previewUrl)
          )
          .map((image) => image.rawUrl);
        imageUrls = [...imageUrls, ...existingUrls];
      }

      // Find selected category and brand
      const selectedCategory = categories.find(c => c.id === formData.categoryId);
      const selectedBrand = brands.find(b => b.id === formData.brandId);
      if (!selectedCategory || !selectedBrand) {
        throw new Error('Please select valid category and brand');
      }

      const updatePayload = {
        id: editProductId,
        name: formData.productName.trim(),
        code: formData.code.trim(),
        desc: formData.description.trim(),
        marketId: resolvedMarketId,
        category: {
          id: selectedCategory.id,
        },
        brand: {
          id: selectedBrand.id,
        },
        productImages: imageUrls.map((url, index) => ({
          id: index === 0 ? null : undefined,
          url,
          products: {
            id: editProductId,
          },
        })),
      };

      const response = await retryRequest(() =>
        axiosInstance.post('/products/update-product', updatePayload)
      );


      if (response.data.message === "Success" || response.data.message === "success") {
        if (selectedDefaultImageUrl) {
          try {
            const refreshed = await axiosInstance.get(`/products/get-products-by-id?id=${editProductId}`);
            const refreshedImages = ((refreshed.data?.object?.productImages || []) as BackendProductImage[])
              .map((image) => ({
                id: image.id,
                previewUrl: normalizeImageUrl(getRawImageUrl(image)),
              }))
              .filter((image) => image.previewUrl);

            const matchedImage = refreshedImages.find((image) => image.previewUrl === selectedDefaultImageUrl);
            if (matchedImage?.id) {
              await axiosInstance.put('/products/set-default-image', null, {
                params: { productImageId: matchedImage.id },
              });
            }
          } catch (defaultImageError) {
            console.error('Failed to update default image:', defaultImageError);
          }
        }

        await Swal.fire({
          icon: 'success',
          title: 'Product Details Updated!',
          text: 'Your product details have been updated successfully.',
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

        // Clear errors related to product details
        const newErrors = { ...fieldErrors };
        Object.keys(newErrors).forEach(key => {
          if (['productName', 'code', 'categoryId', 'brandId', 'description'].includes(key)) {
            delete newErrors[key];
          }
        });
        setFieldErrors(newErrors);

        if (inModal) {
          onSaved?.();
          onClose?.();
        } else {
          await loadProductDetails(editProductId);
        }
      } else {
        throw new Error(response.data.desc || 'Failed to update product details');
      }
    } catch (error: any) {
      console.error('Failed to update product details:', error);

      let errorMessage = 'Failed to update product details. Please try again.';

      if (error.response) {
        const { status, data } = error.response;

        switch (status) {
          case 400:
            errorMessage = data.desc || 'Validation failed for product details';
            break;
          case 401:
            errorMessage = 'Authentication required. Please login again.';
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('userId');
            localStorage.removeItem('userNic');
            navigate('/sign-in', { replace: true });
            break;
          case 403:
            errorMessage = 'You do not have permission to update product details.';
            break;
          case 404:
            errorMessage = 'Product endpoint not found.';
            break;
          default:
            errorMessage = data.desc || `Error ${status}: ${data.message || 'Unknown error'}`;
        }
      }

      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
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
      setIsUpdatingDetails(false);
    }
  };

  const handlePublish = async () => {
    setFieldErrors({});

    // For edit mode, we'll now use separate update functions
    if (isEditMode) {
      const detailsErrors = validateProductDetails();
      const allErrors = { ...detailsErrors };

      if (Object.keys(allErrors).length > 0) {
        setFieldErrors(allErrors);
        await Swal.fire({
          icon: 'warning',
          title: 'Validation Required',
          text: 'Please fix all errors before publishing the complete product.',
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }

      // For edit mode, we can still keep the original publish logic or redirect to use separate buttons
      await Swal.fire({
        icon: 'info',
        title: 'Use Update Buttons',
        text: 'For editing, please use the "Update Product Details" button. Variants can be updated from Products Manager.',
        showConfirmButton: false,
        timer: 3000,
      });
      return;
    }

      // For new product creation
    const errors = validateProductData();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsPublishing(true);

    try {
      // First, upload all images to Cloudinary
      let imageUrls: string[] = [];
      if (formData.images && formData.images.length > 0) {
        const files = formData.images.filter(img => img instanceof File) as File[];
        if (files.length > 0) {
          imageUrls = await uploadProductImages(files);
        }
        // Add any existing URLs (from previous uploads)
        const existingUrls = formData.images.filter(img => typeof img === 'string') as string[];
        imageUrls = [...imageUrls, ...existingUrls];
      }

      // Find selected category and brand
      const selectedCategory = categories.find(c => c.id === formData.categoryId);
      const selectedBrand = brands.find(b => b.id === formData.brandId);
      if (!selectedCategory || !selectedBrand) {
        throw new Error('Please select valid category and brand');
      }

      // For new product creation, ensure you also have authentication
      const payload = {
        products: {
          name: formData.productName.trim(),
          code: formData.code.trim(),
          desc: formData.description.trim(),
          marketId: resolvedMarketId,
          category: {
            id: selectedCategory.id,
          },
          brand: {
            id: selectedBrand.id
          }
        },
        stocks: formData.variants.map(variant => ({
          desc: variant.description || formData.description.trim() || 'Product variant',
          cost: parseFloat(variant.cost?.toString() || "0"),
          showingPrice: variant.showingPrice ? parseFloat(variant.showingPrice.toString()) : null,
          sellingPrice: parseFloat(variant.sellingPrice?.toString() || "0"),
          qty: parseFloat(variant.quantity?.toString() || "0"),
          unit: {
            id: variant.unitId || 1 // Use variant.unitId if available, otherwise default to 1
          },
          emi: variant.emi || '',
          color: variant.color || 'Default',
          sizes: variant.sizeId
            ? {
              id: variant.sizeId
            }
            : variant.size
              ? {
                name: variant.size
              }
              : null,
          wpu: parseFloat(variant.weight?.toString() || '0') || 0,
          isActive: variant.isActive ?? true,
        })),
        imageUrls: imageUrls
      };

      // Check if we need to add authentication for product creation too
      const token = localStorage.getItem('jwtToken');
      let axiosToUse = axiosInstance;

      if (token) {
        // Create authenticated instance
        axiosToUse = axios.create({
          baseURL: axiosInstance.defaults.baseURL,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }

      // Make API call with retry logic
      const response = await retryRequest(() =>
        axiosToUse.post('/products/set-product', payload)
      );

      // Check response structure based on API documentation
      if (response.data.message === "Success" || response.data.message === "success") {
        await Swal.fire({
          icon: 'success',
          title: 'Product Published Successfully!',
          text: response.data.desc || 'Your product is now live on the platform.',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: '#FFF4EE',
          color: '#1A1F3A',
          iconColor: '#00BFA5',
          customClass: {
            popup: 'rounded-xl shadow-2xl',
            timerProgressBar: 'bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A]'
          }
        });

        // Reset form after successful submission
        setFormData({
          productName: '',
          code: '',
          category: '',
          categoryId: 0,
          brand: '',
          brandId: 0,
          marketId: resolvedMarketId,
          description: '',
          price: 0,
          discount: 0,
          stockQuantity: 0,
          availabilityStatus: '',
          variants: [],
          images: [],
        });

        setFieldErrors({});
        if (inModal) {
          onSaved?.();
          onClose?.();
        } else {
          navigate(-1);
        }
      } else {
        throw new Error(response.data.desc || 'Unknown error occurred');
      }

    } catch (error: any) {
      console.error('Failed to publish product:', error);

      let errorMessage = 'Failed to publish product. Please try again.';
      let detailedErrors: string[] = [];

      if (error.response) {
        const { status, data } = error.response;

        switch (status) {
          case 400:
            if (data.exData) {
              if (typeof data.exData === 'object') {
                const errorFields = Object.keys(data.exData);
                if (errorFields.length > 0) {
                  errorMessage = 'Validation errors from server:';
                  detailedErrors = errorFields.map(field => `${field}: ${data.exData[field]}`);
                } else {
                  errorMessage = data.desc || 'Validation failed';
                }
              } else if (typeof data.exData === 'string') {
                errorMessage = data.exData;
              }
            } else {
              errorMessage = data.desc || 'Bad request';
            }
            break;

          case 401:
            errorMessage = 'Authentication required. Please login again.';
            // Redirect to login (similar to SignUp.tsx pattern)
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('userId');
            localStorage.removeItem('userNic');
            navigate('/sign-in', { replace: true });
            break;

          case 403:
            errorMessage = 'You do not have permission to add products. Please ensure you are logged in and have the correct permissions.';
            // Check if token exists
            const token = localStorage.getItem('jwtToken');
            if (!token) {
              errorMessage = 'Authentication required. Please login again.';
              navigate('/sign-in', { replace: true });
            }
            break;

          case 404:
            errorMessage = 'Product endpoint not found. Please check configuration.';
            break;

          case 409:
            errorMessage = data.desc || 'Conflict occurred';
            // Extract detailed field errors from exData
            if (data.exData && typeof data.exData === 'object') {
              const conflictErrors = Object.entries(data.exData)
                .map(([field, message]) => `${field}: ${message}`)
                .filter(Boolean);
              
              if (conflictErrors.length > 0) {
                detailedErrors = conflictErrors;
                errorMessage = 'This product already exists. Please check:';
              }
            }
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

      // Show field-level validation from the backend when available
      if (detailedErrors.length > 0) {
        const fieldErrorsFromBackend: Record<string, string> = {};
        let firstErrorField: string | null = null;

        detailedErrors.forEach((error) => {
          const fieldMatch = error.match(/^([^:]+):/);
          if (fieldMatch) {
            const fieldName = normalizeBackendErrorField(fieldMatch[1]);
            const message = error.slice(fieldMatch[0].length).trim();
            fieldErrorsFromBackend[fieldName] = message || error;

            if (!firstErrorField) {
              firstErrorField = fieldName;
            }
          }
        });

        setFieldErrors(fieldErrorsFromBackend);
        setScrollToErrorField(firstErrorField);
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Product Publish Failed',
          text: errorMessage,
          showConfirmButton: false,
          timer: 5000, // Increased timer for better readability
          background: '#FEF2F2',
          color: '#991B1B',
          iconColor: '#DC2626'
        });
      }
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        {/* <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2 transition-colors duration-300">
          {isEditMode ? 'Edit Product' : 'Add Product'}
        </h1> */}
        <p className="text-gray-600 transition-colors duration-300">
          {isEditMode ? 'Update product details and information' : 'Create a new product listing with detailed information'}
        </p>
      </div>

      {/* Form Sections */}
      <div className="space-y-6">
        <div>
          <ProductDescription
            formData={formData}
            onInputChange={handleInputChange}
            categories={categories}
            brands={brands}
            loading={loading.categories || loading.brands}
            fieldErrors={fieldErrors}
          />
          <ProductImages
            formData={formData}
            onInputChange={handleInputChange}
            editMode={isEditMode}
            uploadProgress={uploadProgress}
            onFilesSelected={handleFilesSelected}
            defaultImageUrl={selectedDefaultImageUrl}
            onDefaultImageSelect={setSelectedDefaultImageUrl}
            allowDefaultSelection={isEditMode}
          />
          {/* Update Product Details Button - Only show in edit mode */}
          {isEditMode && (
            <div className="mt-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md border border-blue-100">
              <p className="text-sm text-gray-600">Update product name, code, category, brand, description, and images here. Manage stock rows in Variant Manager.</p>
            </div>
          )}
        </div>


        {/* Action Buttons */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md border border-purple-100">
          <div className="flex flex-row flex-wrap items-center justify-end gap-3">
            {isEditMode ? (
              // Edit Mode Buttons
              <>
                <button
                  onClick={handleClose}
                  disabled={isSavingDraft || isPublishing || isUpdatingDetails}
                  className="shrink-0 px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft || isPublishing || isUpdatingDetails}
                  className="shrink-0 px-6 py-3 rounded-lg border-2 border-amber-100 text-amber-400 font-medium hover:bg-purple-50 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSavingDraft ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : 'Save as Draft'}
                </button>
                <button
                  onClick={handleUpdateProductDetails}
                  disabled={isUpdatingDetails || isPublishing || isSavingDraft}
                  className="shrink-0 px-6 py-3 rounded-lg bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isUpdatingDetails ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </span>
                  ) : 'Update Product Details'}
                </button>
              </>
            ) : (
              // Add Product Mode Buttons
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft || isPublishing}
                  className="px-6 py-3 rounded-lg border-2 border-amber-100 text-amber-400 font-medium hover:bg-purple-50 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSavingDraft ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : 'Save as Draft'}
                </button>
                <button
                  onClick={handlePublish}
                  disabled={isPublishing || isSavingDraft || loading.categories || loading.brands}
                  className="px-6 py-3 rounded-lg bg-linear-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-600 text-white font-medium transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isPublishing ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Publishing...
                    </span>
                  ) : 'Publish Product'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProduct;
