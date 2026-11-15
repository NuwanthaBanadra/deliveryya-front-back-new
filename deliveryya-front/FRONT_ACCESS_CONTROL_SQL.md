# Front Access Control - SQL Insert Statements

## Analysis Summary

This document contains all the SQL INSERT statements needed to protect your React frontend UI components using the fine-grained access control system. These statements are for **Front Access Control only** (access_type_id = 1).

**Total Features to Protect:** 25 major features across the dashboard

---

## 1. ACCESS TABLE - INSERT STATEMENTS

Add these new access control entries for frontend features:

```sql
-- Front Access Control Features (access_type_id = 1)
-- Access Level Mapping:
-- 1 = Top Level (Super Admin, Admin, Owner)
-- 2 = Mid Level (Manager, CEO, Secretary)  
-- 3 = Low Level (Client, Customer, Agent, Staff)

INSERT INTO `access` (`name`, `desc`, `access_level_id`, `access_type_id`) VALUES
-- Dashboard & Core Features (Top Level)
(25, 'Dashboard Access', 'Access to view dashboard and analytics', 1, 1),
(26, 'Order Management - View Placed Orders', 'View all placed orders', 1, 1),
(27, 'Order Management - Add Orders', 'Create and add new orders', 1, 1),
(28, 'User Management - Manage Users', 'Create, update, view, delete user accounts', 1, 1),
(29, 'User Management - Manage Roles', 'Configure user roles and role assignments', 1, 1),

-- Market Management (Top Level)
(30, 'Market Management - View Markets', 'View market directory and listings', 1, 1),
(31, 'Market Management - Market Categories', 'Manage market categories and brands', 1, 1),
(32, 'Market Management - Order Code Requests', 'View and manage order code requests', 1, 1),

-- Employee Management (Top/Mid Level)
(33, 'Employee Management - Employee Assignments', 'Assign and manage employee tasks', 1, 1),
(34, 'Employee Management - Urgent Jobs', 'Create and manage urgent job assignments', 1, 1),
(35, 'Employee Management - Payment Handover', 'Process agent payment handovers', 1, 1),

-- Mid-Level Features
(36, 'Accounts Panel Access', 'View financial accounts and settlement reports', 2, 1),
(37, 'Delivery Fees Management', 'Configure delivery fees', 2, 1),
(38, 'Order Analytics Access', 'View order analytics and reports', 2, 1),
(39, 'Career Management', 'View and manage career/job applications', 2, 1),
(40, 'Complaints Management', 'View and manage customer complaints', 2, 1),

-- Client/Market Owner Features (Low Level)
(41, 'My Market - Manage Products', 'Add, edit, delete products in your market', 3, 1),
(42, 'My Market - Manage Categories', 'Create and manage product categories', 3, 1),
(43, 'Request for Market', 'Submit request to create a new market', 3, 1),
(44, 'Profile Panel Access', 'View and edit user profile', 3, 1),
(45, 'Order Checkout', 'Proceed to checkout and place orders', 3, 1),

-- Universal Access
(46, 'Receiving Orders Access', 'Receive and view incoming orders', 3, 1),
(47, 'My Complaints Access', 'View personal complaints and support tickets', 3, 1),
(48, 'Access Management Console', 'Configure access control for system users', 1, 1),
(49, 'Delivery Fees - View Only', 'View delivery fee information', 3, 1);
```

---

## 2. ACCESS_HAS_USER_ROLES - INSERT STATEMENTS

Link the above accesses to user roles:

