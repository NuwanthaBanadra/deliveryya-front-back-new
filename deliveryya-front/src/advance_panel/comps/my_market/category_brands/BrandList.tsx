import { ChevronDownIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';
import type { Brand, Product } from './types';
import ForceDeleteDialog from '../../../../page_comps/ForceDeleteDialog';

interface BrandListProps {
  brand: Brand;
  isExpanded: boolean;
  isLoading: boolean;
  onExpand: (brandId: number) => void;
  onStatusChange: (brandId: number, isActive: boolean) => void;
  onAddProduct: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onView: (product: Product) => void;
  onManageVariants: (product: Product) => void;
  onViewFeedback: (product: Product) => void;
  onToggleStatus: (productId: number, isActive: boolean) => void;
  onDeleteBrand: () => void;
  canDeleteProducts: boolean;
  canDeleteBrand: boolean;
  onRefresh: () => void;
}

function BrandList({
  brand,
  isExpanded,
  isLoading,
  onExpand,
  onStatusChange,
  onAddProduct,
  onEdit,
  onDelete,
  onView,
  onManageVariants,
  onViewFeedback,
  onToggleStatus,
  onDeleteBrand,
  canDeleteProducts,
  canDeleteBrand,
  onRefresh,
}: BrandListProps) {
  const navigate = useNavigate();
  const isActive = brand.status === 'active';
  const visibleProducts = brand.products.slice(0, 8);
  const hasMoreProducts = (brand.productsCount ?? brand.products.length) > visibleProducts.length;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
      <div className="p-4 flex items-center justify-between hover:bg-gray-100 transition-colors">
        <button
          type="button"
          onClick={() => onExpand(brand.id)}
          aria-expanded={isExpanded}
          className="flex-1 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <ChevronDownIcon
              className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
            <div>
              <p className="font-semibold text-gray-900">{brand.name}</p>
              <p className="text-xs text-gray-500">{brand.productsCount} products</p>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2 ml-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(brand.id, !isActive);
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isActive ? 'bg-green-500' : 'bg-gray-300'
            }`}
            title={isActive ? 'Active - Click to deactivate' : 'Inactive - Click to activate'}
            aria-label={isActive ? 'Deactivate brand' : 'Activate brand'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
              isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
          {canDeleteBrand && (
            <ForceDeleteDialog
              entityType="Brand"
              entityId={brand.id}
              entityIdentifier={brand.name}
              onSuccess={onRefresh}
            />
          )}
        </div>
      </div>

      {isExpanded && isLoading && (
        <div className="border-t border-gray-200 bg-white p-4 text-center">
          <p className="text-sm text-gray-500">Loading products...</p>
        </div>
      )}

      {isExpanded && !isLoading && brand.products.length > 0 && (
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={onEdit}
                onDelete={onDelete}
                onView={onView}
                onManageVariants={onManageVariants}
                onViewFeedback={onViewFeedback}
                onToggleStatus={onToggleStatus}
                canDelete={canDeleteProducts}
                onRefresh={onRefresh}
              />
            ))}
          </div>

          {hasMoreProducts && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  navigate(`/all-products?brand=${encodeURIComponent(brand.name)}`)
                }
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-[#F59B0F]/30 text-[#F59B0F] hover:bg-[#F59B0F]/10 transition-all"
              >
                View all products
              </button>
            </div>
          )}
        </div>
      )}

      {isExpanded && !isLoading && brand.products.length === 0 && (
        <div className="border-t border-gray-200 bg-white p-4 text-center">
          <p className="text-sm text-gray-500">No products found for this brand.</p>
          <button
            type="button"
            onClick={onAddProduct}
            className="mt-3 rounded-lg bg-linear-to-r from-[#F59B0F] to-[#FFA726] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            Add Product
          </button>
        </div>
      )}
    </div>
  );
}

export default BrandList;
