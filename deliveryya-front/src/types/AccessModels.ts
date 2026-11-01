export interface CreateAccessRequest {
  name: string;
  desc: string;
  accessLevelId: number;
  accessTypeId: number;
}

export interface CreateAccessResponse {
  message?: string;
  desc?: string;
  object?: number; // new access id
}

export interface SetAccessRequest {
  accessId: number;
  name: string;
  desc: string;
  accessLevelId: number;
  accessTypeId: number;
}

export interface LinkAccessWithApiRequest {
  accessId: number;
  apiId: number;
  apiFeatureIds?: number[];
  grant?: boolean;
}

export interface SetApiFeaturesForApiRequest {
  accessId: number;
  apiId: number;
  apiFeatureIds: number[];
}

export interface RemoveApiFeaturesForApiRequest {
  accessId: number;
  apiId: number;
  apiFeatureIds: number[];
}

export interface GrantAccessToUserRoleRequest {
  userRoleId: number;
  accessIds: number[];
  grantAccess?: boolean;
}

export interface GrantAccessToUserRequest {
  usersId: number;
  accessIds: number[];
  grantAccess?: boolean;
  exp?: string | null;
}

export interface AccessLookup {
  id: number;
  name: string;
}

export interface ApiFeature {
  id: number;
  name: string;
  desc?: string;
  apiId?: number;
}

export interface ApiRoute {
  id: number;
  name: string;
  desc: string;
  apiMethod?: AccessLookup | null;
  apiFeatures: ApiFeature[];
}

export interface AccessRecord {
  id: number;
  name: string;
  desc: string;
  accessLevel?: AccessLookup | null;
  accessType?: AccessLookup | null;
  apis: ApiRoute[];
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  exp?: string | null;
}

export interface PaginatedResult<T> {
  pageNumber: number;
  countPerPage: number;
  totalCount: number;
  totalPages: number;
  items: T[];
}

export interface GetAllAccessesRequest {
  pageNumber: number;
  countPerPage: number;
  accessId?: number | null;
  accessTypeId?: number | null;
  accessLevelId?: number | null;
  userRoleId?: number | null;
  userId?: number | null;
  apiIds?: number[];
  includeLinkedApis?: boolean;
  includeGrantMeta?: boolean;
  search?: string | null;
}

export interface GetAllApisRequest {
  pageNumber: number;
  countPerPage: number;
  accessId?: number | null;
  search?: string | null;
}

export interface ApiStandardResponse {
  message?: string;
  desc?: string;
  object?: unknown;
}
