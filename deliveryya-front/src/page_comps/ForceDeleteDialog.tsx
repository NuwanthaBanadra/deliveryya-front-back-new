import React from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';
import {
  previewForceDeleteProduct,
  forceDeleteProduct,
  previewForceDeleteCategory,
  forceDeleteCategory,
  previewForceDeleteBrand,
  forceDeleteBrand,
  previewForceDeleteUser,
  forceDeleteUser,
  type ForceDeletePreview,
} from '../util/ForceDeleteUtil';

interface ForceDeleteDialogProps {
  entityType: 'Product' | 'Category' | 'Brand' | 'User';
  entityId: number;
  entityIdentifier: string;
  onSuccess: () => void;
}

const ForceDeleteDialog: React.FC<ForceDeleteDialogProps> = ({
  entityType,
  entityId,
  entityIdentifier,
  onSuccess,
}) => {
  const handleForceDelete = async () => {
    try {
      let preview: ForceDeletePreview;

      // Get preview based on entity type
      switch (entityType) {
        case 'Product':
          preview = (await previewForceDeleteProduct(entityId)).object!;
          break;
        case 'Category':
          preview = (await previewForceDeleteCategory(entityId)).object!;
          break;
        case 'Brand':
          preview = (await previewForceDeleteBrand(entityId)).object!;
          break;
        case 'User':
          preview = (await previewForceDeleteUser(entityId)).object!;
          break;
        default:
          throw new Error('Unknown entity type');
      }

      // Build preview message
      let message = `<div class="text-left">`;

      if (preview.blockingReason) {
        message += `<p class="text-red-600 font-bold mb-4"><strong>⚠️ Warning:</strong> ${preview.blockingReason}</p>`;
      }

      if (Object.keys(preview.relatedRecordCounts).length > 0) {
        message += `<p class="font-bold mb-2">Related Records Found:</p>`;
        message += `<div class="bg-gray-50 p-3 rounded-lg mb-4">`;
        message += `<table class="w-full text-sm">`;
        message += `<thead><tr class="border-b"><th class="text-left py-1">Table</th><th class="text-right py-1">Count</th></tr></thead>`;
        message += `<tbody>`;
        for (const [table, count] of Object.entries(preview.relatedRecordCounts)) {
          message += `<tr class="border-b last:border-0"><td class="py-1">${table}</td><td class="text-right py-1 font-semibold">${count}</td></tr>`;
        }
        message += `</tbody></table></div>`;
      }

      if (preview.recordsToBeDeleted.length > 0) {
        message += `<p class="font-bold mb-2">Records That Will Be Deleted:</p>`;
        message += `<ul class="list-disc list-inside bg-red-50 p-3 rounded-lg text-sm">`;
        preview.recordsToBeDeleted.forEach((record) => {
          message += `<li class="mb-1">${record}</li>`;
        });
        message += `</ul>`;
      }

      if (preview.recordsToBeDetached.length > 0) {
        message += `<p class="font-bold mb-2 mt-4">Records That Will Be Detached:</p>`;
        message += `<ul class="list-disc list-inside bg-yellow-50 p-3 rounded-lg text-sm">`;
        preview.recordsToBeDetached.forEach((record) => {
          message += `<li class="mb-1">${record}</li>`;
        });
        message += `</ul>`;
      }

      message += `</div>`;

      // Show confirmation dialog
      const result = await Swal.fire({
        title: 'Confirm Force Delete',
        html: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, permanently delete!',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
      });

      if (result.isConfirmed) {
        // Perform force delete
        switch (entityType) {
          case 'Product':
            await forceDeleteProduct({ entityId, confirmed: true });
            break;
          case 'Category':
            await forceDeleteCategory({ entityId, confirmed: true });
            break;
          case 'Brand':
            await forceDeleteBrand({ entityId, confirmed: true });
            break;
          case 'User':
            await forceDeleteUser({ entityId, confirmed: true });
            break;
        }

        await Swal.fire({
          title: 'Deleted!',
          text: `${entityType} has been permanently deleted.`,
          icon: 'success',
        });

        onSuccess();
      }
    } catch (error: any) {
      await Swal.fire({
        title: 'Error',
        text: error.response?.data?.desc || error.message || 'Failed to delete',
        icon: 'error',
      });
    }
  };

  return (
    <button
      onClick={handleForceDelete}
      className="flex items-center justify-center p-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm hover:shadow-md"
      title={`Force delete ${entityType}`}
      aria-label={`Force delete ${entityType}`}
    >
      <TrashIcon className="w-5 h-5" />
    </button>
  );
};

export default ForceDeleteDialog;