```sql
-- Top Level Features -> OWNER (role_id = 3), ADMIN (role_id = 2), SUPER_ADMIN (role_id = 1)
INSERT INTO `access_has_user_roles` (`access_id`, `user_roles_id`, `created_at`, `created_by`) VALUES
-- Dashboard & Core
(25, 1, NOW(), 'system'),  -- Dashboard - SUPER_ADMIN
(25, 2, NOW(), 'system'),  -- Dashboard - ADMIN
(25, 3, NOW(), 'system'),  -- Dashboard - OWNER
(25, 4, NOW(), 'system'),  -- Dashboard - MANAGER
(25, 9, NOW(), 'system'),  -- Dashboard - CEO
(25, 10, NOW(), 'system'), -- Dashboard - SECRETARY
(25, 11, NOW(), 'system'), -- Dashboard - ACCOUNTS_MANAGER
(25, 12, NOW(), 'system'), -- Dashboard - ACCOUNT_ASSISTANT
(25, 13, NOW(), 'system'), -- Dashboard - HR_MANAGER
(25, 14, NOW(), 'system'), -- Dashboard - HR_ASSISTANT

-- View Placed Orders
(26, 1, NOW(), 'system'),  -- SUPER_ADMIN
(26, 2, NOW(), 'system'),  -- ADMIN
(26, 3, NOW(), 'system'),  -- OWNER
(26, 4, NOW(), 'system'),  -- MANAGER

-- Add Orders
(27, 1, NOW(), 'system'),  -- SUPER_ADMIN
(27, 2, NOW(), 'system'),  -- ADMIN
(27, 3, NOW(), 'system'),  -- OWNER
(27, 4, NOW(), 'system'),  -- MANAGER

-- Manage Users
(28, 1, NOW(), 'system'),  -- SUPER_ADMIN
(28, 2, NOW(), 'system'),  -- ADMIN
(28, 3, NOW(), 'system'),  -- OWNER
(28, 4, NOW(), 'system'),  -- MANAGER
(28, 9, NOW(), 'system'),  -- CEO
(28, 10, NOW(), 'system'), -- SECRETARY
(28, 13, NOW(), 'system'), -- HR_MANAGER
(28, 14, NOW(), 'system'), -- HR_ASSISTANT

-- Manage Roles
(29, 1, NOW(), 'system'),  -- SUPER_ADMIN
(29, 2, NOW(), 'system'),  -- ADMIN
(29, 3, NOW(), 'system'),  -- OWNER

-- Market Management - View Markets
(30, 1, NOW(), 'system'),  -- SUPER_ADMIN
(30, 2, NOW(), 'system'),  -- ADMIN
(30, 3, NOW(), 'system'),  -- OWNER
(30, 4, NOW(), 'system'),  -- MANAGER
(30, 15, NOW(), 'system'), -- MARKETS_MANAGER

-- Market Categories
(31, 1, NOW(), 'system'),  -- SUPER_ADMIN
(31, 2, NOW(), 'system'),  -- ADMIN
(31, 3, NOW(), 'system'),  -- OWNER
(31, 4, NOW(), 'system'),  -- MANAGER
(31, 15, NOW(), 'system'), -- MARKETS_MANAGER

-- Order Code Requests
(32, 1, NOW(), 'system'),  -- SUPER_ADMIN
(32, 2, NOW(), 'system'),  -- ADMIN
(32, 3, NOW(), 'system'),  -- OWNER
(32, 4, NOW(), 'system'),  -- MANAGER
(32, 15, NOW(), 'system'), -- MARKETS_MANAGER

-- Employee Assignments
(33, 1, NOW(), 'system'),  -- SUPER_ADMIN
(33, 2, NOW(), 'system'),  -- ADMIN
(33, 3, NOW(), 'system'),  -- OWNER
(33, 4, NOW(), 'system'),  -- MANAGER
(33, 7, NOW(), 'system'),  -- AGENT
(33, 9, NOW(), 'system'),  -- CEO
(33, 10, NOW(), 'system'), -- SECRETARY

-- Urgent Jobs
(34, 1, NOW(), 'system'),  -- SUPER_ADMIN
(34, 2, NOW(), 'system'),  -- ADMIN
(34, 3, NOW(), 'system'),  -- OWNER
(34, 4, NOW(), 'system'),  -- MANAGER
(34, 9, NOW(), 'system'),  -- CEO
(34, 10, NOW(), 'system'), -- SECRETARY
(34, 13, NOW(), 'system'), -- HR_MANAGER
(34, 14, NOW(), 'system'), -- HR_ASSISTANT

-- Payment Handover
(35, 1, NOW(), 'system'),  -- SUPER_ADMIN
(35, 2, NOW(), 'system'),  -- ADMIN
(35, 3, NOW(), 'system'),  -- OWNER
(35, 4, NOW(), 'system'),  -- MANAGER
(35, 11, NOW(), 'system'), -- ACCOUNTS_MANAGER
(35, 12, NOW(), 'system'), -- ACCOUNT_ASSISTANT

-- Mid-Level Features

-- Accounts Panel
(36, 1, NOW(), 'system'),  -- SUPER_ADMIN
(36, 2, NOW(), 'system'),  -- ADMIN
(36, 3, NOW(), 'system'),  -- OWNER
(36, 4, NOW(), 'system'),  -- MANAGER
(36, 11, NOW(), 'system'), -- ACCOUNTS_MANAGER
(36, 12, NOW(), 'system'), -- ACCOUNT_ASSISTANT

-- Delivery Fees
(37, 1, NOW(), 'system'),  -- SUPER_ADMIN
(37, 2, NOW(), 'system'),  -- ADMIN
(37, 3, NOW(), 'system'),  -- OWNER
(37, 4, NOW(), 'system'),  -- MANAGER
(37, 11, NOW(), 'system'), -- ACCOUNTS_MANAGER
(37, 12, NOW(), 'system'), -- ACCOUNT_ASSISTANT

-- Order Analytics
(38, 1, NOW(), 'system'),  -- SUPER_ADMIN
(38, 2, NOW(), 'system'),  -- ADMIN
(38, 3, NOW(), 'system'),  -- OWNER
(38, 4, NOW(), 'system'),  -- MANAGER
(38, 5, NOW(), 'system'),  -- CLIENT
(38, 8, NOW(), 'system'),  -- MARKET_OWNER
(38, 9, NOW(), 'system'),  -- CEO
(38, 11, NOW(), 'system'), -- ACCOUNTS_MANAGER
(38, 12, NOW(), 'system'), -- ACCOUNT_ASSISTANT

-- Career
(39, 1, NOW(), 'system'),  -- SUPER_ADMIN
(39, 2, NOW(), 'system'),  -- ADMIN
(39, 3, NOW(), 'system'),  -- OWNER
(39, 4, NOW(), 'system'),  -- MANAGER
(39, 9, NOW(), 'system'),  -- CEO
(39, 10, NOW(), 'system'), -- SECRETARY
(39, 13, NOW(), 'system'), -- HR_MANAGER
(39, 14, NOW(), 'system'), -- HR_ASSISTANT

-- Complaints Management
(40, 1, NOW(), 'system'),  -- SUPER_ADMIN
(40, 2, NOW(), 'system'),  -- ADMIN
(40, 3, NOW(), 'system'),  -- OWNER
(40, 4, NOW(), 'system'),  -- MANAGER
(40, 5, NOW(), 'system'),  -- CLIENT
(40, 8, NOW(), 'system'),  -- MARKET_OWNER

-- Low-Level / Client Features

-- My Market Products
(41, 2, NOW(), 'system'),  -- ADMIN
(41, 3, NOW(), 'system'),  -- OWNER
(41, 5, NOW(), 'system'),  -- CLIENT
(41, 8, NOW(), 'system'),  -- MARKET_OWNER

-- My Market Categories
(42, 2, NOW(), 'system'),  -- ADMIN
(42, 3, NOW(), 'system'),  -- OWNER
(42, 5, NOW(), 'system'),  -- CLIENT
(42, 8, NOW(), 'system'),  -- MARKET_OWNER

-- Request for Market
(43, 2, NOW(), 'system'),  -- ADMIN
(43, 3, NOW(), 'system'),  -- OWNER
(43, 5, NOW(), 'system'),  -- CLIENT
(43, 6, NOW(), 'system'),  -- CUSTOMER

-- Profile Panel Access (ALL ROLES)
(44, 1, NOW(), 'system'),  -- SUPER_ADMIN
(44, 2, NOW(), 'system'),  -- ADMIN
(44, 3, NOW(), 'system'),  -- OWNER
(44, 4, NOW(), 'system'),  -- MANAGER
(44, 5, NOW(), 'system'),  -- CLIENT
(44, 6, NOW(), 'system'),  -- CUSTOMER
(44, 7, NOW(), 'system'),  -- AGENT
(44, 8, NOW(), 'system'),  -- MARKET_OWNER
(44, 9, NOW(), 'system'),  -- CEO
(44, 10, NOW(), 'system'), -- SECRETARY
(44, 11, NOW(), 'system'), -- ACCOUNTS_MANAGER
(44, 12, NOW(), 'system'), -- ACCOUNT_ASSISTANT
(44, 13, NOW(), 'system'), -- HR_MANAGER
(44, 14, NOW(), 'system'), -- HR_ASSISTANT
(44, 15, NOW(), 'system'), -- MARKETS_MANAGER

-- Order Checkout
(45, 1, NOW(), 'system'),  -- SUPER_ADMIN
(45, 2, NOW(), 'system'),  -- ADMIN
(45, 3, NOW(), 'system'),  -- OWNER
(45, 4, NOW(), 'system'),  -- MANAGER
(45, 5, NOW(), 'system'),  -- CLIENT
(45, 7, NOW(), 'system'),  -- AGENT
(45, 8, NOW(), 'system'),  -- MARKET_OWNER
(45, 9, NOW(), 'system'),  -- CEO
(45, 10, NOW(), 'system'), -- SECRETARY

-- Receiving Orders (ALL ROLES)
(46, 1, NOW(), 'system'),  -- SUPER_ADMIN
(46, 2, NOW(), 'system'),  -- ADMIN
(46, 3, NOW(), 'system'),  -- OWNER
(46, 4, NOW(), 'system'),  -- MANAGER
(46, 5, NOW(), 'system'),  -- CLIENT
(46, 6, NOW(), 'system'),  -- CUSTOMER
(46, 7, NOW(), 'system'),  -- AGENT
(46, 8, NOW(), 'system'),  -- MARKET_OWNER
(46, 9, NOW(), 'system'),  -- CEO
(46, 10, NOW(), 'system'), -- SECRETARY
(46, 11, NOW(), 'system'), -- ACCOUNTS_MANAGER
(46, 12, NOW(), 'system'), -- ACCOUNT_ASSISTANT
(46, 13, NOW(), 'system'), -- HR_MANAGER
(46, 14, NOW(), 'system'), -- HR_ASSISTANT
(46, 15, NOW(), 'system'), -- MARKETS_MANAGER

-- My Complaints (ALL ROLES)
(47, 1, NOW(), 'system'),  -- SUPER_ADMIN
(47, 2, NOW(), 'system'),  -- ADMIN
(47, 3, NOW(), 'system'),  -- OWNER
(47, 4, NOW(), 'system'),  -- MANAGER
(47, 5, NOW(), 'system'),  -- CLIENT
(47, 6, NOW(), 'system'),  -- CUSTOMER
(47, 7, NOW(), 'system'),  -- AGENT
(47, 8, NOW(), 'system'),  -- MARKET_OWNER
(47, 9, NOW(), 'system'),  -- CEO
(47, 10, NOW(), 'system'), -- SECRETARY
(47, 11, NOW(), 'system'), -- ACCOUNTS_MANAGER
(47, 12, NOW(), 'system'), -- ACCOUNT_ASSISTANT
(47, 13, NOW(), 'system'), -- HR_MANAGER
(47, 14, NOW(), 'system'), -- HR_ASSISTANT
(47, 15, NOW(), 'system'), -- MARKETS_MANAGER

-- Access Management (OWNER ONLY)
(48, 3, NOW(), 'system'),  -- OWNER

-- Delivery Fees View
(49, 1, NOW(), 'system'),  -- SUPER_ADMIN
(49, 2, NOW(), 'system'),  -- ADMIN
(49, 3, NOW(), 'system'),  -- OWNER
(49, 4, NOW(), 'system'),  -- MANAGER
(49, 5, NOW(), 'system'),  -- CLIENT
(49, 7, NOW(), 'system'),  -- AGENT
(49, 8, NOW(), 'system'),  -- MARKET_OWNER
(49, 9, NOW(), 'system'),  -- CEO
(49, 10, NOW(), 'system'), -- SECRETARY
(49, 11, NOW(), 'system'), -- ACCOUNTS_MANAGER
(49, 12, NOW(), 'system'), -- ACCOUNT_ASSISTANT;
```

