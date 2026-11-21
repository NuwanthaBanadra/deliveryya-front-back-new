import axiosInstance from './AxiosUtil';
import type { Branch, BranchEmployee, BranchQuery } from '../types/BranchTypes';
import type { WalletOperationDetailResponse } from '../types/WalletTypes';
import type {
  PaginatedWalletHistoryDto,
} from '../types/WalletTypes';

const unwrap = <T>(response: { data?: { object?: T } }): T => response.data?.object as T;

export async function getMyEmployeeBranches(): Promise<Branch[]> {
  return unwrap(await axiosInstance.get('/branches/my-branches')) ?? [];
}

export async function getBranches(request: Partial<BranchQuery>): Promise<BranchQuery> {
  return unwrap(await axiosInstance.post('/branches/get-branches', {
    pageNumber: 0,
    countPerPage: 100,
    totalCount: 0,
    totalPages: 0,
    search: '',
    ...request,
  }));
}

export async function saveBranch(branch: Omit<Branch, 'id'> & { id?: number }): Promise<void> {
  await axiosInstance.post('/branches/set-branch', branch);
}

export async function getBranchEmployees(branchId: number): Promise<BranchEmployee[]> {
  return unwrap(await axiosInstance.get(`/branches/${branchId}/employees`)) ?? [];
}

export async function assignUserToBranch(branchId: number, userId: number): Promise<void> {
  await axiosInstance.post(`/branches/${branchId}/users/${userId}`);
}

export async function removeEmployeeFromBranch(branchId: number, employeeId: number): Promise<void> {
  await axiosInstance.delete(`/branches/${branchId}/employees/${employeeId}`);
}

export async function getBranchWalletBalance(branchId: number): Promise<number> {
  return unwrap(await axiosInstance.get(`/wallet/branch/${branchId}/balance`));
}

export async function getBranchWalletOperationDetail(branchId: number, operationId: number): Promise<WalletOperationDetailResponse> {
  const res = await axiosInstance.get(`/wallet/branch/${branchId}/operation/${operationId}`);
  return res.data as WalletOperationDetailResponse;
}

export async function getBranchWalletHistory(
  branchId: number,
  request: PaginatedWalletHistoryDto,
): Promise<PaginatedWalletHistoryDto> {
  return unwrap(await axiosInstance.post(`/wallet/branch/${branchId}/history/paginated`, request));
}
