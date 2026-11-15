# Front Access Control Implementation Guide

## Overview

This document explains how to implement the new **Fine-Grained Access Control** system in your React frontend, replacing the current role-based access control.

---

## Database Setup (Already Done)

SQL file location: `docs/api/FRONT_ACCESS_CONTROL_INSERT.sql`

**Execute these 4 INSERT statements in order:**
1. `access` table → 25 new frontend features (IDs 25-49)
2. `access_has_user_roles` → 179 role assignments
3. `access_has_apis` → Links Access Management to APIs
4. `api_features` → Optional fine-grained features

---

## Frontend Integration Steps

### Step 1: Create Access Check Helper Function

File: `src/util/AccessController.ts`

```typescript
import { axiosInstance } from './AxiosUtil';

/**
 * Check if current user has a specific access permission
 * @param accessId - The access ID to check (25-49 for frontend features)
 * @returns Promise<boolean> - true if user has access, false otherwise
 */
export async function checkAccess(accessId: number): Promise<boolean> {
  try {
    const response = await axiosInstance.post('/api/v1/access/get-granted-accesses-by-user-id', {
      pageNumber: 0,
      countPerPage: 100,
    });

    if (!response.data?.object) return false;

    const grantedAccesses = Array.isArray(response.data.object)
      ? response.data.object
      : response.data.object.items || [];

    return grantedAccesses.some((access: any) => access.accessId === accessId);
  } catch (error) {
    console.error('Access check failed:', error);
    return false;
  }
}

/**
 * Check multiple accesses at once
 * @param accessIds - Array of access IDs to check
 * @returns Promise<boolean[]> - Array of boolean values
 */
export async function checkMultipleAccess(accessIds: number[]): Promise<boolean[]> {
  try {
    const response = await axiosInstance.post('/api/v1/access/get-granted-accesses-by-user-id', {
      pageNumber: 0,
      countPerPage: 100,
    });

    if (!response.data?.object) return accessIds.map(() => false);

    const grantedAccesses = Array.isArray(response.data.object)
      ? response.data.object
      : response.data.object.items || [];

    return accessIds.map((id) =>
      grantedAccesses.some((access: any) => access.accessId === id)
    );
  } catch (error) {
    console.error('Multiple access check failed:', error);
    return accessIds.map(() => false);
  }
}

/**
 * Get all granted accesses for current user
 * @returns Promise<number[]> - Array of granted access IDs
 */
export async function getGrantedAccesses(): Promise<number[]> {
  try {
    const response = await axiosInstance.post('/api/v1/access/get-granted-accesses-by-user-id', {
      pageNumber: 0,
      countPerPage: 100,
    });

    if (!response.data?.object) return [];

    const grantedAccesses = Array.isArray(response.data.object)
      ? response.data.object
      : response.data.object.items || [];

    return grantedAccesses.map((access: any) => access.accessId);
  } catch (error) {
    console.error('Get granted accesses failed:', error);
    return [];
  }
}
```

---

### Step 2: Define Access ID Constants

File: `src/types/AccessConstants.ts` (New File)

```typescript
/**
 * Frontend Access Control Constants
 * Use these constants instead of hardcoded IDs throughout the app
 */

export const FRONTEND_ACCESS_IDS = {
  // Core Dashboard & Management
  DASHBOARD: 25,
  VIEW_ORDERS: 26,
  ADD_ORDERS: 27,
  MANAGE_USERS: 28,
  MANAGE_ROLES: 29,

  // Market Management
  VIEW_MARKETS: 30,
  MARKET_CATEGORIES: 31,
  ORDER_CODE_REQUESTS: 32,

  // Employee & Job Management
  EMPLOYEE_ASSIGNMENTS: 33,
  URGENT_JOBS: 34,
  PAYMENT_HANDOVER: 35,

  // Mid-Level Features
  ACCOUNTS_PANEL: 36,
  DELIVERY_FEES_MANAGEMENT: 37,
  ORDER_ANALYTICS: 38,
  CAREER_MANAGEMENT: 39,
  COMPLAINTS_MANAGEMENT: 40,

  // Client/Market Owner Features
  MY_MARKET_PRODUCTS: 41,
  MY_MARKET_CATEGORIES: 42,
  REQUEST_MARKET: 43,
  PROFILE_PANEL: 44,
  ORDER_CHECKOUT: 45,

  // Universal Access
  RECEIVING_ORDERS: 46,
  MY_COMPLAINTS: 47,

  // Admin Console
  ACCESS_MANAGEMENT: 48,

  // View-Only Features
  DELIVERY_FEES_VIEW: 49,
};

export type AccessId = typeof FRONTEND_ACCESS_IDS[keyof typeof FRONTEND_ACCESS_IDS];
```

