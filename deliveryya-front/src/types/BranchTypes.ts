import type { CommonIdName } from './EntitiesTypes';

export interface Branch {
  id: number;
  name: string;
  mainLine: string;
  location: string;
  city: CommonIdName;
}

export interface EmployeeBranch extends Branch {}

export interface BranchEmployee {
  id: number;
  usersId: number;
  usersFirstName: string;
  usersLastName: string;
  usersEmail: string;
  mobile: string;
  whatsapp: string;
  location: string;
}

export interface BranchQuery {
  pageNumber: number;
  countPerPage: number;
  totalCount: number;
  totalPages: number;
  search: string;
  items: Branch[];
}
