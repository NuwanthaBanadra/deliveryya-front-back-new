import type { CommonIdName } from './EntitiesTypes';

export interface WalletRecordDto {
  id: number;
  amount: number | null;
  balance: number;
  isActive: boolean;
  isExpense: boolean;
  paymentRecordId: number | null;
  paymentCategory: CommonIdName | null;
  paymentStatus: CommonIdName | null;
  code: string | null;
  ref: string | null;
  otherReason: string | null;
  note: string | null;
  toOrFrom: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
  createdByName?: string | null;
  createdByNic?: string | null;
  updatedBy: string | null;
  agent?: CommonIdName | null;
  user?: CommonIdName | null;
}

export interface PaginatedWalletHistoryDto {
  pageNumber: number;
  countPerPage: number;
  totalCount: number;
  totalPages: number;
  fromDate: string | null;
  toDate: string | null;
  minAmount: number | null;
  maxAmount: number | null;
  paymentCategoryId?: number | null;
  paymentStatusId?: number | null;
  branchId?: number | null;
  isExpense?: boolean | null;
  search: string | null;
  items: WalletRecordDto[];
}

export interface WalletBalanceResponse {
  status: number;
  message: string;
  desc: string;
  object: number;
}

export interface WalletHistoryResponse {
  status: number;
  message: string;
  desc: string;
  object: WalletRecordDto[];
}

export interface WalletPaginatedHistoryResponse {
  status: number;
  message: string;
  desc: string;
  object: PaginatedWalletHistoryDto;
}

export interface WalletOperationDetailResponse {
  status: number;
  message: string;
  desc: string;
  object: WalletRecordDto;
}

export interface WalletOperationRequest {
  amount: number;
  isExpense: boolean;
  paymentCategoryId?: number | null;
  paymentStatusId?: number | null;
  paymentRecordId?: number | null;
  branchId?: number | null;
  code?: string | null;
  ref?: string | null;
  otherReason?: string | null;
  note?: string | null;
  toOrFrom?: number | null;
}

export interface WalletOperationMutationResponse {
  status: number;
  message: string;
  desc: string;
  object: WalletRecordDto;
}

export interface PaymentRecordItemDto {
  id?: number | null;
  code: string | null;
  note: string | null;
  amount: number | null;
}

export interface PaymentRecordSummaryDto {
  id: number;
  amount: number | null;
  desc: string | null;
  proofUrl: string | null;
  paymentType: CommonIdName | null;
  paymentCategory: CommonIdName | null;
  verificationStatus: CommonIdName | null;
  bankDetail: {
    id?: number | null;
    name?: string | null;
    accNumber?: string | null;
    branch?: string | null;
    bank?: CommonIdName | null;
  } | null;
  paymentRecordItems: PaymentRecordItemDto[];
  createdAt: string | null;
  createdBy: string | null;
}

export interface PaginatedPaymentRecordResponse {
  message: string;
  desc: string;
  object: {
    items: PaymentRecordSummaryDto[];
  };
}
