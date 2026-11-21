import axiosInstance from '../util/AxiosUtil';

export interface CompanyBankDetail {
  id?: number | string | null;
  name?: string | null;
  accNumber?: string | null;
  accountNumber?: string | null;
  bankName?: string | null;
  bank?: {
    id?: number | string | null;
    name?: string | null;
  } | null;
  isActive?: boolean | null;
}

export interface BankDetailOption {
  value: number;
  label: string;
}

interface ApiResponse<T> {
  object?: T;
}

const getText = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
};

const getCompanyBankDetails = async (): Promise<CompanyBankDetail[]> => {
  const response = await axiosInstance.get<ApiResponse<CompanyBankDetail[]>>(
    '/company/get-company-bank-details',
    { params: { isActive: true } },
  );

  const details = response.data?.object;
  return Array.isArray(details)
    ? details.filter((detail) => detail.isActive !== false)
    : [];
};

export const getCompanyBankDetailOptions = async (inputValue = ''): Promise<BankDetailOption[]> => {
  const search = inputValue.trim().toLowerCase();
  const details = await getCompanyBankDetails();

  return details
    .map((detail) => {
      const id = Number(detail.id);
      const bankName = getText(detail.bankName, detail.bank?.name, 'Bank account');
      const accountNumber = getText(detail.accNumber, detail.accountNumber);

      return {
        value: id,
        label: `${bankName}${accountNumber ? ` (${accountNumber})` : ''}`,
        searchText: `${bankName} ${accountNumber} ${getText(detail.name)}`.toLowerCase(),
      };
    })
    .filter((option) => option.value > 0 && (!search || option.searchText.includes(search)))
    .map(({ searchText: _searchText, ...option }) => option);
};

