import { ChevronDownIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { Category } from './types';
import ForceDeleteDialog from '../../../../page_comps/ForceDeleteDialog';

interface CategoryCardProps {
  category: Category;
  isExpanded: boolean;
  onExpand: (categoryId: number) => void;
  onStatusChange: (categoryId: number, isActive: boolean) => void;
  onDelete: (categoryId: number) => void;
  canDelete: boolean;
  onRefresh: () => void;
}

export default function CategoryCard({
  category,
  isExpanded,
  onExpand,
  onStatusChange,
  onDelete,
  canDelete,
  onRefresh,
}: CategoryCardProps) {
  const isActive = category.status === 'active';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => onExpand(category.id)}
            className="flex items-center gap-3 flex-1 text-left min-w-0"
          >
            <ChevronDownIcon
              className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 truncate">{category.name}</h3>
              <p className="text-sm text-gray-500">
                {category.productsCount} {category.productsCount === 1 ? 'product' : 'products'}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status Switch */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(category.id, !isActive);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? 'bg-green-500' : 'bg-gray-300'
              }`}
              title={isActive ? 'Active - Click to deactivate' : 'Inactive - Click to activate'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>

            {canDelete && (
              <ForceDeleteDialog
                entityType="Category"
                entityId={category.id}
                entityIdentifier={category.name}
                onSuccess={onRefresh}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