---

### Step 3: Create Protected Route Component

File: `src/page_comps/shared/ProtectedRoute.tsx` (New File)

```typescript
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { checkAccess } from '../../util/AccessController';

interface ProtectedRouteProps {
  children: React.ReactNode;
  accessId: number;
  fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  accessId,
  fallback,
}) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkUserAccess = async () => {
      const access = await checkAccess(accessId);
      setHasAccess(access);
    };

    checkUserAccess();
  }, [accessId]);

  if (hasAccess === null) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!hasAccess) {
    return fallback || <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
```

---

### Step 4: Create Access Check Hook

File: `src/util/useAccess.ts` (New File)

```typescript
import { useState, useEffect } from 'react';
import { checkAccess, getGrantedAccesses } from './AccessController';

/**
 * Hook to check if current user has access to a feature
 */
export function useAccess(accessId: number) {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkUserAccess = async () => {
      setIsLoading(true);
      const access = await checkAccess(accessId);
      setHasAccess(access);
      setIsLoading(false);
    };

    checkUserAccess();
  }, [accessId]);

  return { hasAccess, isLoading };
}

/**
 * Hook to get all granted accesses
 */
export function useGrantedAccesses() {
  const [accessIds, setAccessIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAccesses = async () => {
      setIsLoading(true);
      const ids = await getGrantedAccesses();
      setAccessIds(ids);
      setIsLoading(false);
    };

    fetchAccesses();
  }, []);

  return { accessIds, isLoading };
}
```

---

### Step 5: Protect Page Components

Example: `src/pages/Dashboard.tsx`

**BEFORE (Role-based):**
```typescript
// Old role-based approach
const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'MANAGER'];
if (!allowedRoles.includes(userRole)) {
  return <Navigate to="/forbidden" />;
}
```

**AFTER (Access-based):**
```typescript
import { useAccess } from '../util/useAccess';
import { FRONTEND_ACCESS_IDS } from '../types/AccessConstants';

export default function Dashboard() {
  const { hasAccess, isLoading } = useAccess(FRONTEND_ACCESS_IDS.DASHBOARD);

  if (isLoading) return <div>Loading...</div>;
  if (!hasAccess) return <Navigate to="/forbidden" />;

  return (
    // Dashboard content
  );
}
```

---

### Step 6: Conditional Rendering in Components

Example: Hiding menu items based on access

**BEFORE:**
```typescript
{['SUPER_ADMIN', 'ADMIN'].includes(userRole) && (
  <a href="/access-management">Access Management</a>
)}
```

**AFTER:**
```typescript
import { useAccess } from '../util/useAccess';
import { FRONTEND_ACCESS_IDS } from '../types/AccessConstants';

export function Navigation() {
  const { hasAccess: canManageAccess } = useAccess(
    FRONTEND_ACCESS_IDS.ACCESS_MANAGEMENT
  );

  return (
    <>
      {canManageAccess && (
        <a href="/access-management">Access Management</a>
      )}
    </>
  );
}
```

---

## Migration Checklist

### Phase 1: Database (Complete)
- [ ] Execute SQL INSERT statements for `access` table
- [ ] Execute SQL INSERT statements for `access_has_user_roles`
- [ ] Execute SQL INSERT statements for `access_has_apis`
- [ ] Verify data with SELECT queries

### Phase 2: Frontend Infrastructure
- [ ] Create `AccessConstants.ts` with access ID definitions
- [ ] Update `AccessController.ts` with helper functions
- [ ] Create `useAccess.ts` custom hook
- [ ] Create `ProtectedRoute.tsx` component
- [ ] Update routing to use ProtectedRoute

### Phase 3: Component Migration
- [ ] Update Dashboard page
- [ ] Update Order Management pages
- [ ] Update User Management pages
- [ ] Update Market Management pages
- [ ] Update Employee Management pages
- [ ] Update Admin panels
- [ ] Update Navigation menus
- [ ] Update sidebar menus

### Phase 4: Testing & Validation
- [ ] Test access checks for each role
- [ ] Verify protected routes work correctly
- [ ] Test permission denial scenarios
- [ ] Load test with multiple users

---

## Access ID Reference

