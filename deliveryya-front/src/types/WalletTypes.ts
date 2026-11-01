import type { CommonIdName } from './EntitiesTypes';

export interface WalletRecordDto {
  id: number;
  amount: number | null;
  balance: number;
  isActive: boolean;
  isExpense: boolean;
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
