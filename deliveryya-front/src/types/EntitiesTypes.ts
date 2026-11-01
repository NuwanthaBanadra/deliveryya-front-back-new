import type { ReactNode } from "react";

export type Product = {
  id: number;
  name: string;
  type: string;
  price: number;
  quantity: number;
  image: string;

};


// export interface DecodedUserData {
//   userId: string;
//   email: string;
//   roleId: number;
//   username: string;
//   status: number;
//   exp?: number;
// }



export type User = {
  id: number;
  fname: string;
  lname: string;
  address: string;
  nic: string;
  email: string;
  password: string;
  mobile: string;
  user_role_id: number;
  gender_id: number;
  city_id: number;
  status_id: number;
  p_img?: string | null;
  exp?: number;

};

export type DecodedUserData = {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  roleId: number;
  roleLevel: number;
  isVerified: boolean;
  isEmployee: boolean;
  accessIds: number[];
  sub: string;
  iat: number;
  exp: number;
  has_market: boolean;
  email_verified: boolean;

};

export interface AuthProps {
  children?: ReactNode;

}


export type BE_Product = {
  id: number;
  name: string;
  desc: string;
  mother_plant_type_id: number;
  category_id: number;
  isActive: boolean;
  price: number;
  qty: number;
  imageUrl?: string | null;

}

export type Cart_Product = {
  p_id: number;
  qty: number;
  batch_id?: number;

}

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;

}

export type BatchImage = {
  id: number;
  name: string;
  batch_id: number;

};

export type Batch = {
  id: number;
  qty: number;
  price: number;
  cost: number;
  desc: string;
  size: CommonIdName;
  code: string;
  images: BatchImage[];

};

export type CartFullProductDetails = {
  id: number;
  name: string;
  desc: string;
  mother_plant_type: { id: number; name: string };
  category: { id: number; name: string };
  isActive: boolean;
  batches: Batch[];

};


export type CommonIdName = {
  id: number;
  name: string;

}

export type SizeData = {
  id: number;
  name: string;
  batch_id: number;

}

// API Product Types
export type ApiProductImage = {
  id: number;
  url: string;
};

export type ApiProductBrand = {
  id: number;
  name: string | null;
  marketId: number | null;
  markets?: { id: number } | null;
};

export type ApiProduct = {
  id: number;
  name: string | null;
  desc: string | null;
  code: string | null;
  brand: ApiProductBrand | null;
  category?: {
    id: number;
    name: string | null;
    markets?: { id: number } | null;
  } | null;
  marketId: number | null;
  sellingPrice: string | number | null;
  showingPrice: string | number | null;
  productImages: ApiProductImage[] | null;
};

export type ApiProductResponse = {
  status: null;
  message: string;
  desc: string;
  exData: null;
  object: ApiProduct;
};

// Feedback Types
export type ApiFeedback = {
  id: number;
  comment: string | null;
  rating: number;
  productId: number;
  userId: number;
  userName: string | null;
  profileImg?: string | null;
  profileImage?: string | null;
  avatar?: string | null;
  imageUrl?: string | null;
  user?: {
    profileImg?: string | null;
    profileImage?: string | null;
    avatar?: string | null;
    imageUrl?: string | null;
  } | null;
  createdAt: string | null;
  updatedAt?: string | null;
};

export type FeedbackListRequest = {
  pageNumber: number;
  countPerPage: number;
  productId: number;
  userId?: number | null;
  search?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
};

export type FeedbackListResponseObject = {
  pageNumber: number;
  countPerPage: number;
  totalCount: number;
  totalPages: number;
  productId: number;
  userId: number | null;
  search: string | null;
  feedbacks: ApiFeedback[];
};

export type FeedbackListResponse = {
  status?: number;
  message?: string;
  desc?: string;
  exData?: FeedbackListResponseObject;
  object?: FeedbackListResponseObject;
};

export type FeedbackSaveRequest = {
  id?: number;
  comment?: string;
  rating: number;
  productId: number;
};

export type FeedbackSaveResponse = {
  status?: number;
  message?: string;
  desc?: string;
  exData?: ApiFeedback;
  object?: ApiFeedback;
};

export type ProductFeedbackReview = {
  id: number;
  name: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
  avatar: string;
};

// Profile Types
export interface BaseUserData {
  firstName: string;
  lastName: string;
  dob: string;
  nic: string;
  email: string;
  password?: string;
  profileImage?: string;

}

export interface AddressData {
  id?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;

}

export interface UserProfile {
  baseData: BaseUserData;
  addresses?: AddressData[];

}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;

}