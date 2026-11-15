import {
  ChartBarIcon, ChatBubbleLeftRightIcon, EyeIcon, PencilIcon, TrashIcon
} from '@heroicons/react/24/outline';
import { FaBoxesStacked } from 'react-icons/fa6';
import type { Product } from './types';
import ForceDeleteDialog from '../../../../page_comps/ForceDeleteDialog';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onView: (product: Product) => void;
  onManageVariants: (product: Product) => void;
  onViewFeedback: (product: Product) => void;
  onToggleStatus: (productId: number, isActive: boolean) => void;
  canDelete: boolean;
  onRefresh: () => void;
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

function ProductCard({
  product,
  onEdit,
  onDelete,
  onView,
  onManageVariants,
  onViewFeedback,
  onToggleStatus,
  canDelete,
  onRefresh,
}: ProductCardProps) {
  const swatchColor = resolveSwatchColor(product.color);
  const imageSrc = product.image
    ?? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80';
  const discount = product.oldPrice && product.oldPrice > product.price
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  // Calculate profit margin
  const profitMargin = product.cost 
    ? Math.round(((product.price - product.cost) / product.price) * 100)
    : 0;

  const stockCount = product.stock ?? 0;
  const rating = product.rating ?? 0;
  const reviews = product.reviews ?? 0;
  const sold = product.sold ?? 0;

  return (
    <div className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl overflow-hidden transition-all duration-300 border border-gray-200">
      {/* Discount Badge */}
      {discount > 0 && product.isActive && (
        <div className="absolute top-3 right-3 z-10 bg-linear-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
          {discount}% OFF
        </div>
      )}

      {/* Image Container */}
      <div className="relative overflow-hidden bg-gray-100 h-56">
        <img
          src={imageSrc}
          alt={product.name}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${!product.isActive || stockCount === 0 ? 'opacity-50 grayscale' : ''
            }`}
        />
        {!product.isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm">
              INACTIVE
            </span>
          </div>
        )}
        {stockCount === 0 && product.isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm">
              OUT OF STOCK
            </span>
          </div>
        )}
        
        {/* Additional badges */}
        {product.emi && (
          <div className="absolute bottom-3 left-3 bg-linear-to-r from-blue-500 to-indigo-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-md">
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
            <span className="text-yellow-500 font-semibold">★ {rating}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">{reviews} reviews</span>
          </div>

          <div className="flex items-center gap-1 mb-2 flex-wrap">
            <span className="inline-block px-2 py-1 bg-linear-to-r from-[#00BFA5] to-[#1DE9B6] text-white text-xs rounded-full font-semibold">
              {typeof product.category === 'string' ? product.category : product.category?.name || 'Category'}
            </span>
            {product.color && (
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 shadow-sm"
                style={{ backgroundColor: swatchColor || '#9CA3AF' }}
                title={`Color: ${product.color}`}
                aria-label={`Product color ${product.color}`}
              >
                <span className="sr-only">{product.color}</span>
              </span>
            )}
            {product.unit && (
              <span className="inline-block px-2 py-1 bg-linear-to-r from-[#FFA726] to-[#FFB84D] text-white text-xs rounded-full font-semibold">
                {product.unit}
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold text-[#F59B0F]">
              <small>LKR </small>{product.price.toFixed(2)}
            </span>
            {product.oldPrice && product.oldPrice > product.price && (
              <span className="text-sm line-through text-gray-400">
                LKR {product.oldPrice.toFixed(2)}
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
              className={`text-sm font-bold ${stockCount > 10
                ? 'text-green-600'
                : stockCount > 0
                  ? 'text-orange-500'
                  : 'text-red-500'
                }`}
            >
              {stockCount}
            </p>
          </div>
          <div className="text-center border-l border-r border-gray-200">
            <p className="text-xs text-gray-500 font-semibold">Sold</p>
            <p className="text-sm font-bold text-blue-600">{sold}</p>
          </div>
          <div className="text-center border-r border-gray-200">
            <p className="text-xs text-gray-500 font-semibold">Rating</p>
            <p className="text-sm font-bold text-yellow-600">{rating}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 font-semibold">Reviews</p>
            <p className="text-sm font-bold text-purple-600">{reviews}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-6 gap-2">
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
            className="flex items-center justify-center p-2.5 bg-linear-to-r from-[#F59B0F] to-[#FFA726] text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm hover:shadow-md"
            title="Edit Product"
            aria-label="Edit product"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onManageVariants(product)}
            className="flex items-center justify-center p-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors shadow-sm hover:shadow-md"
            title="Manage stocks and variants"
            aria-label="Manage product stocks and variants"
          >
            <FaBoxesStacked className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewFeedback(product)}
            className="flex items-center justify-center p-2.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-sm hover:shadow-md"
            title="View feedback"
            aria-label="View product feedback"
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
          </button>
          {canDelete && (
            <ForceDeleteDialog
              entityType="Product"
              entityId={product.id}
              entityIdentifier={`${product.name} (${product.code || product.id})`}
              onSuccess={onRefresh}
            />
          )}
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
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
