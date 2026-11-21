import axiosInstance from './AxiosUtil';
import type {
  WalletBalanceResponse,
  WalletHistoryResponse,
  WalletPaginatedHistoryResponse,
  WalletOperationDetailResponse,
  PaginatedWalletHistoryDto,
  PaginatedPaymentRecordResponse,
  WalletOperationRequest,
  WalletOperationMutationResponse,
} from '../types/WalletTypes';

// Agent Wallet APIs
export async function getAgentWalletBalance(agentId: number): Promise<WalletBalanceResponse> {
  const res = await axiosInstance.get(`/wallet/agent/${agentId}/balance`);
  return res.data as WalletBalanceResponse;
}

export async function getAgentWalletHistoryPaginated(
  agentId: number,
  request: PaginatedWalletHistoryDto
): Promise<WalletPaginatedHistoryResponse> {
  const res = await axiosInstance.post(`/wallet/agent/${agentId}/history/paginated`, request);
  return res.data as WalletPaginatedHistoryResponse;
}

export async function getAgentWalletOperationDetail(
  agentId: number,
  operationId: number
): Promise<WalletOperationDetailResponse> {
  const res = await axiosInstance.get(`/wallet/agent/${agentId}/operation/${operationId}`);
  return res.data as WalletOperationDetailResponse;
}

// Client/Market Owner Wallet APIs
export async function getClientMarketOwnerWalletBalance(userId: number): Promise<WalletBalanceResponse> {
  const res = await axiosInstance.get(`/wallet/client-market-owner/${userId}/balance`);
  return res.data as WalletBalanceResponse;
}

export async function getClientMarketOwnerWalletHistoryPaginated(
  userId: number,
  request: PaginatedWalletHistoryDto
): Promise<WalletPaginatedHistoryResponse> {
  const res = await axiosInstance.post(`/wallet/client-market-owner/${userId}/history/paginated`, request);
  return res.data as WalletPaginatedHistoryResponse;
}

export async function getClientMarketOwnerWalletOperationDetail(
  userId: number,
  operationId: number
): Promise<WalletOperationDetailResponse> {
  const res = await axiosInstance.get(`/wallet/client-market-owner/${userId}/operation/${operationId}`);
  return res.data as WalletOperationDetailResponse;
}

// Company Wallet APIs
export async function getCompanyWalletBalance(): Promise<WalletBalanceResponse> {
  const res = await axiosInstance.get('/wallet/company/balance');
  return res.data as WalletBalanceResponse;
}

export async function getCompanyWalletHistoryPaginated(
  request: PaginatedWalletHistoryDto
): Promise<WalletPaginatedHistoryResponse> {
  const res = await axiosInstance.post('/wallet/company/history/paginated', request);
  return res.data as WalletPaginatedHistoryResponse;
}

export async function getCompanyWalletOperationDetail(
  operationId: number
): Promise<WalletOperationDetailResponse> {
  const res = await axiosInstance.get(`/wallet/company/operation/${operationId}`);
  return res.data as WalletOperationDetailResponse;
}

export async function createAgentWalletOperation(agentId: number, operation: WalletOperationRequest): Promise<WalletOperationMutationResponse> {
  const res = await axiosInstance.post(`/wallet/agent/${agentId}/operation`, operation);
  return res.data as WalletOperationMutationResponse;
}

export async function createClientMarketOwnerWalletOperation(userId: number, operation: WalletOperationRequest): Promise<WalletOperationMutationResponse> {
  const res = await axiosInstance.post(`/wallet/client-market-owner/${userId}/operation`, operation);
  return res.data as WalletOperationMutationResponse;
}

export async function createCompanyWalletOperation(operation: WalletOperationRequest): Promise<WalletOperationMutationResponse> {
  const res = await axiosInstance.post('/wallet/company/operation', operation);
  return res.data as WalletOperationMutationResponse;
}

export async function initializeAgentWallet(agentId: number): Promise<WalletOperationMutationResponse> {
  const res = await axiosInstance.post(`/wallet/agent/${agentId}/initialize`);
  return res.data as WalletOperationMutationResponse;
}

export async function initializeClientMarketOwnerWallet(userId: number): Promise<WalletOperationMutationResponse> {
  const res = await axiosInstance.post(`/wallet/client-market-owner/${userId}/initialize`);
  return res.data as WalletOperationMutationResponse;
}

export async function initializeCompanyWallet(): Promise<WalletOperationMutationResponse> {
  const res = await axiosInstance.post('/wallet/company/initialize');
  return res.data as WalletOperationMutationResponse;
}

export async function initializeBranchWallet(branchId: number): Promise<WalletOperationMutationResponse> {
  const res = await axiosInstance.post(`/wallet/branch/${branchId}/initialize`);
  return res.data as WalletOperationMutationResponse;
}

export async function getPaymentRecordById(id: number): Promise<PaginatedPaymentRecordResponse> {
  const res = await axiosInstance.post('/payment/get-payment-records', {
    pageNumber: 0,
    countPerPage: 1,
    paymentRecodeId: id,
    items: [],
  });
  return res.data as PaginatedPaymentRecordResponse;
}