---

## 3. ACCESS_HAS_APIS - RECOMMENDATIONS

For the "Get All Accesses" endpoint (api_id = 65), link to the access management feature:

```sql
-- Link Access Management to Get All Accesses API
INSERT INTO `access_has_apis` (`api_feature_ids`, `access_id`, `api_id`) VALUES
(JSON_ARRAY(1), 48, 65);
```

---

## 4. API_FEATURES - RECOMMENDATIONS

Consider adding these api_features for the "Get All Accesses" endpoint to support frontend filtering:

```sql
-- Optional: Add features for api_id = 65 (Get All Accesses)
INSERT INTO `api_features` (`api_id`, `feature`, `name`) VALUES
(65, 'list_front_access_control', 'List Front Access Control Features'),
(65, 'list_api_access_control', 'List API Access Control Features'),
(65, 'filter_by_access_level', 'Filter Accesses by Level'),
(65, 'filter_by_access_type', 'Filter Accesses by Type');
```

---

## 5. FEATURE MAPPING REFERENCE

### Dashboard & Management
| Feature | Access ID | Allowed Roles |
|---------|-----------|---------------|
| Dashboard | 25 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, CEO, SECRETARY, HR_MANAGER, HR_ASSISTANT, ACCOUNTS_MANAGER, ACCOUNT_ASSISTANT |
| Manage Users | 28 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, CEO, SECRETARY, HR_MANAGER, HR_ASSISTANT |
| Manage Roles | 29 | SUPER_ADMIN, ADMIN, OWNER |
| Career | 39 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, CEO, SECRETARY, HR_MANAGER, HR_ASSISTANT |

