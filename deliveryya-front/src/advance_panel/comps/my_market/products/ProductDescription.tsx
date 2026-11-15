import Select from 'react-select';
import { useMemo } from 'react';
import type { ProductFormData } from './types';
import RichTextEditor from './RichTextEditor';

interface Category {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
  markets?: { id: number } | null;
}

interface ProductDescriptionProps {
  formData: ProductFormData;
  onInputChange: (field: keyof ProductFormData, value: string | number) => void;
  categories: Category[];
  brands: Brand[];
  loading: boolean;
  fieldErrors: Record<string, string>;
}

const ProductDescription = ({ 
  formData, 
  onInputChange, 
  categories, 
  brands, 
  loading,
  fieldErrors 
}: ProductDescriptionProps) => {
  
  const categoryOptions = useMemo(() => 
    categories.map(cat => ({ 
      value: cat.id, 
      label: cat.name,
      data: cat 
    })),
    [categories]
  );

  const brandOptions = useMemo(() => 
    brands.map(brand => ({ 
      value: brand.id, 
      label: brand.name,
      data: brand 
    })),
    [brands]
  );

  const getCustomStyles = (hasError: boolean) => ({
    control: (base: any, state: any) => ({
      ...base,
      padding: '0.375rem',
      borderWidth: '2px',
      borderColor: hasError ? '#EF4444' : (state.isFocused ? '#F59B0F' : '#E5E7EB'),
      borderRadius: '0.5rem',
      boxShadow: hasError 
        ? (state.isFocused ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none')
        : (state.isFocused ? '0 0 0 2px rgba(245, 155, 15, 0.2)' : 'none'),
      '&:hover': {
        borderColor: hasError ? '#DC2626' : '#FCD34D',
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
      zIndex: 9999,
    }),
  });

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm transition-all duration-300 hover:shadow-md animate-slide-up border border-blue-100">
      <div className="p-6 border-b border-blue-100">
        <h2 className="text-xl font-semibold text-gray-800 transition-colors duration-300">
          Product Description
        </h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Row 1: Product Name & Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Product Name */}
          <div className="group" data-error-field="productName">
            <label className="block text-sm font-medium text-gray-700 mb-2 transition-colors duration-300">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.productName}
              onChange={(e) => onInputChange('productName', e.target.value)}
              placeholder="Enter product name"
              className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition-all duration-300 ${
                fieldErrors['productName'] 
                  ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-500/20' 
                  : 'border-gray-200 focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20'
              }`}
            />
            {fieldErrors['productName'] && (
              <p className="text-sm text-red-500 mt-1">{fieldErrors['productName']}</p>
            )}
          </div>

          {/* Product Code */}
          <div className="group" data-error-field="code">
            <label className="block text-sm font-medium text-gray-700 mb-2 transition-colors duration-300">
              Product Code (SKU) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code || ''}
              onChange={(e) => onInputChange('code', e.target.value)}
              placeholder="e.g., PROD-001, SKU123"
              className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition-all duration-300 ${
                fieldErrors['code'] 
                  ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-500/20' 
                  : 'border-gray-200 focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20'
              }`}
            />
            {fieldErrors['code'] && (
              <p className="text-sm text-red-500 mt-1">{fieldErrors['code']}</p>
            )}
            {!fieldErrors['code'] && (
              <p className="text-xs text-gray-500 mt-1">
                Unique identifier for inventory management
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Category, Brand */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Category */}
          <div className="group" data-error-field="categoryId">
            <label className="block text-sm font-medium text-gray-700 mb-2 transition-colors duration-300">
              Category <span className="text-red-500">*</span>
            </label>
            <Select
              value={categoryOptions.find(cat => cat.value === formData.categoryId) || null}
              onChange={(option) => {
                if (option) {
                  onInputChange('categoryId', option.value);
                  onInputChange('category', option.label);
                } else {
                  onInputChange('categoryId', 0);
                  onInputChange('category', '');
                }
              }}
              options={categoryOptions}
              placeholder={loading ? "Loading categories..." : "Select category"}
              isClearable
              styles={getCustomStyles(!!fieldErrors['categoryId'])}
              className="react-select-container"
              classNamePrefix="react-select"
              isDisabled={loading}
              isLoading={loading}
            />
            {fieldErrors['categoryId'] && (
              <p className="text-sm text-red-500 mt-1">{fieldErrors['categoryId']}</p>
            )}
          </div>

          {/* Brand */}
          <div className="group" data-error-field="brandId">
            <label className="block text-sm font-medium text-gray-700 mb-2 transition-colors duration-300">
              Brand <span className="text-red-500">*</span>
            </label>
            <Select
              value={brandOptions.find(brand => brand.value === formData.brandId) || null}
              onChange={(option) => {
                if (option) {
                  onInputChange('brandId', option.value);
                  onInputChange('brand', option.label);
                } else {
                  onInputChange('brandId', 0);
                  onInputChange('brand', '');
                }
              }}
              options={brandOptions}
              placeholder={loading ? "Loading brands..." : "Select brand"}
              isClearable
              styles={getCustomStyles(!!fieldErrors['brandId'])}
              className="react-select-container"
              classNamePrefix="react-select"
              isDisabled={loading}
              isLoading={loading}
            />
            {fieldErrors['brandId'] && (
              <p className="text-sm text-red-500 mt-1">{fieldErrors['brandId']}</p>
            )}
          </div>

        </div>

        {/* Description */}
        <div className="group" data-error-field="description">
          <label className="block text-sm font-medium text-gray-700 mb-2 transition-colors duration-300">
            Description (Rich Text Editor) <span className="text-red-500">*</span>
          </label>
          <div className={fieldErrors['description'] ? 'border-2 border-red-500 rounded-lg' : ''}>
            <RichTextEditor
              content={formData.description}
              onChange={(html) => onInputChange('description', html)}
            />
          </div>
          {fieldErrors['description'] && (
            <p className="text-sm text-red-500 mt-1">{fieldErrors['description']}</p>
          )}
          {!fieldErrors['description'] && (
            <p className="text-xs text-gray-500 mt-2">
              Content is automatically saved as HTML. You can add formatting, tables, lists, and more.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDescription;