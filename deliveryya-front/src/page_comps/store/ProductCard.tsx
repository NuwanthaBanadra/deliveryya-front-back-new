import type { KeyboardEvent, ReactNode } from "react";
import { BiShoppingBag } from "react-icons/bi";
import { FaRegStar, FaStar, FaStarHalfAlt } from "react-icons/fa";
import { MdNewReleases } from "react-icons/md";

export interface StoreProductCardProduct {
  id?: number;
  marketId?: number;
  title: string;
  price?: string;
  rating?: number;
  reviews?: number;
  stockQty?: number;
  img?: string;
  isNew?: boolean;
  colors?: string[];
  oldPrice?: string;
  category?: string;
  inStock?: boolean;
}

export type NewArrivalProduct = StoreProductCardProduct;

interface ProductCardProps {
  product: StoreProductCardProduct;
  onCardClick?: () => void;
  onAddToCart?: () => void;
  onQuickView?: () => void;
  disableAddToCart?: boolean;
  className?: string;
  imageClassName?: string;
  contentClassName?: string;
  topLeftSlot?: ReactNode;
  topRightSlot?: ReactNode;
  mediaFooterSlot?: ReactNode;
  detailsSlot?: ReactNode;
  showHoverActions?: boolean;
}

const normalizeRating = (rating?: number): number => {
  const numericRating = Number(rating ?? 0);
  if (!Number.isFinite(numericRating)) return 0;
  return Math.min(5, Math.max(0, numericRating));
};

const renderRatingStars = (rating?: number) => {
  const roundedRating = Math.round(normalizeRating(rating) * 2) / 2;

  return [1, 2, 3, 4, 5].map((star) => {
    if (roundedRating >= star) {
      return <FaStar key={star} className="h-4 w-4 text-[#FFB84D]" aria-hidden="true" />;
    }
    if (roundedRating >= star - 0.5) {
      return <FaStarHalfAlt key={star} className="h-4 w-4 text-[#FFB84D]" aria-hidden="true" />;
    }
    return <FaRegStar key={star} className="h-4 w-4 text-gray-300" aria-hidden="true" />;
  });
};

function ProductCard({
  product,
  onCardClick,
  onAddToCart,
  onQuickView,
  disableAddToCart = false,
  className,
  imageClassName,
  contentClassName,
  topLeftSlot,
  topRightSlot,
  mediaFooterSlot,
  detailsSlot,
  showHoverActions = true,
}: ProductCardProps) {
  const isInStock = product.inStock ?? true;
  const hasClickHandler = Boolean(onCardClick);
  const imageSrc = product.img || 'https://images.unsplash.com/photo-1523275335684-37898b45f666?w=400&q=80';
  const rating = normalizeRating(product.rating);
  const price = product.price || '—';
  const cardClassName = `group relative bg-white rounded-2xl shadow-md hover:shadow-2xl overflow-hidden transition-all duration-500 ${hasClickHandler ? 'cursor-pointer' : ''} ${className || ''}`;
  const secondaryRatingText =
    typeof product.stockQty === 'number'
      ? `${product.stockQty.toLocaleString()} available`
      : typeof product.reviews === 'number'
        ? `${product.reviews.toLocaleString()} reviews`
        : '';

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onCardClick) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onCardClick();
    }
  };

  const sharedContent = (
    <>
      {topLeftSlot ?? (product.isNew && (
        <div className="absolute top-3 left-3 z-10 bg-linear-to-r from-[#FF6B35] to-[#FF6B35] text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
          <MdNewReleases className="w-3 h-3" />
          NEW
        </div>
      ))}

      {!isInStock && (
        <div className="absolute top-3 left-3 z-10 bg-linear-to-r from-gray-700 to-gray-900 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
          OUT OF STOCK
        </div>
      )}

      {topRightSlot ?? (product.category && (
        <div className="absolute top-3 right-3 z-10 bg-linear-to-r from-[#FF6B35] to-[#FF6B35] text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
          {product.category}
        </div>
      ))}

      <div className={`relative overflow-hidden h-64 bg-gray-50 ${imageClassName || ''}`}>
        <img
          src={imageSrc}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        {mediaFooterSlot}
        {showHoverActions && (
          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
            <button
              className="bg-white text-gray-900 p-3 rounded-full hover:bg-[#FF6B35] hover:text-white transition-all duration-300 transform hover:scale-110"
              title="Add to cart"
              aria-label={`Add ${product.title} to cart`}
              onClick={(event) => {
                event.stopPropagation();
                onAddToCart?.();
              }}
              disabled={!isInStock || disableAddToCart}
            >
              <BiShoppingBag className="w-5 h-5" />
            </button>
            <button
              className="bg-white text-gray-900 font-bold py-2 px-6 rounded-full hover:bg-[#FF6B35] hover:text-white transition-all duration-300"
              onClick={(event) => {
                event.stopPropagation();
                onQuickView?.();
              }}
            >
              Quick View
            </button>
          </div>
        )}
      </div>

      {detailsSlot ? (
        <div className={`p-6 ${contentClassName || ''}`}>{detailsSlot}</div>
      ) : (
        <div className={`p-4 space-y-3 ${contentClassName || ''}`}>
          <h3 className="text-base font-bold text-gray-800 group-hover:text-[#FF6B35] transition-colors line-clamp-1">
            {product.title}
          </h3>

          {(typeof product.rating === 'number' || typeof product.reviews === 'number') && (
            <div className="flex items-center justify-between gap-3 text-sm text-gray-500">
              <div className="flex items-center gap-1.5" aria-label={`Rating ${rating.toFixed(1)} out of 5`}>
                <div className="flex items-center gap-0.5">{renderRatingStars(rating)}</div>
                <span className="font-semibold text-gray-700">{rating.toFixed(1)}</span>
              </div>
              {secondaryRatingText && <span className="text-xs font-medium">{secondaryRatingText}</span>}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[#FF6B35]">{price}</span>
              {product.oldPrice && <span className="text-sm text-gray-400 line-through">{product.oldPrice}</span>}
            </div>
            <button
              className="bg-linear-to-r from-[#FF6B35] to-[#FF8C42] text-white p-2 rounded-lg hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-60"
              title="Add to cart"
              aria-label={`Add ${product.title} to cart`}
              onClick={(event) => {
                event.stopPropagation();
                onAddToCart?.();
              }}
              disabled={!isInStock || disableAddToCart}
            >
              <BiShoppingBag className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );

  if (hasClickHandler) {
    return (
      <div
        onClick={onCardClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        className={cardClassName}
      >
        {sharedContent}
      </div>
    );
  }

  return <div className={cardClassName}>{sharedContent}</div>;
}

export default ProductCard;