### Order Management
| Feature | Access ID | Allowed Roles |
|---------|-----------|---------------|
| View Placed Orders | 26 | SUPER_ADMIN, ADMIN, OWNER, MANAGER |
| Add Orders | 27 | SUPER_ADMIN, ADMIN, OWNER, MANAGER |
| Order Analytics | 38 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, CLIENT, MARKET_OWNER, CEO, ACCOUNTS_MANAGER, ACCOUNT_ASSISTANT |
| Order Checkout | 45 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, CLIENT, AGENT, MARKET_OWNER, CEO, SECRETARY |

### Market Management
| Feature | Access ID | Allowed Roles |
|---------|-----------|---------------|
| View Markets | 30 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, MARKETS_MANAGER |
| Market Categories | 31 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, MARKETS_MANAGER |
| Order Code Requests | 32 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, MARKETS_MANAGER |
| My Market - Products | 41 | ADMIN, OWNER, CLIENT, MARKET_OWNER |
| My Market - Categories | 42 | ADMIN, OWNER, CLIENT, MARKET_OWNER |
| Request for Market | 43 | ADMIN, OWNER, CLIENT, CUSTOMER |

### Employee Management
| Feature | Access ID | Allowed Roles |
|---------|-----------|---------------|
| Employee Assignments | 33 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, AGENT, CEO, SECRETARY |
| Urgent Jobs | 34 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, CEO, SECRETARY, HR_MANAGER, HR_ASSISTANT |
| Payment Handover | 35 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, ACCOUNTS_MANAGER, ACCOUNT_ASSISTANT |

