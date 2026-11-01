import axiosInstance from './AxiosUtil';

export interface ForceDeletePreview {
  entityName: string;
  entityId: number;
  entityIdentifier: string;
  canDelete: boolean;
  blockingReason: string | null;
  relatedRecordCounts: Record<string, number>;
  recordsToBeDeleted: string[];
  recordsToBeDetached: string[];
}

export interface ForceDeleteConfirm {
  entityId: number;
  confirmed: boolean;
}

export interface ApiResponse<T> {
  status: number | null;
  message: string;
  desc: string;
  object?: T;
  exData?: T;
}

// Product Force Delete
export const previewForceDeleteProduct = async (productId: number): Promise<ApiResponse<ForceDeletePreview>> => {
  const response = await axiosInstance.get('/products/preview-force-delete-product', {
    params: { productId }
  });
  return response.data;
};

export const forceDeleteProduct = async (dto: ForceDeleteConfirm): Promise<ApiResponse<void>> => {
  const response = await axiosInstance.delete('/products/force-delete-product', {
    data: dto
  });
  return response.data;
};

// Category Force Delete
export const previewForceDeleteCategory = async (categoryId: number): Promise<ApiResponse<ForceDeletePreview>> => {
  const response = await axiosInstance.get('/products/preview-force-delete-category', {
    params: { categoryId }
  });
  return response.data;
};

export const forceDeleteCategory = async (dto: ForceDeleteConfirm): Promise<ApiResponse<void>> => {
  const response = await axiosInstance.delete('/products/force-delete-category', {
    data: dto
  });
  return response.data;
};

// Brand Force Delete
export const previewForceDeleteBrand = async (brandId: number): Promise<ApiResponse<ForceDeletePreview>> => {
  const response = await axiosInstance.get('/products/preview-force-delete-brand', {
    params: { brandId }
  });
  return response.data;
};

export const forceDeleteBrand = async (dto: ForceDeleteConfirm): Promise<ApiResponse<void>> => {
  const response = await axiosInstance.delete('/products/force-delete-brand', {
    data: dto
  });
  return response.data;
};

// User Force Delete
export const previewForceDeleteUser = async (userId: number): Promise<ApiResponse<ForceDeletePreview>> => {
  const response = await axiosInstance.get('/users/preview-force-delete-user', {
    params: { userId }
  });
  return response.data;
};

export const forceDeleteUser = async (dto: ForceDeleteConfirm): Promise<ApiResponse<void>> => {
  const response = await axiosInstance.delete('/users/force-delete-user', {
    data: dto
  });
  return response.data;
};
