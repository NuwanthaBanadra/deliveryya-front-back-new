import { PlusIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

interface EmptyStateProps {
  onAddProduct: () => void;
  hasFilters?: boolean;
}

function EmptyState({ onAddProduct, hasFilters = false }: EmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 p-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
          <ShoppingBagIcon className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">No Products Found</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          No products match your current filters. Try adjusting your search criteria or clear filters to see all products.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-2xl shadow-sm border-2 border-dashed border-orange-300 p-12 text-center">
      <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#FF6B35] to-[#F59B0F] rounded-full mb-6 shadow-lg">
        <ShoppingBagIcon className="w-12 h-12 text-white" />
      </div>
      <h3 className="text-2xl font-bold text-gray-800 mb-3">No Products Yet</h3>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Start building your inventory! Add your first product to begin selling on our platform.
      </p>
      <button
        onClick={onAddProduct}
        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#FF6B35] to-[#F59B0F] text-white font-bold rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105"
      >
        <PlusIcon className="w-6 h-6" />
        Add Your First Product
      </button>
    </div>
  );
}

export default EmptyState;