export interface UserSearchResult {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  nic: string;
}

export interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  nic: string;
  dateOfBirth: string;
}

export interface EmployeeFormData {
  userId: number;
  firstName?: string;
  lastName?: string;
  mobile: string;
  whatsapp: string;
  verificationStatusId: number;
  userRoleId: number;
  branchId: number;
  liveLocation: string;
}

export interface UserRole {
  id: number;
  name: string;
}

export interface Branch {
  id: number;
  name: string;
}

export interface VerificationStatus {
  id: number;
  name: string;
}

export interface SignUpResponse {
  token: string;
  message: string;
}

export interface CommonIdNameDto {
  id: number;
  name?: string;
}

export interface SetEmployeeRequestDto {
  id: number;
  location: string;
  liveLocation: string;
  mobile: string;
  whatsapp: string;
  userRoles: CommonIdNameDto;
  verificationStatus: CommonIdNameDto;
  branches: CommonIdNameDto;
  users: CommonIdNameDto;
}