| ID | Feature | Level | Assigned Roles |
|----|---------|-------|----------------|
| 25 | Dashboard Access | 1 | All staff (10 roles) |
| 26 | View Placed Orders | 1 | SUPER_ADMIN, ADMIN, OWNER, MANAGER |
| 27 | Add Orders | 1 | SUPER_ADMIN, ADMIN, OWNER, MANAGER |
| 28 | Manage Users | 1 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, CEO, SECRETARY, HR_MANAGER, HR_ASSISTANT |
| 29 | Manage Roles | 1 | SUPER_ADMIN, ADMIN, OWNER |
| 30 | View Markets | 1 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, MARKETS_MANAGER |
| 31 | Market Categories | 1 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, MARKETS_MANAGER |
| 32 | Order Code Requests | 1 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, MARKETS_MANAGER |
| 33 | Employee Assignments | 1 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, AGENT, CEO, SECRETARY |
| 34 | Urgent Jobs | 1 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, CEO, SECRETARY, HR_MANAGER, HR_ASSISTANT |
| 35 | Payment Handover | 1 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, ACCOUNTS_MANAGER, ACCOUNT_ASSISTANT |
| 36 | Accounts Panel | 2 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, ACCOUNTS_MANAGER, ACCOUNT_ASSISTANT |
| 37 | Delivery Fees Mgmt | 2 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, ACCOUNTS_MANAGER, ACCOUNT_ASSISTANT |
| 38 | Order Analytics | 2 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, CLIENT, MARKET_OWNER, CEO, ACCOUNTS_MANAGER |
| 39 | Career Management | 2 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, CEO, SECRETARY, HR_MANAGER, HR_ASSISTANT |
| 40 | Complaints Mgmt | 2 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, CLIENT, MARKET_OWNER |
| 41 | My Market Products | 3 | ADMIN, OWNER, CLIENT, MARKET_OWNER |
| 42 | My Market Categories | 3 | ADMIN, OWNER, CLIENT, MARKET_OWNER |
| 43 | Request Market | 3 | ADMIN, OWNER, CLIENT, CUSTOMER |
| 44 | Profile Panel | 3 | All roles (15 roles) |
| 45 | Order Checkout | 3 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, CLIENT, AGENT, MARKET_OWNER, CEO, SECRETARY |
| 46 | Receiving Orders | 3 | All roles (15 roles) |
| 47 | My Complaints | 3 | All roles (15 roles) |
| 48 | Access Management | 1 | OWNER |
| 49 | Delivery Fees View | 3 | Most roles (12 roles) |

---

## Performance Considerations

### Caching Strategy
```typescript
// Cache access checks for 5 minutes
const accessCache = new Map<string, { data: boolean; timestamp: number }>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function checkAccessWithCache(accessId: number): Promise<boolean> {
  const key = `access_${accessId}`;
  const cached = accessCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const result = await checkAccess(accessId);
  accessCache.set(key, { data: result, timestamp: Date.now() });
  return result;
}
```

### Batch Checking
```typescript
// Check multiple accesses in one API call
async function checkMultipleWithCache(accessIds: number[]): Promise<Map<number, boolean>> {
  const uncached = accessIds.filter(id => !accessCache.has(`access_${id}`));
  
  if (uncached.length > 0) {
    const results = await checkMultipleAccess(uncached);
    uncached.forEach((id, index) => {
      accessCache.set(`access_${id}`, { 
        data: results[index], 
        timestamp: Date.now() 
      });
    });
  }

  const result = new Map<number, boolean>();
  accessIds.forEach(id => {
    const cached = accessCache.get(`access_${id}`);
    result.set(id, cached?.data ?? false);
  });

  return result;
}
```

---

## API Endpoints Used

- `POST /api/v1/access/get-granted-accesses-by-user-id` - Get user's granted accesses
- `POST /api/v1/access/get-all` - Get all available accesses (for Access Management UI)
- `POST /api/v1/access/grant-access-to-user` - Grant access to user (admin)
- `POST /api/v1/access/get-access-details` - Get access details

---

## Troubleshooting

### Issue: "Not able to access features I should have"
1. Verify SQL inserts executed successfully
2. Check `access_has_user_roles` table for your role
3. Verify `access_type_id = 1` for frontend features

### Issue: "All users denied access"
1. Check API endpoint is returning correct data
2. Verify `getGrantedAccesses()` parses response correctly
3. Check network requests in browser DevTools

### Issue: "Performance is slow"
1. Implement caching (see Performance Considerations)
2. Use batch checking for multiple features
3. Reduce frequency of access checks

---

## Next Steps

1. **Execute SQL file** → `docs/api/FRONT_ACCESS_CONTROL_INSERT.sql`
2. **Create constants file** → `src/types/AccessConstants.ts`
3. **Create utility functions** → `src/util/AccessController.ts`
4. **Create custom hook** → `src/util/useAccess.ts`
5. **Update routes** → Use `ProtectedRoute` component
6. **Migrate components** → One page at a time
7. **Test thoroughly** → All roles and permissions

---

**Document Version:** 1.0  
**Last Updated:** May 7, 2026  
**Framework:** React 18+ with TypeScript  
**Database:** MySQL 8.0+