### Financial & Support
| Feature | Access ID | Allowed Roles |
|---------|-----------|---------------|
| Accounts Panel | 36 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, ACCOUNTS_MANAGER, ACCOUNT_ASSISTANT |
| Delivery Fees | 37 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, ACCOUNTS_MANAGER, ACCOUNT_ASSISTANT |
| Complaints Management | 40 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, CLIENT, MARKET_OWNER |

### Universal Access
| Feature | Access ID | Allowed Roles |
|---------|-----------|---------------|
| Profile Panel | 44 | ALL ROLES |
| Receiving Orders | 46 | ALL ROLES |
| My Complaints | 47 | ALL ROLES |
| Delivery Fees View | 49 | SUPER_ADMIN, ADMIN, OWNER, MANAGER, CLIENT, AGENT, MARKET_OWNER, CEO, SECRETARY, ACCOUNTS_MANAGER, ACCOUNT_ASSISTANT |

### System Administration
| Feature | Access ID | Allowed Roles |
|---------|-----------|---------------|
| Access Management | 48 | OWNER |

---

## 6. IMPLEMENTATION NOTES

### Current State
- **Access IDs 1-24**: Already exist in your database
- **Access IDs 25-49**: New entries for frontend access control

### Frontend Integration
To use these accesses in your React components, use:
```typescript
import { checkAccess } from './util/AccessController';

// Check if user has access to a feature
if (checkAccess(25)) {  // Dashboard Access
  // Show dashboard
}
```

### User Roles (Reference)
```
1 = SUPER_ADMIN
2 = ADMIN
3 = OWNER
4 = MANAGER
5 = CLIENT
6 = CUSTOMER
7 = AGENT
8 = MARKET_OWNER
9 = CEO
10 = SECRETARY
11 = ACCOUNTS_MANAGER
12 = ACCOUNT_ASSISTANT
13 = HR_MANAGER
14 = HR_ASSISTANT
15 = MARKETS_MANAGER
```

### Access Levels
```
1 = Top Level (System administration features)
2 = Mid Level (Operational management features)
3 = Low Level (User-facing features)
```

---

## 7. EXECUTION STEPS

1. **Execute** the ACCESS table INSERT statement
2. **Execute** the ACCESS_HAS_USER_ROLES INSERT statement
3. **Execute** the ACCESS_HAS_APIS INSERT statement
4. **Optionally execute** the API_FEATURES INSERT statement
5. **Verify** data was inserted correctly:
   ```sql
   SELECT * FROM access WHERE id >= 25;
   SELECT COUNT(*) FROM access_has_user_roles;
   ```

---

**Note:** All timestamps use `NOW()` and all entries are created by 'system'. Adjust the `created_by` value if needed for audit trail purposes.
