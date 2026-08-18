# REST API Design Document
## IT Asset Lifecycle Management & Workflow Platform

Version 0.1 — Phase 2 deliverable (pre-implementation)

---

## Table of Contents

1. [Conventions](#1-conventions)
2. [Authentication API](#2-authentication-api)
3. [Users API](#3-users-api)
4. [Employees API](#4-employees-api)
5. [Assets API](#5-assets-api)
6. [Acquisitions API](#6-acquisitions-api)
7. [Allocations API](#7-allocations-api)
8. [Returns API](#8-returns-api)
9. [Assessments API](#9-assessments-api)
10. [Repairs API](#10-repairs-api)
11. [Disposals API](#11-disposals-api)
12. [Vendors API](#12-vendors-api)
13. [Master Data API](#13-master-data-api)
14. [Dashboard API](#14-dashboard-api)
15. [Reports API](#15-reports-api)
16. [Notifications API](#16-notifications-api)
17. [Search API](#17-search-api)
18. [Audit Logs API](#18-audit-logs-api)
19. [Compliance API](#19-compliance-api)
20. [Workflow Definitions API](#20-workflow-definitions-api)

---

## 1. Conventions

### 1.1 Base URL

```
/api/v1
```

All endpoints are prefixed with this base. Omitted from endpoint listings
for brevity — `POST /auth/login` means `POST /api/v1/auth/login`.

### 1.2 Authentication Header

Every endpoint except those marked **Public** requires:

```
Authorization: Bearer <access_token>
```

If missing or invalid the server returns `401`.

### 1.3 Standard Response Envelope

**Single resource:**

```json
{
  "data": { ... }
}
```

**Collection (paginated):**

```json
{
  "data": [ ... ],
  "meta": {
    "total": 142,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

**Empty success (no body):** `204 No Content`

### 1.4 Standard Error Envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary",
    "details": [
      {
        "field": "email",
        "constraint": "must be a valid email address"
      }
    ],
    "requestId": "req-abc123"
  }
}
```

### 1.5 Pagination Query Parameters

All list endpoints accept:

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `20` | Items per page (max 100) |
| `sort` | string | varies | Column to sort by |
| `order` | string | `desc` | `asc` or `desc` |

### 1.6 Common HTTP Status Codes

| Code | Meaning | When |
|---|---|---|
| `200` | OK | Successful GET, PATCH, PUT |
| `201` | Created | Successful POST that creates a resource |
| `204` | No Content | Successful DELETE or action with no response body |
| `400` | Bad Request | Validation failure, malformed body |
| `401` | Unauthorized | Missing/invalid/expired access token |
| `403` | Forbidden | Valid token but insufficient permissions |
| `404` | Not Found | Resource does not exist |
| `409` | Conflict | Optimistic lock failure, duplicate unique value |
| `422` | Unprocessable Entity | Business rule violation (e.g., invalid workflow transition) |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server failure |

### 1.7 Common Validation Rules

Referenced by shorthand in endpoint definitions:

| Shorthand | Rule |
|---|---|
| `uuid` | Valid UUID v4 format |
| `email` | RFC 5322 compliant email |
| `iso-date` | `YYYY-MM-DD` format |
| `iso-datetime` | ISO 8601 with timezone |
| `max:N` | Maximum N characters |
| `min:N` | Minimum N characters |
| `enum:a,b,c` | Must be one of listed values |
| `required` | Must be present and non-null |
| `optional` | May be omitted |
| `positive` | > 0 |
| `non-negative` | >= 0 |

### 1.8 Role Shorthand

| Shorthand | Role |
|---|---|
| `SA` | Super Admin |
| `ST` | Stores Officer |
| `IT` | IT Representative |
| `PC` | People & Culture |
| `EM` | Employee |

---

## 2. Authentication API

### 2.1 Login

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/auth/login` |
| **Purpose** | Authenticate user credentials, return JWT access token and refresh token |
| **Auth** | Public |
| **Permissions** | None |

**Request body:**

```json
{
  "email": "jane@company.com",
  "password": "s3cure_P@ss"
}
```

| Field | Type | Validation |
|---|---|---|
| `email` | string | required, email, max:255 |
| `password` | string | required, min:8, max:128 |

**Response `200 OK`:**

```json
{
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "dGhpcyBpcyBh...",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "email": "jane@company.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": {
        "id": "uuid",
        "name": "P&C"
      },
      "permissions": ["allocation:review", "allocation:sign", "employee:read", "..."]
    }
  }
}
```

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing or malformed fields |
| `401` | `INVALID_CREDENTIALS` | Email not found or password mismatch (same message for both to prevent user enumeration) |
| `403` | `ACCOUNT_DISABLED` | `is_active = false` |

---

### 2.2 Refresh Token

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/auth/refresh` |
| **Purpose** | Exchange a valid refresh token for a new access + refresh token pair (rotation) |
| **Auth** | Public (the refresh token itself is the credential) |
| **Permissions** | None |

**Request body:**

```json
{
  "refreshToken": "dGhpcyBpcyBh..."
}
```

| Field | Type | Validation |
|---|---|---|
| `refreshToken` | string | required, max:500 |

**Response `200 OK`:**

```json
{
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "bmV3IHRva2Vu...",
    "expiresIn": 900
  }
}
```

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `401` | `INVALID_REFRESH_TOKEN` | Token not found, already revoked, or expired |
| `401` | `TOKEN_REUSE_DETECTED` | Token was already consumed — all tokens for this user are revoked (security event) |

---

### 2.3 Logout

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/auth/logout` |
| **Purpose** | Revoke the current refresh token |
| **Auth** | Bearer token |
| **Permissions** | Any authenticated user |

**Request body:**

```json
{
  "refreshToken": "dGhpcyBpcyBh..."
}
```

**Response:** `204 No Content`

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `401` | `UNAUTHORIZED` | Invalid access token |

---

### 2.4 Get Current User

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/auth/me` |
| **Purpose** | Return the authenticated user's profile, role, and permissions |
| **Auth** | Bearer token |
| **Permissions** | Any authenticated user |

**Request body:** None

**Response `200 OK`:**

```json
{
  "data": {
    "id": "uuid",
    "email": "jane@company.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": {
      "id": "uuid",
      "name": "P&C"
    },
    "permissions": ["allocation:review", "..."],
    "employee": {
      "id": "uuid",
      "employeeCode": "EMP-0042",
      "department": "People & Culture",
      "designation": "HR Manager",
      "office": "Lagos HQ"
    }
  }
}
```

The `employee` object is `null` if the user has no linked employee record.

---

### 2.5 Change Password

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/auth/change-password` |
| **Purpose** | Change the authenticated user's own password |
| **Auth** | Bearer token |
| **Permissions** | Any authenticated user |

**Request body:**

```json
{
  "currentPassword": "old_P@ss",
  "newPassword": "new_S3cure!",
  "confirmPassword": "new_S3cure!"
}
```

| Field | Type | Validation |
|---|---|---|
| `currentPassword` | string | required |
| `newPassword` | string | required, min:8, max:128, must differ from currentPassword |
| `confirmPassword` | string | required, must match newPassword |

**Response:** `204 No Content`

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Password too short, mismatch, same as current |
| `401` | `INVALID_CREDENTIALS` | Current password incorrect |

---

## 3. Users API

### 3.1 List Users

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/users` |
| **Purpose** | List all user accounts with filtering and pagination |
| **Auth** | Bearer token |
| **Permissions** | `user:read` — SA |

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `role` | string | Filter by role name |
| `isActive` | boolean | Filter by active status |
| `search` | string | Search in email, firstName, lastName |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "jane@company.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": { "id": "uuid", "name": "P&C" },
      "isActive": true,
      "lastLoginAt": "2026-07-09T14:30:00Z",
      "createdAt": "2026-01-15T09:00:00Z"
    }
  ],
  "meta": { "total": 45, "page": 1, "limit": 20, "totalPages": 3 }
}
```

---

### 3.2 Create User

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/users` |
| **Purpose** | Create a new user account |
| **Auth** | Bearer token |
| **Permissions** | `user:manage` — SA |

**Request body:**

```json
{
  "email": "john@company.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "initial_P@ss1",
  "roleId": "uuid"
}
```

| Field | Type | Validation |
|---|---|---|
| `email` | string | required, email, max:255, unique |
| `firstName` | string | required, max:100 |
| `lastName` | string | required, max:100 |
| `password` | string | required, min:8, max:128 |
| `roleId` | string | required, uuid, must exist in roles table |

**Response `201 Created`:**

```json
{
  "data": {
    "id": "uuid",
    "email": "john@company.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": { "id": "uuid", "name": "Stores Officer" },
    "isActive": true,
    "createdAt": "2026-07-10T08:00:00Z"
  }
}
```

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing/invalid fields |
| `409` | `DUPLICATE_EMAIL` | Email already registered |
| `404` | `ROLE_NOT_FOUND` | roleId does not exist |

---

### 3.3 Get User

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/users/:id` |
| **Purpose** | Get a single user's details |
| **Auth** | Bearer token |
| **Permissions** | `user:read` — SA |

**Response `200 OK`:** Same shape as item in list response.

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `404` | `USER_NOT_FOUND` | User ID does not exist |

---

### 3.4 Update User

| | |
|---|---|
| **Method** | `PATCH` |
| **URL** | `/users/:id` |
| **Purpose** | Update user details (name, email, active status) |
| **Auth** | Bearer token |
| **Permissions** | `user:manage` — SA |

**Request body (all fields optional):**

```json
{
  "firstName": "Jonathan",
  "lastName": "Doe",
  "email": "jonathan@company.com",
  "isActive": false
}
```

| Field | Type | Validation |
|---|---|---|
| `firstName` | string | optional, max:100 |
| `lastName` | string | optional, max:100 |
| `email` | string | optional, email, max:255, unique |
| `isActive` | boolean | optional |

**Response `200 OK`:** Updated user object.

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `404` | `USER_NOT_FOUND` | User ID does not exist |
| `409` | `DUPLICATE_EMAIL` | New email already registered |

---

### 3.5 Change User Role

| | |
|---|---|
| **Method** | `PATCH` |
| **URL** | `/users/:id/role` |
| **Purpose** | Assign a different role to a user |
| **Auth** | Bearer token |
| **Permissions** | `user:manage` — SA |

**Request body:**

```json
{
  "roleId": "uuid"
}
```

| Field | Type | Validation |
|---|---|---|
| `roleId` | string | required, uuid, must exist |

**Response `200 OK`:** Updated user object.

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `404` | `USER_NOT_FOUND` | User ID does not exist |
| `404` | `ROLE_NOT_FOUND` | roleId does not exist |
| `422` | `CANNOT_DEMOTE_LAST_ADMIN` | Cannot remove the last Super Admin |

---

## 4. Employees API

### 4.1 List Employees

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/employees` |
| **Purpose** | List employees with filtering and pagination |
| **Auth** | Bearer token |
| **Permissions** | `employee:read` — SA, PC, ST, IT |

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `departmentId` | uuid | Filter by department |
| `officeId` | uuid | Filter by office |
| `employmentStatus` | string | Filter: `active`, `on_leave`, `terminated`, `resigned`, `transferred` |
| `search` | string | Search in name, email, employeeCode |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "employeeCode": "EMP-0042",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@company.com",
      "department": { "id": "uuid", "name": "Engineering" },
      "designation": "Software Engineer",
      "manager": { "id": "uuid", "firstName": "Bob", "lastName": "Jones" },
      "office": { "id": "uuid", "name": "Lagos HQ" },
      "employmentStatus": "active",
      "hireDate": "2024-03-15",
      "userId": "uuid",
      "createdAt": "2024-03-15T09:00:00Z"
    }
  ],
  "meta": { "total": 200, "page": 1, "limit": 20, "totalPages": 10 }
}
```

---

### 4.2 Create Employee

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/employees` |
| **Purpose** | Create a new employee record |
| **Auth** | Bearer token |
| **Permissions** | `employee:create` — SA, PC |

**Request body:**

```json
{
  "employeeCode": "EMP-0201",
  "firstName": "Alice",
  "lastName": "Ojo",
  "email": "alice@company.com",
  "departmentId": "uuid",
  "designation": "Product Manager",
  "managerId": "uuid",
  "officeId": "uuid",
  "hireDate": "2026-07-15",
  "userId": "uuid"
}
```

| Field | Type | Validation |
|---|---|---|
| `employeeCode` | string | required, max:50, unique |
| `firstName` | string | required, max:100 |
| `lastName` | string | required, max:100 |
| `email` | string | required, email, max:255, unique |
| `departmentId` | string | required, uuid, must exist |
| `designation` | string | required, max:100 |
| `managerId` | string | optional, uuid, must exist in employees |
| `officeId` | string | required, uuid, must exist |
| `hireDate` | string | required, iso-date |
| `userId` | string | optional, uuid, must exist in users, must not be linked to another employee |

**Response `201 Created`:** Employee object (same shape as list item).

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid fields |
| `409` | `DUPLICATE_EMPLOYEE_CODE` | Employee code already exists |
| `409` | `DUPLICATE_EMAIL` | Email already exists |
| `409` | `USER_ALREADY_LINKED` | userId is already linked to another employee |
| `404` | `DEPARTMENT_NOT_FOUND` | departmentId not found |
| `404` | `OFFICE_NOT_FOUND` | officeId not found |

---

### 4.3 Get Employee

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/employees/:id` |
| **Purpose** | Get full employee profile |
| **Auth** | Bearer token |
| **Permissions** | `employee:read` — SA, PC, ST, IT; EM can access own profile via `/auth/me` |

**Response `200 OK`:** Employee object with full detail including `terminationDate` if applicable.

---

### 4.4 Update Employee

| | |
|---|---|
| **Method** | `PATCH` |
| **URL** | `/employees/:id` |
| **Purpose** | Update employee details |
| **Auth** | Bearer token |
| **Permissions** | `employee:update` — SA, PC |

**Request body (all optional):**

```json
{
  "departmentId": "uuid",
  "designation": "Senior Product Manager",
  "managerId": "uuid",
  "officeId": "uuid",
  "employmentStatus": "on_leave"
}
```

| Field | Type | Validation |
|---|---|---|
| `firstName` | string | optional, max:100 |
| `lastName` | string | optional, max:100 |
| `email` | string | optional, email, max:255, unique |
| `departmentId` | string | optional, uuid, must exist |
| `designation` | string | optional, max:100 |
| `managerId` | string | optional, uuid, must exist in employees, cannot be self |
| `officeId` | string | optional, uuid, must exist |
| `employmentStatus` | string | optional, enum:active,on_leave,terminated,resigned,transferred |
| `terminationDate` | string | optional, iso-date, required when status becomes terminated/resigned |

**Response `200 OK`:** Updated employee object.

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `404` | `EMPLOYEE_NOT_FOUND` | Employee not found |
| `409` | `DUPLICATE_EMAIL` | New email already registered |
| `422` | `SELF_REFERENCING_MANAGER` | managerId equals employee's own ID |
| `422` | `TERMINATION_DATE_REQUIRED` | Status set to terminated/resigned without terminationDate |

---

### 4.5 Get Employee's Assigned Assets

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/employees/:id/assets` |
| **Purpose** | List all assets currently assigned to this employee |
| **Auth** | Bearer token |
| **Permissions** | `employee:read` — SA, PC, ST, IT; EM for own assets |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "assetTag": "AST-0042",
      "deviceType": "Laptop",
      "brand": "Lenovo",
      "model": "ThinkPad T14 Gen 3",
      "serialNumber": "PF3KL789",
      "status": "in_use",
      "allocatedAt": "2025-09-01T08:00:00Z",
      "accessories": [
        { "id": "uuid", "name": "Charger", "condition": "good" },
        { "id": "uuid", "name": "Laptop Bag", "condition": "good" }
      ]
    }
  ],
  "meta": { "total": 2, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 4.6 Get Employee's Asset History

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/employees/:id/history` |
| **Purpose** | Full timeline of all assets allocated to/returned by this employee |
| **Auth** | Bearer token |
| **Permissions** | `employee:read` — SA, PC, ST, IT; EM for own history |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "type": "allocation",
      "assetTag": "AST-0042",
      "assetModel": "ThinkPad T14 Gen 3",
      "action": "allocated",
      "date": "2025-09-01T08:00:00Z",
      "workflowInstanceId": "uuid"
    },
    {
      "type": "return",
      "assetTag": "AST-0018",
      "assetModel": "MacBook Pro 14",
      "action": "returned",
      "date": "2025-08-30T16:00:00Z",
      "reason": "replacement",
      "workflowInstanceId": "uuid"
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 50, "totalPages": 1 }
}
```

---

## 5. Assets API

### 5.1 List Assets

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/assets` |
| **Purpose** | List inventory with filtering, sorting, and pagination |
| **Auth** | Bearer token |
| **Permissions** | `asset:read` — SA, ST, IT, PC; EM sees own assigned assets only |

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `status` | string | Filter by status (comma-separated for multiple: `available,reserved`) |
| `deviceTypeId` | uuid | Filter by device type |
| `brandId` | uuid | Filter by brand |
| `departmentId` | uuid | Filter by department |
| `officeId` | uuid | Filter by office |
| `vendorId` | uuid | Filter by vendor |
| `currentHolderId` | uuid | Filter by current holder |
| `warrantyExpiring` | boolean | If `true`, filter assets with warranty expiring within 30 days |
| `search` | string | Search in assetTag, serialNumber, imei, model |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "assetTag": "AST-0042",
      "serialNumber": "PF3KL789",
      "imei": null,
      "deviceType": { "id": "uuid", "name": "Laptop" },
      "brand": { "id": "uuid", "name": "Lenovo" },
      "model": "ThinkPad T14 Gen 3",
      "status": "in_use",
      "currentHolder": {
        "id": "uuid",
        "employeeCode": "EMP-0042",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "department": { "id": "uuid", "name": "Engineering" },
      "office": { "id": "uuid", "name": "Lagos HQ" },
      "purchaseAmount": 450000.00,
      "purchaseCurrency": "NGN",
      "purchaseDate": "2025-06-01",
      "warrantyExpiryDate": "2027-06-01",
      "createdAt": "2025-06-15T09:00:00Z"
    }
  ],
  "meta": { "total": 350, "page": 1, "limit": 20, "totalPages": 18 }
}
```

---

### 5.2 Create Asset (Register)

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/assets` |
| **Purpose** | Register a new asset in inventory |
| **Auth** | Bearer token |
| **Permissions** | `asset:create` — SA, ST |

**Request body:**

```json
{
  "assetTag": "AST-0350",
  "serialNumber": "PF3KL789",
  "imei": null,
  "deviceTypeId": "uuid",
  "brandId": "uuid",
  "model": "ThinkPad T14 Gen 3",
  "departmentId": "uuid",
  "officeId": "uuid",
  "purchaseAmount": 450000.00,
  "purchaseCurrency": "NGN",
  "purchaseDate": "2025-06-01",
  "vendorId": "uuid",
  "warrantyExpiryDate": "2027-06-01",
  "notes": "Procured for Engineering team expansion",
  "accessories": [
    { "name": "65W USB-C Charger", "serialNumber": "CHG-001" },
    { "name": "Laptop Bag" }
  ]
}
```

| Field | Type | Validation |
|---|---|---|
| `assetTag` | string | required, max:50, unique |
| `serialNumber` | string | optional, max:100, unique if provided |
| `imei` | string | optional, max:20, unique if provided |
| `deviceTypeId` | string | required, uuid, must exist |
| `brandId` | string | required, uuid, must exist |
| `model` | string | required, max:100 |
| `departmentId` | string | optional, uuid, must exist |
| `officeId` | string | optional, uuid, must exist |
| `purchaseAmount` | number | optional, non-negative |
| `purchaseCurrency` | string | optional, max:3, default `NGN` |
| `purchaseDate` | string | optional, iso-date |
| `vendorId` | string | optional, uuid, must exist |
| `warrantyExpiryDate` | string | optional, iso-date, must be after purchaseDate |
| `notes` | string | optional |
| `accessories` | array | optional, array of accessory objects |
| `accessories[].name` | string | required, max:100 |
| `accessories[].serialNumber` | string | optional, max:100 |

Asset is created with `status = "registered"`.

**Response `201 Created`:** Full asset object including generated ID and accessories.

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid fields |
| `409` | `DUPLICATE_ASSET_TAG` | Asset tag already exists |
| `409` | `DUPLICATE_SERIAL_NUMBER` | Serial number already exists |
| `409` | `DUPLICATE_IMEI` | IMEI already exists |
| `404` | `DEVICE_TYPE_NOT_FOUND` | deviceTypeId not found |
| `404` | `BRAND_NOT_FOUND` | brandId not found |

---

### 5.3 Get Asset

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/assets/:id` |
| **Purpose** | Get full asset details including accessories and current holder |
| **Auth** | Bearer token |
| **Permissions** | `asset:read` — SA, ST, IT, PC; EM for own assigned assets |

**Response `200 OK`:**

```json
{
  "data": {
    "id": "uuid",
    "assetTag": "AST-0042",
    "serialNumber": "PF3KL789",
    "imei": null,
    "deviceType": { "id": "uuid", "name": "Laptop" },
    "brand": { "id": "uuid", "name": "Lenovo" },
    "model": "ThinkPad T14 Gen 3",
    "status": "in_use",
    "currentHolder": {
      "id": "uuid",
      "employeeCode": "EMP-0042",
      "firstName": "Jane",
      "lastName": "Smith",
      "department": "Engineering"
    },
    "department": { "id": "uuid", "name": "Engineering" },
    "office": { "id": "uuid", "name": "Lagos HQ" },
    "purchaseAmount": 450000.00,
    "purchaseCurrency": "NGN",
    "purchaseDate": "2025-06-01",
    "vendor": { "id": "uuid", "name": "Lenovo Nigeria" },
    "warrantyExpiryDate": "2027-06-01",
    "notes": "Procured for Engineering team expansion",
    "version": 3,
    "accessories": [
      { "id": "uuid", "name": "65W USB-C Charger", "serialNumber": "CHG-001", "condition": "good" },
      { "id": "uuid", "name": "Laptop Bag", "serialNumber": null, "condition": "good" }
    ],
    "createdAt": "2025-06-15T09:00:00Z",
    "updatedAt": "2026-01-10T14:30:00Z"
  }
}
```

---

### 5.4 Update Asset

| | |
|---|---|
| **Method** | `PATCH` |
| **URL** | `/assets/:id` |
| **Purpose** | Update asset metadata (not status — status changes go through workflows) |
| **Auth** | Bearer token |
| **Permissions** | `asset:update` — SA, ST |

**Request body (all optional):**

```json
{
  "model": "ThinkPad T14 Gen 4",
  "departmentId": "uuid",
  "officeId": "uuid",
  "warrantyExpiryDate": "2028-06-01",
  "notes": "Updated model designation after manufacturer correction",
  "version": 3
}
```

| Field | Type | Validation |
|---|---|---|
| `assetTag` | string | optional, max:50, unique |
| `serialNumber` | string | optional, max:100, unique |
| `imei` | string | optional, max:20, unique |
| `model` | string | optional, max:100 |
| `departmentId` | string | optional, uuid, must exist |
| `officeId` | string | optional, uuid, must exist |
| `vendorId` | string | optional, uuid, must exist |
| `warrantyExpiryDate` | string | optional, iso-date |
| `notes` | string | optional |
| `version` | integer | required, must match current version (optimistic lock) |

**Response `200 OK`:** Updated asset object with incremented `version`.

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `404` | `ASSET_NOT_FOUND` | Asset not found |
| `409` | `VERSION_CONFLICT` | version does not match — another user modified the asset concurrently |
| `409` | `DUPLICATE_ASSET_TAG` | New asset tag already exists |

---

### 5.5 Get Asset History

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/assets/:id/history` |
| **Purpose** | Full status-change timeline for an asset |
| **Auth** | Bearer token |
| **Permissions** | `asset:read` — SA, ST, IT, PC |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "fromStatus": "available",
      "toStatus": "allocated",
      "changedBy": { "id": "uuid", "firstName": "Admin", "lastName": "User" },
      "reason": "Allocation workflow completed",
      "workflowInstanceId": "uuid",
      "changedAt": "2025-09-01T08:00:00Z"
    }
  ],
  "meta": { "total": 4, "page": 1, "limit": 50, "totalPages": 1 }
}
```

---

### 5.6 List Asset Accessories

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/assets/:id/accessories` |
| **Purpose** | List accessories for a specific asset |
| **Auth** | Bearer token |
| **Permissions** | `asset:read` — SA, ST, IT, PC |

**Response `200 OK`:**

```json
{
  "data": [
    { "id": "uuid", "name": "65W USB-C Charger", "serialNumber": "CHG-001", "condition": "good", "notes": null }
  ]
}
```

---

### 5.7 Add Accessory

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/assets/:id/accessories` |
| **Purpose** | Add an accessory to an asset |
| **Auth** | Bearer token |
| **Permissions** | `asset:update` — SA, ST |

**Request body:**

```json
{
  "name": "Wireless Mouse",
  "serialNumber": "MS-042",
  "condition": "good",
  "notes": "Logitech MX Master 3"
}
```

| Field | Type | Validation |
|---|---|---|
| `name` | string | required, max:100 |
| `serialNumber` | string | optional, max:100 |
| `condition` | string | optional, enum:good,fair,damaged,missing, default `good` |
| `notes` | string | optional |

**Response `201 Created`:** Accessory object.

---

### 5.8 Generate Barcode / QR Code

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/assets/:id/barcode` |
| **Purpose** | Generate a barcode or QR code image for the asset tag |
| **Auth** | Bearer token |
| **Permissions** | `asset:read` — SA, ST, IT |

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `format` | string | `qr` | `qr` or `barcode` (Code 128) |
| `size` | integer | `200` | Image dimension in pixels (max 500) |

**Response `200 OK`:**

Headers: `Content-Type: image/png`

Body: PNG image binary.

---

## 6. Acquisitions API

### 6.1 List Acquisitions

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/acquisitions` |
| **Purpose** | List procurement records |
| **Auth** | Bearer token |
| **Permissions** | `asset:read` — SA, ST |

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `vendorId` | uuid | Filter by vendor |
| `dateFrom` | iso-date | Purchase date range start |
| `dateTo` | iso-date | Purchase date range end |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "asset": { "id": "uuid", "assetTag": "AST-0042", "model": "ThinkPad T14 Gen 3" },
      "purchaseDate": "2025-06-01",
      "vendor": { "id": "uuid", "name": "Lenovo Nigeria" },
      "purchaseAmount": 450000.00,
      "purchaseCurrency": "NGN",
      "invoiceNumber": "INV-2025-0042",
      "facilitatedBy": { "id": "uuid", "firstName": "Admin", "lastName": "User" },
      "conditionOnReceipt": "new",
      "createdAt": "2025-06-15T09:00:00Z"
    }
  ],
  "meta": { "total": 50, "page": 1, "limit": 20, "totalPages": 3 }
}
```

---

### 6.2 Create Acquisition

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/acquisitions` |
| **Purpose** | Record a procurement and optionally register the asset simultaneously |
| **Auth** | Bearer token |
| **Permissions** | `asset:create` — SA, ST |

**Request body:**

```json
{
  "assetId": "uuid",
  "purchaseDate": "2025-06-01",
  "vendorId": "uuid",
  "purchaseAmount": 450000.00,
  "purchaseCurrency": "NGN",
  "invoiceNumber": "INV-2025-0042",
  "conditionOnReceipt": "new",
  "warrantyTerms": "2-year manufacturer warranty covering hardware defects",
  "notes": "Part of Q2 procurement batch"
}
```

| Field | Type | Validation |
|---|---|---|
| `assetId` | string | required, uuid, must exist, must not already have an acquisition |
| `purchaseDate` | string | required, iso-date |
| `vendorId` | string | required, uuid, must exist |
| `purchaseAmount` | number | required, non-negative |
| `purchaseCurrency` | string | optional, max:3, default `NGN` |
| `invoiceNumber` | string | optional, max:100 |
| `conditionOnReceipt` | string | optional, enum:new,refurbished,used, default `new` |
| `warrantyTerms` | string | optional |
| `notes` | string | optional |

Also updates the linked asset's `purchaseAmount`, `purchaseDate`, `vendorId` fields.

**Response `201 Created`:** Acquisition object.

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `404` | `ASSET_NOT_FOUND` | assetId not found |
| `409` | `ACQUISITION_EXISTS` | Asset already has an acquisition record |

---

### 6.3 Get Acquisition

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/acquisitions/:id` |
| **Purpose** | Get full procurement record |
| **Auth** | Bearer token |
| **Permissions** | `asset:read` — SA, ST |

**Response `200 OK`:** Acquisition object with full vendor and asset detail.

---

## 7. Allocations API

### 7.1 List Allocation Requests

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/allocations` |
| **Purpose** | List allocation requests with status filtering |
| **Auth** | Bearer token |
| **Permissions** | `allocation:read` — SA, ST, IT, PC; EM sees own requests only |

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `status` | string | Filter: `pending`, `in_progress`, `completed`, `cancelled` |
| `requestType` | string | Filter: `new_device`, `repair`, `replacement`, `additional_device`, `accessory` |
| `employeeId` | uuid | Filter by requesting employee |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "employee": { "id": "uuid", "employeeCode": "EMP-0042", "firstName": "Jane", "lastName": "Smith" },
      "requestType": "new_device",
      "justification": "New hire equipment provisioning",
      "requestedAsset": null,
      "selectedAsset": { "id": "uuid", "assetTag": "AST-0042", "model": "ThinkPad T14 Gen 3" },
      "status": "in_progress",
      "workflow": {
        "id": "uuid",
        "currentStage": { "id": "uuid", "name": "IT Assessment", "code": "it_assessment" },
        "status": "active"
      },
      "createdAt": "2026-07-01T08:00:00Z",
      "updatedAt": "2026-07-03T14:00:00Z"
    }
  ],
  "meta": { "total": 12, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 7.2 Submit Allocation Request

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/allocations` |
| **Purpose** | Submit a new asset allocation request (starts the allocation workflow) |
| **Auth** | Bearer token |
| **Permissions** | `allocation:request` — SA, EM |

**Request body:**

```json
{
  "requestType": "new_device",
  "justification": "New hire — need laptop for onboarding on 2026-07-15",
  "requestedAssetId": null
}
```

| Field | Type | Validation |
|---|---|---|
| `requestType` | string | required, enum:new_device,repair,replacement,additional_device,accessory |
| `justification` | string | required, min:10, max:2000 |
| `requestedAssetId` | string | optional, uuid, must exist, must be in `available` or `returned` status |

The server automatically:
1. Creates the `allocation_requests` record linked to the authenticated user's employee profile.
2. Creates a `workflow_instance` using the "allocation" workflow definition.
3. Transitions the workflow to its first stage.
4. Emits domain events (triggers notifications to P&C).

**Response `201 Created`:**

```json
{
  "data": {
    "id": "uuid",
    "employee": { "id": "uuid", "employeeCode": "EMP-0042", "firstName": "Jane", "lastName": "Smith" },
    "requestType": "new_device",
    "justification": "New hire — need laptop for onboarding on 2026-07-15",
    "requestedAsset": null,
    "selectedAsset": null,
    "status": "pending",
    "workflow": {
      "id": "uuid",
      "currentStage": { "id": "uuid", "name": "P&C Review", "code": "pc_review" },
      "status": "active"
    },
    "createdAt": "2026-07-10T08:00:00Z"
  }
}
```

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid fields |
| `422` | `NO_EMPLOYEE_PROFILE` | Authenticated user has no linked employee record |
| `422` | `ASSET_NOT_AVAILABLE` | Requested asset is not in available/returned status |

---

### 7.3 Get Allocation Request

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/allocations/:id` |
| **Purpose** | Get full allocation request with workflow state and transition history |
| **Auth** | Bearer token |
| **Permissions** | `allocation:read` — SA, ST, IT, PC; EM for own request |

**Response `200 OK`:**

```json
{
  "data": {
    "id": "uuid",
    "employee": { "id": "uuid", "employeeCode": "EMP-0042", "firstName": "Jane", "lastName": "Smith", "department": "Engineering" },
    "requestType": "new_device",
    "justification": "New hire — need laptop for onboarding on 2026-07-15",
    "requestedAsset": null,
    "selectedAsset": { "id": "uuid", "assetTag": "AST-0042", "model": "ThinkPad T14 Gen 3" },
    "status": "in_progress",
    "workflow": {
      "id": "uuid",
      "definitionName": "Asset Allocation",
      "currentStage": { "id": "uuid", "name": "IT Assessment", "code": "it_assessment", "requiredRole": "IT Representative" },
      "status": "active",
      "isBypassed": false,
      "transitions": [
        {
          "id": "uuid",
          "fromStage": null,
          "toStage": { "name": "P&C Review", "code": "pc_review" },
          "performedBy": { "id": "uuid", "firstName": "Jane", "lastName": "Smith" },
          "performedAt": "2026-07-01T08:00:00Z",
          "reason": null,
          "isBypass": false
        },
        {
          "id": "uuid",
          "fromStage": { "name": "P&C Review", "code": "pc_review" },
          "toStage": { "name": "Stores Select Asset", "code": "stores_select" },
          "performedBy": { "id": "uuid", "firstName": "HR", "lastName": "Manager" },
          "performedAt": "2026-07-02T10:00:00Z",
          "reason": "Approved — new hire provisioning",
          "isBypass": false
        },
        {
          "id": "uuid",
          "fromStage": { "name": "Stores Select Asset", "code": "stores_select" },
          "toStage": { "name": "IT Assessment", "code": "it_assessment" },
          "performedBy": { "id": "uuid", "firstName": "Stores", "lastName": "Officer" },
          "performedAt": "2026-07-03T14:00:00Z",
          "reason": null,
          "payload": { "selectedAssetId": "uuid" },
          "isBypass": false
        }
      ],
      "createdAt": "2026-07-01T08:00:00Z"
    },
    "createdAt": "2026-07-01T08:00:00Z",
    "updatedAt": "2026-07-03T14:00:00Z"
  }
}
```

---

### 7.4 Advance Allocation Workflow (Transition)

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/allocations/:id/transition` |
| **Purpose** | Advance the allocation workflow to the next stage |
| **Auth** | Bearer token |
| **Permissions** | Depends on the target stage's `required_role` — the workflow engine validates this dynamically |

**Request body:**

```json
{
  "targetStageCode": "stores_select",
  "payload": {
    "selectedAssetId": "uuid"
  },
  "signature": {
    "fullName": "Jane Smith",
    "consent": true
  },
  "reason": "Approved — standard provisioning request"
}
```

| Field | Type | Validation |
|---|---|---|
| `targetStageCode` | string | required, must be a valid next stage from current stage |
| `payload` | object | optional, stage-specific data |
| `payload.selectedAssetId` | string | required for `stores_select` stage, uuid, must exist, must be in `available` status |
| `signature` | object | required if stage has `requires_signature = true` |
| `signature.fullName` | string | required within signature, max:200 |
| `signature.consent` | boolean | required within signature, must be `true` |
| `reason` | string | optional (required for bypass or rejection) |

**Stage-specific payload requirements:**

| Stage Code | Required Payload | Validation |
|---|---|---|
| `pc_review` | none | |
| `stores_select` | `selectedAssetId` | Asset must exist, status must be `available` |
| `it_assessment` | `assessmentId` | Assessment must exist for the selected asset |
| `employee_signature` | `signature` | Must include fullName + consent |
| `pc_signature` | `signature` | Must include fullName + consent |
| `it_signature` | `signature` | Must include fullName + consent |

**Response `200 OK`:**

```json
{
  "data": {
    "transition": {
      "id": "uuid",
      "fromStage": { "name": "P&C Review", "code": "pc_review" },
      "toStage": { "name": "Stores Select Asset", "code": "stores_select" },
      "performedBy": { "id": "uuid", "firstName": "HR", "lastName": "Manager" },
      "performedAt": "2026-07-10T09:30:00Z"
    },
    "workflow": {
      "currentStage": { "id": "uuid", "name": "Stores Select Asset", "code": "stores_select" },
      "status": "active"
    },
    "allocation": {
      "id": "uuid",
      "status": "in_progress"
    }
  }
}
```

When the final stage completes, `workflow.status` becomes `completed`, `allocation.status` becomes `completed`, and the asset's status is updated to `allocated` / `in_use` with `currentHolderId` set.

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `403` | `INSUFFICIENT_ROLE` | User's role does not match the target stage's required_role |
| `404` | `ALLOCATION_NOT_FOUND` | Allocation request not found |
| `422` | `INVALID_TRANSITION` | Target stage is not a valid next step from current stage |
| `422` | `WORKFLOW_NOT_ACTIVE` | Workflow is completed, cancelled, or suspended |
| `422` | `SIGNATURE_REQUIRED` | Stage requires signature but none provided |
| `422` | `ASSET_NOT_AVAILABLE` | Selected asset is no longer available (race condition, handled by optimistic lock) |
| `422` | `ASSESSMENT_REQUIRED` | IT Assessment stage requires a completed assessment |
| `409` | `VERSION_CONFLICT` | Concurrent modification of the workflow instance |

---

### 7.5 Cancel Allocation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/allocations/:id/cancel` |
| **Purpose** | Cancel an in-progress allocation request |
| **Auth** | Bearer token |
| **Permissions** | `allocation:cancel` — SA, PC; EM can cancel own request if still at `pc_review` stage |

**Request body:**

```json
{
  "reason": "Employee withdrew the request"
}
```

| Field | Type | Validation |
|---|---|---|
| `reason` | string | required, min:5, max:1000 |

**Response `200 OK`:**

```json
{
  "data": {
    "id": "uuid",
    "status": "cancelled",
    "workflow": { "status": "cancelled" },
    "cancelledAt": "2026-07-10T09:00:00Z"
  }
}
```

If an asset had been reserved (stores_select completed), the reservation is released (status returns to `available`).

---

## 8. Returns API

### 8.1 List Returns

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/returns` |
| **Purpose** | List return records |
| **Auth** | Bearer token |
| **Permissions** | `return:read` — SA, ST, IT, PC; EM sees own returns |

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `status` | string | Filter: `pending`, `in_progress`, `completed`, `cancelled` |
| `reason` | string | Filter by reason |
| `employeeId` | uuid | Filter by employee |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "employee": { "id": "uuid", "employeeCode": "EMP-0042", "firstName": "Jane", "lastName": "Smith" },
      "reason": "resignation",
      "status": "in_progress",
      "damageNotes": null,
      "items": [
        {
          "id": "uuid",
          "asset": { "id": "uuid", "assetTag": "AST-0042", "model": "ThinkPad T14 Gen 3" },
          "condition": "good",
          "isReturned": true,
          "missingItems": null
        }
      ],
      "workflow": {
        "id": "uuid",
        "currentStage": { "name": "IT Assessment", "code": "it_assessment" },
        "status": "active"
      },
      "createdAt": "2026-07-05T08:00:00Z"
    }
  ],
  "meta": { "total": 8, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 8.2 Initiate Return

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/returns` |
| **Purpose** | Initiate an asset return workflow |
| **Auth** | Bearer token |
| **Permissions** | `return:initiate` — SA, PC |

**Request body:**

```json
{
  "employeeId": "uuid",
  "reason": "resignation",
  "items": [
    {
      "assetId": "uuid",
      "condition": "good",
      "isReturned": true,
      "missingItems": null,
      "notes": null
    },
    {
      "assetId": "uuid",
      "condition": "damaged",
      "isReturned": true,
      "missingItems": "Charger missing",
      "notes": "Screen has a crack in the bottom left corner"
    }
  ],
  "damageNotes": "One device has screen damage"
}
```

| Field | Type | Validation |
|---|---|---|
| `employeeId` | string | required, uuid, must exist, must have assigned assets |
| `reason` | string | required, enum:resignation,termination,transfer,replacement,repair,lost,other |
| `items` | array | required, min 1 item |
| `items[].assetId` | string | required, uuid, must be assigned to the specified employee |
| `items[].condition` | string | required, enum:good,fair,damaged,not_working |
| `items[].isReturned` | boolean | required |
| `items[].missingItems` | string | optional |
| `items[].notes` | string | optional |
| `damageNotes` | string | optional |

**Response `201 Created`:** Return record with workflow details.

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `404` | `EMPLOYEE_NOT_FOUND` | Employee not found |
| `422` | `ASSET_NOT_ASSIGNED` | One or more assets are not assigned to this employee |
| `422` | `NO_ITEMS` | Empty items array |

---

### 8.3 Get Return Record

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/returns/:id` |
| **Purpose** | Get full return record with items, workflow state, and transitions |
| **Auth** | Bearer token |
| **Permissions** | `return:read` — SA, ST, IT, PC; EM for own return |

**Response `200 OK`:** Return record with all items, workflow transitions, and file attachments (photos).

---

### 8.4 Advance Return Workflow

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/returns/:id/transition` |
| **Purpose** | Advance the return workflow to the next stage |
| **Auth** | Bearer token |
| **Permissions** | Dynamic per stage (same as §7.4) |

**Request body:** Same structure as §7.4 (transition endpoint).

Stage-specific payloads for return workflow:

| Stage Code | Required Payload |
|---|---|
| `stores_receive` | none (confirms physical receipt) |
| `it_assessment` | `assessmentId` — completed device assessment |
| `employee_signature` | `signature` |
| `pc_signature` | `signature` |

On completion: each returned item's asset status changes from `allocated`/`in_use` to `returned`, then `available` (if condition is good) or `under_repair` (if damaged). `currentHolderId` is cleared.

**Error responses:** Same as §7.4.

---

### 8.5 Upload Return Photos

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/returns/:id/files` |
| **Purpose** | Upload damage/evidence photos for a return |
| **Auth** | Bearer token |
| **Permissions** | `return:update` — SA, ST, PC |

**Request:** `multipart/form-data`

| Field | Type | Validation |
|---|---|---|
| `file` | binary | required, max 10MB, mime: image/jpeg, image/png, application/pdf |

**Response `201 Created`:**

```json
{
  "data": {
    "id": "uuid",
    "fileName": "damage-photo.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 245000,
    "url": "/api/v1/files/uuid",
    "createdAt": "2026-07-10T09:00:00Z"
  }
}
```

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `400` | `INVALID_FILE_TYPE` | Unsupported mime type |
| `400` | `FILE_TOO_LARGE` | Exceeds 10MB limit |

---

## 9. Assessments API

### 9.1 List Assessments

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/assessments` |
| **Purpose** | List device assessments |
| **Auth** | Bearer token |
| **Permissions** | `assessment:read` — SA, IT, ST |

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `assetId` | uuid | Filter by asset |
| `disposition` | string | Filter: `pass`, `repair_recommended`, `replacement_recommended`, `reject` |
| `assessedById` | uuid | Filter by assessor |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "asset": { "id": "uuid", "assetTag": "AST-0042", "model": "ThinkPad T14 Gen 3" },
      "assessedBy": { "id": "uuid", "firstName": "Tech", "lastName": "Rep" },
      "disposition": "pass",
      "technicianNotes": "All components functional. OS up to date.",
      "workflowInstanceId": "uuid",
      "assessedAt": "2026-07-03T14:30:00Z",
      "checklistSummary": { "pass": 20, "fail": 0, "notApplicable": 3 }
    }
  ],
  "meta": { "total": 30, "page": 1, "limit": 20, "totalPages": 2 }
}
```

---

### 9.2 Create Assessment

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/assessments` |
| **Purpose** | Create a new device assessment with checklist |
| **Auth** | Bearer token |
| **Permissions** | `assessment:create` — SA, IT |

**Request body:**

```json
{
  "assetId": "uuid",
  "workflowInstanceId": "uuid",
  "disposition": "pass",
  "technicianNotes": "All components functional. OS up to date. Antivirus current.",
  "checklist": [
    { "component": "screen", "status": "pass", "notes": null },
    { "component": "keyboard", "status": "pass", "notes": null },
    { "component": "battery", "status": "pass", "notes": "92% health" },
    { "component": "charger", "status": "pass", "notes": null },
    { "component": "mouse", "status": "not_applicable", "notes": "No external mouse" },
    { "component": "bag", "status": "pass", "notes": null },
    { "component": "webcam", "status": "pass", "notes": null },
    { "component": "microphone", "status": "pass", "notes": null },
    { "component": "speakers", "status": "pass", "notes": null },
    { "component": "usb_ports", "status": "pass", "notes": "All 3 ports working" },
    { "component": "hdmi", "status": "pass", "notes": null },
    { "component": "wifi", "status": "pass", "notes": null },
    { "component": "bluetooth", "status": "pass", "notes": null },
    { "component": "storage", "status": "pass", "notes": "256GB SSD, 180GB free" },
    { "component": "ram", "status": "pass", "notes": "16GB" },
    { "component": "os", "status": "pass", "notes": "Windows 11 Pro 23H2" },
    { "component": "antivirus", "status": "pass", "notes": "CrowdStrike active" },
    { "component": "encryption", "status": "pass", "notes": "BitLocker enabled" },
    { "component": "asset_sticker", "status": "pass", "notes": null },
    { "component": "water_damage", "status": "pass", "notes": "No signs" },
    { "component": "physical_damage", "status": "pass", "notes": "No damage" },
    { "component": "missing_components", "status": "pass", "notes": "All present" },
    { "component": "boots_successfully", "status": "pass", "notes": null }
  ]
}
```

| Field | Type | Validation |
|---|---|---|
| `assetId` | string | required, uuid, must exist |
| `workflowInstanceId` | string | optional, uuid, must exist if provided |
| `disposition` | string | required, enum:pass,repair_recommended,replacement_recommended,reject |
| `technicianNotes` | string | optional |
| `checklist` | array | required, min 1 item |
| `checklist[].component` | string | required, enum of 23 defined components |
| `checklist[].status` | string | required, enum:pass,fail,not_applicable |
| `checklist[].notes` | string | optional |

**Validation rules:**
- If any checklist item has `status: "fail"`, `disposition` cannot be `pass`.
- Each component may appear at most once.
- At least the required components (screen, keyboard, battery, boots_successfully) must be present.

**Response `201 Created`:** Assessment with checklist.

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `404` | `ASSET_NOT_FOUND` | Asset not found |
| `422` | `DISPOSITION_MISMATCH` | Disposition is `pass` but checklist has failures |
| `422` | `DUPLICATE_COMPONENT` | Same component listed twice |
| `422` | `REQUIRED_COMPONENTS_MISSING` | Mandatory checklist components not provided |

---

### 9.3 Get Assessment

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/assessments/:id` |
| **Purpose** | Get full assessment with complete checklist |
| **Auth** | Bearer token |
| **Permissions** | `assessment:read` — SA, IT, ST |

**Response `200 OK`:** Assessment object with full `checklist` array and asset details.

---

## 10. Repairs API

### 10.1 List Repairs

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/repairs` |
| **Purpose** | List repair records |
| **Auth** | Bearer token |
| **Permissions** | `repair:read` — SA, ST, IT |

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `assetId` | uuid | Filter by asset |
| `repairStatus` | string | Filter: `reported`, `diagnosed`, `in_progress`, `awaiting_parts`, `completed`, `cancelled` |
| `assignedTechnicianId` | uuid | Filter by technician |
| `vendorId` | uuid | Filter by repair vendor |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "asset": { "id": "uuid", "assetTag": "AST-0018", "model": "MacBook Pro 14" },
      "reportedBy": { "id": "uuid", "firstName": "Jane", "lastName": "Smith" },
      "faultDescription": "Screen flickering intermittently under load",
      "assignedTechnician": { "id": "uuid", "firstName": "Tech", "lastName": "Rep" },
      "vendor": null,
      "repairStatus": "in_progress",
      "cost": null,
      "estimatedCompletion": "2026-07-20",
      "completedAt": null,
      "createdAt": "2026-07-05T08:00:00Z"
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 10.2 Create Repair Record

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/repairs` |
| **Purpose** | Create a repair record for an asset |
| **Auth** | Bearer token |
| **Permissions** | `repair:create` — SA, IT, ST |

**Request body:**

```json
{
  "assetId": "uuid",
  "faultDescription": "Screen flickering intermittently under load",
  "assignedTechnicianId": "uuid",
  "vendorId": null,
  "estimatedCompletion": "2026-07-20"
}
```

| Field | Type | Validation |
|---|---|---|
| `assetId` | string | required, uuid, must exist |
| `faultDescription` | string | required, min:10, max:2000 |
| `assignedTechnicianId` | string | optional, uuid, must exist, must have IT role |
| `vendorId` | string | optional, uuid, must exist |
| `estimatedCompletion` | string | optional, iso-date, must be in future |

The asset's status changes to `under_repair`. A repair workflow instance is created.

**Response `201 Created`:** Repair record with workflow details.

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `404` | `ASSET_NOT_FOUND` | Asset not found |
| `422` | `INVALID_ASSET_STATUS` | Asset cannot be sent for repair from its current status |

---

### 10.3 Get Repair

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/repairs/:id` |
| **Purpose** | Get full repair record with workflow |
| **Auth** | Bearer token |
| **Permissions** | `repair:read` — SA, ST, IT |

---

### 10.4 Update Repair

| | |
|---|---|
| **Method** | `PATCH` |
| **URL** | `/repairs/:id` |
| **Purpose** | Update repair details (status, cost, vendor, completion) |
| **Auth** | Bearer token |
| **Permissions** | `repair:update` — SA, IT |

**Request body (all optional):**

```json
{
  "repairStatus": "completed",
  "cost": 35000.00,
  "costCurrency": "NGN",
  "vendorId": "uuid",
  "assignedTechnicianId": "uuid",
  "estimatedCompletion": "2026-07-18"
}
```

| Field | Type | Validation |
|---|---|---|
| `repairStatus` | string | optional, enum:reported,diagnosed,in_progress,awaiting_parts,completed,cancelled |
| `cost` | number | optional, non-negative |
| `costCurrency` | string | optional, max:3 |
| `vendorId` | string | optional, uuid, must exist |
| `assignedTechnicianId` | string | optional, uuid, must exist |
| `estimatedCompletion` | string | optional, iso-date |

When `repairStatus` is set to `completed`, the asset's status changes from `under_repair` back to `available` or `returned` (depending on whether it was allocated before repair).

**Response `200 OK`:** Updated repair record.

---

## 11. Disposals API

### 11.1 List Disposals

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/disposals` |
| **Purpose** | List disposal records |
| **Auth** | Bearer token |
| **Permissions** | `disposal:read` — SA, ST |

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `status` | string | Filter: `pending`, `approved`, `completed`, `rejected` |
| `method` | string | Filter: `recycled`, `donated`, `destroyed`, `sold`, `returned_to_vendor` |

**Response `200 OK`:** Paginated list of disposal records with asset and approver details.

---

### 11.2 Request Disposal

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/disposals` |
| **Purpose** | Submit a disposal request for an asset |
| **Auth** | Bearer token |
| **Permissions** | `disposal:request` — SA, ST |

**Request body:**

```json
{
  "assetId": "uuid",
  "reason": "Device is beyond economical repair — motherboard failure, repair cost exceeds 80% of replacement value",
  "method": "recycled",
  "evidenceNotes": "See attached assessment report and repair vendor quotation"
}
```

| Field | Type | Validation |
|---|---|---|
| `assetId` | string | required, uuid, must exist, must not be in `allocated`/`in_use` status |
| `reason` | string | required, min:10, max:2000 |
| `method` | string | optional, enum:recycled,donated,destroyed,sold,returned_to_vendor |
| `evidenceNotes` | string | optional |

**Response `201 Created`:** Disposal record with `status: pending`.

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `404` | `ASSET_NOT_FOUND` | Asset not found |
| `422` | `ASSET_CURRENTLY_ASSIGNED` | Cannot dispose an asset that is currently assigned to someone |
| `422` | `ASSET_ALREADY_DISPOSED` | Asset is already disposed |

---

### 11.3 Get Disposal

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/disposals/:id` |
| **Purpose** | Get full disposal record |
| **Auth** | Bearer token |
| **Permissions** | `disposal:read` — SA, ST |

---

### 11.4 Approve Disposal

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/disposals/:id/approve` |
| **Purpose** | Approve or reject a pending disposal request |
| **Auth** | Bearer token |
| **Permissions** | `disposal:approve` — SA |

**Request body:**

```json
{
  "decision": "approved",
  "signature": {
    "fullName": "Admin User",
    "consent": true
  },
  "reason": "Approved — supported by IT assessment and vendor quotation"
}
```

| Field | Type | Validation |
|---|---|---|
| `decision` | string | required, enum:approved,rejected |
| `signature` | object | required |
| `signature.fullName` | string | required, max:200 |
| `signature.consent` | boolean | required, must be true |
| `reason` | string | optional (required if decision is `rejected`) |

On approval: asset status changes to `disposed`. On rejection: disposal status changes to `rejected`, asset status unchanged.

**Response `200 OK`:** Updated disposal record with `approvedBy`, `approvedAt`.

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `404` | `DISPOSAL_NOT_FOUND` | Disposal not found |
| `422` | `NOT_PENDING` | Disposal is not in `pending` status |
| `422` | `REJECTION_REASON_REQUIRED` | Decision is `rejected` but no reason provided |

---

### 11.5 Upload Disposal Evidence

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/disposals/:id/files` |
| **Purpose** | Upload evidence photos/documents for disposal |
| **Auth** | Bearer token |
| **Permissions** | `disposal:request` — SA, ST |

Same contract as §8.5 (file upload).

---

## 12. Vendors API

### 12.1 List Vendors

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/vendors` |
| **Purpose** | List vendors |
| **Auth** | Bearer token |
| **Permissions** | `vendor:read` — SA, ST, IT |

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `isActive` | boolean | Filter by active status |
| `search` | string | Search in name, email |

**Response `200 OK`:** Paginated list of vendor objects.

---

### 12.2 Create Vendor

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/vendors` |
| **Purpose** | Register a new vendor |
| **Auth** | Bearer token |
| **Permissions** | `vendor:create` — SA, ST |

**Request body:**

```json
{
  "name": "Lenovo Nigeria",
  "contactEmail": "sales@lenovo.ng",
  "contactPhone": "+234-1-234-5678",
  "address": "123 Tech Road, Victoria Island, Lagos",
  "taxId": "NG-TAX-001234"
}
```

| Field | Type | Validation |
|---|---|---|
| `name` | string | required, max:255 |
| `contactEmail` | string | optional, email, max:255 |
| `contactPhone` | string | optional, max:50 |
| `address` | string | optional, max:500 |
| `taxId` | string | optional, max:50 |

**Response `201 Created`:** Vendor object.

---

### 12.3 Get Vendor

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/vendors/:id` |
| **Purpose** | Get vendor details |
| **Auth** | Bearer token |
| **Permissions** | `vendor:read` — SA, ST, IT |

---

### 12.4 Update Vendor

| | |
|---|---|
| **Method** | `PATCH` |
| **URL** | `/vendors/:id` |
| **Purpose** | Update vendor information |
| **Auth** | Bearer token |
| **Permissions** | `vendor:update` — SA, ST |

**Request body:** Same fields as create, all optional.

**Response `200 OK`:** Updated vendor object.

---

## 13. Master Data API

All master-data endpoints follow the same pattern. Documented once, applies
to: `departments`, `offices`, `device-types`, `brands`.

### 13.1 List

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/master-data/:resource` |
| **Purpose** | List reference data |
| **Auth** | Bearer token |
| **Permissions** | Any authenticated user (read-only lookup data) |

Where `:resource` is `departments`, `offices`, `device-types`, or `brands`.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `isActive` | boolean | Filter by active status |
| `search` | string | Search in name |

**Response `200 OK`:**

```json
{
  "data": [
    { "id": "uuid", "name": "Engineering", "isActive": true, "createdAt": "2025-01-01T00:00:00Z" }
  ],
  "meta": { "total": 10, "page": 1, "limit": 100, "totalPages": 1 }
}
```

For `departments`, items also include `parentDepartmentId`. For `offices`, items also include `address` and `city`.

---

### 13.2 Create

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/master-data/:resource` |
| **Purpose** | Create a reference data entry |
| **Auth** | Bearer token |
| **Permissions** | `master_data:manage` — SA |

**Request body:**

```json
{
  "name": "Engineering",
  "parentDepartmentId": "uuid"
}
```

| Field | Type | Validation |
|---|---|---|
| `name` | string | required, max:100, unique within the resource type |

Additional fields per resource type:

| Resource | Additional Fields |
|---|---|
| `departments` | `parentDepartmentId` (optional, uuid, must exist) |
| `offices` | `address` (optional, max:500), `city` (optional, max:100) |
| `device-types` | none |
| `brands` | none |

**Response `201 Created`:** Created item.

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `409` | `DUPLICATE_NAME` | Name already exists for this resource type |

---

### 13.3 Update

| | |
|---|---|
| **Method** | `PATCH` |
| **URL** | `/master-data/:resource/:id` |
| **Purpose** | Update a reference data entry |
| **Auth** | Bearer token |
| **Permissions** | `master_data:manage` — SA |

**Request body (all optional):**

```json
{
  "name": "Software Engineering",
  "isActive": false
}
```

**Response `200 OK`:** Updated item.

---

## 14. Dashboard API

### 14.1 Summary Counts

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/dashboard/summary` |
| **Purpose** | Get asset status counts for the dashboard summary tiles |
| **Auth** | Bearer token |
| **Permissions** | Any authenticated user (counts scoped by role) |

**Response `200 OK`:**

```json
{
  "data": {
    "total": 350,
    "available": 120,
    "allocated": 180,
    "underRepair": 15,
    "returned": 10,
    "disposed": 20,
    "lost": 2,
    "stolen": 1,
    "unaccounted": 2,
    "reserved": 0
  }
}
```

For EM role: only shows counts of their own assigned assets. For ST/IT/PC: shows counts for their scope.

---

### 14.2 Charts Data

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/dashboard/charts/:type` |
| **Purpose** | Get data for a specific dashboard chart |
| **Auth** | Bearer token |
| **Permissions** | Any authenticated user (data scoped by role) |

**URL parameter:**

| `:type` value | Chart |
|---|---|
| `by-department` | Assets grouped by department |
| `by-status` | Assets grouped by status |
| `by-brand` | Assets grouped by brand |
| `by-type` | Assets grouped by device type |
| `monthly-allocations` | Allocations per month (last 12 months) |
| `monthly-returns` | Returns per month (last 12 months) |

**Response `200 OK`:**

For categorical charts (by-department, by-status, by-brand, by-type):

```json
{
  "data": {
    "labels": ["Engineering", "Finance", "Marketing", "Operations"],
    "values": [85, 42, 38, 65]
  }
}
```

For time-series charts (monthly-allocations, monthly-returns):

```json
{
  "data": {
    "labels": ["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"],
    "values": [12, 8, 15, 10, 5, 18, 14, 9, 11, 7, 13, 6]
  }
}
```

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `400` | `INVALID_CHART_TYPE` | Unrecognized `:type` parameter |

---

### 14.3 Activity Feed

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/dashboard/activity` |
| **Purpose** | Recent system activity for the dashboard feed |
| **Auth** | Bearer token |
| **Permissions** | Any authenticated user (scoped by role) |

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | `10` | Max items (max 50) |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "action": "ALLOCATION_COMPLETED",
      "description": "AST-0042 allocated to Jane Smith",
      "user": { "id": "uuid", "firstName": "Admin", "lastName": "User" },
      "resourceType": "allocation_request",
      "resourceId": "uuid",
      "timestamp": "2026-07-10T08:30:00Z"
    }
  ]
}
```

---

### 14.4 Pending Items

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/dashboard/pending` |
| **Purpose** | Counts and lists of items awaiting the current user's action |
| **Auth** | Bearer token |
| **Permissions** | Any authenticated user |

**Response `200 OK`:**

```json
{
  "data": {
    "pendingApprovals": {
      "count": 3,
      "items": [
        {
          "type": "allocation",
          "id": "uuid",
          "description": "New device request from Jane Smith",
          "stage": "P&C Review",
          "waitingSince": "2026-07-09T08:00:00Z"
        }
      ]
    },
    "pendingAssessments": {
      "count": 2,
      "items": [...]
    },
    "pendingReturns": {
      "count": 1,
      "items": [...]
    },
    "pendingRequests": {
      "count": 0,
      "items": []
    }
  }
}
```

Items are filtered to show only those awaiting action from the current user's role.

---

## 15. Reports API

### 15.1 Generate Report Data

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/reports/:type` |
| **Purpose** | Generate report data in JSON format |
| **Auth** | Bearer token |
| **Permissions** | `report:*` — SA, PC, ST (specific report types restricted per role) |

**URL parameter:**

| `:type` value | Report | Permitted Roles |
|---|---|---|
| `inventory` | Full asset inventory | SA, ST |
| `allocation` | Allocation history | SA, PC, ST |
| `return` | Return history | SA, PC, ST |
| `repair` | Repair history | SA, ST, IT |
| `disposal` | Disposal history | SA, ST |
| `department` | Assets by department | SA, PC |
| `employee-history` | Individual employee asset history | SA, PC |
| `compliance` | SLA compliance/breach report | SA, PC |

**Query parameters (common to all):**

| Param | Type | Description |
|---|---|---|
| `dateFrom` | iso-date | Report period start |
| `dateTo` | iso-date | Report period end |
| `departmentId` | uuid | Scope to department |
| `officeId` | uuid | Scope to office |

**Additional parameters per type:**

| Type | Param | Description |
|---|---|---|
| `employee-history` | `employeeId` (required) | Specific employee |
| `inventory` | `status` | Filter by asset status |

**Response `200 OK`:**

```json
{
  "data": {
    "reportType": "inventory",
    "generatedAt": "2026-07-10T10:00:00Z",
    "parameters": { "dateFrom": "2026-01-01", "dateTo": "2026-07-10" },
    "summary": {
      "totalAssets": 350,
      "totalValue": 52500000.00,
      "currency": "NGN"
    },
    "rows": [
      {
        "assetTag": "AST-0001",
        "serialNumber": "SN123",
        "deviceType": "Laptop",
        "brand": "Dell",
        "model": "Latitude 5540",
        "status": "in_use",
        "currentHolder": "Jane Smith",
        "department": "Engineering",
        "purchaseAmount": 450000.00,
        "purchaseDate": "2025-01-15",
        "warrantyExpiry": "2027-01-15"
      }
    ]
  },
  "meta": { "total": 350, "page": 1, "limit": 100, "totalPages": 4 }
}
```

---

### 15.2 Export Report

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/reports/:type/export` |
| **Purpose** | Export report as PDF, Excel, or CSV file |
| **Auth** | Bearer token |
| **Permissions** | `report:export` — SA, PC, ST (same per-type restrictions as §15.1) |

**Query parameters:** Same as §15.1, plus:

| Param | Type | Description |
|---|---|---|
| `format` | string | required, enum:`pdf`,`xlsx`,`csv` |

**Response `200 OK`:**

Headers:
```
Content-Type: application/pdf | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | text/csv
Content-Disposition: attachment; filename="inventory-report-2026-07-10.pdf"
```

Body: Binary file content.

---

## 16. Notifications API

### 16.1 List Notifications

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/notifications` |
| **Purpose** | List the authenticated user's notifications |
| **Auth** | Bearer token |
| **Permissions** | Any authenticated user (sees own notifications only) |

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `isRead` | boolean | Filter by read status |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "subject": "Allocation request requires your review",
      "body": "Jane Smith has submitted a new device request. Please review at your earliest convenience.",
      "isRead": false,
      "referenceType": "allocation_request",
      "referenceId": "uuid",
      "createdAt": "2026-07-10T08:00:00Z"
    }
  ],
  "meta": { "total": 15, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 16.2 Mark Notification as Read

| | |
|---|---|
| **Method** | `PATCH` |
| **URL** | `/notifications/:id/read` |
| **Purpose** | Mark a single notification as read |
| **Auth** | Bearer token |
| **Permissions** | Any authenticated user (own notifications only) |

**Request body:** None

**Response `200 OK`:**

```json
{
  "data": { "id": "uuid", "isRead": true, "readAt": "2026-07-10T09:00:00Z" }
}
```

---

### 16.3 Mark All as Read

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/notifications/read-all` |
| **Purpose** | Mark all of the user's unread notifications as read |
| **Auth** | Bearer token |
| **Permissions** | Any authenticated user |

**Response `200 OK`:**

```json
{
  "data": { "markedCount": 8 }
}
```

---

### 16.4 Get Notification Preferences

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/notifications/preferences` |
| **Purpose** | Get user's notification delivery preferences |
| **Auth** | Bearer token |
| **Permissions** | Any authenticated user |

**Response `200 OK`:**

```json
{
  "data": [
    { "eventCategory": "allocation", "deliveryMethod": "immediate" },
    { "eventCategory": "return", "deliveryMethod": "immediate" },
    { "eventCategory": "assessment", "deliveryMethod": "digest" },
    { "eventCategory": "compliance", "deliveryMethod": "immediate" },
    { "eventCategory": "system", "deliveryMethod": "in_app_only" }
  ]
}
```

---

### 16.5 Update Notification Preferences

| | |
|---|---|
| **Method** | `PATCH` |
| **URL** | `/notifications/preferences` |
| **Purpose** | Update delivery preferences |
| **Auth** | Bearer token |
| **Permissions** | Any authenticated user |

**Request body:**

```json
{
  "preferences": [
    { "eventCategory": "assessment", "deliveryMethod": "immediate" },
    { "eventCategory": "system", "deliveryMethod": "digest" }
  ]
}
```

| Field | Type | Validation |
|---|---|---|
| `preferences` | array | required, min 1 |
| `preferences[].eventCategory` | string | required, enum:allocation,return,assessment,compliance,system |
| `preferences[].deliveryMethod` | string | required, enum:immediate,digest,in_app_only |

**Response `200 OK`:** Updated preferences array.

---

## 17. Search API

### 17.1 Global Search

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/search` |
| **Purpose** | Search across assets, employees, and workflows |
| **Auth** | Bearer token |
| **Permissions** | Any authenticated user (results scoped by role) |

**Query parameters:**

| Param | Type | Validation | Description |
|---|---|---|---|
| `q` | string | required, min:2, max:200 | Search query |
| `type` | string | optional, enum:asset,employee,all | Limit search to a specific entity type (default: `all`) |
| `limit` | integer | optional, default 10, max 50 | Max results per type |

**Response `200 OK`:**

```json
{
  "data": {
    "assets": [
      {
        "id": "uuid",
        "assetTag": "AST-0042",
        "serialNumber": "PF3KL789",
        "model": "ThinkPad T14 Gen 3",
        "status": "in_use",
        "matchedOn": "assetTag"
      }
    ],
    "employees": [
      {
        "id": "uuid",
        "employeeCode": "EMP-0042",
        "firstName": "Jane",
        "lastName": "Smith",
        "department": "Engineering",
        "matchedOn": "lastName"
      }
    ]
  }
}
```

For EM role: only own profile and assigned assets are returned.

---

## 18. Audit Logs API

### 18.1 List Audit Logs

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/audit-logs` |
| **Purpose** | Query the immutable audit log |
| **Auth** | Bearer token |
| **Permissions** | `audit:read` — SA only |

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `userId` | uuid | Filter by acting user |
| `action` | string | Filter by action type |
| `resourceType` | string | Filter by resource type |
| `resourceId` | string | Filter by specific resource |
| `dateFrom` | iso-datetime | Timestamp range start |
| `dateTo` | iso-datetime | Timestamp range end |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": 1042,
      "user": { "id": "uuid", "email": "admin@company.com", "firstName": "Admin", "lastName": "User" },
      "action": "WORKFLOW_TRANSITION",
      "resourceType": "workflow_instance",
      "resourceId": "uuid",
      "oldValue": { "currentStageCode": "pc_review", "status": "active" },
      "newValue": { "currentStageCode": "stores_select", "status": "active" },
      "ipAddress": "192.168.1.100",
      "timestamp": "2026-07-10T08:30:00Z"
    }
  ],
  "meta": { "total": 5000, "page": 1, "limit": 50, "totalPages": 100 }
}
```

This endpoint is **read-only**. There is no POST, PATCH, or DELETE endpoint for audit logs. Entries are written exclusively by the system (interceptors and event subscribers).

---

## 19. Compliance API

### 19.1 List Breaches

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/compliance/breaches` |
| **Purpose** | List SLA breaches |
| **Auth** | Bearer token |
| **Permissions** | `compliance:read` — SA, PC |

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `isResolved` | boolean | Filter resolved vs active breaches |
| `isEscalated` | boolean | Filter escalated breaches |
| `workflowType` | string | Filter by workflow type: `allocation`, `return`, `repair`, `disposal` |
| `dateFrom` | iso-datetime | Breach detection date range start |
| `dateTo` | iso-datetime | Breach detection date range end |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "workflowInstance": {
        "id": "uuid",
        "definitionName": "Asset Allocation",
        "referenceType": "allocation_request",
        "referenceId": "uuid"
      },
      "stage": { "id": "uuid", "name": "P&C Review", "code": "pc_review" },
      "slaHours": 24,
      "actualHours": 72,
      "isEscalated": true,
      "escalatedTo": { "id": "uuid", "firstName": "HR", "lastName": "Director" },
      "breachedAt": "2026-07-08T08:00:00Z",
      "resolvedAt": null
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 19.2 Get Escalations

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/compliance/escalations` |
| **Purpose** | List active escalations requiring management attention |
| **Auth** | Bearer token |
| **Permissions** | `compliance:read` — SA, PC |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "breachId": "uuid",
      "workflowType": "allocation",
      "stageName": "P&C Review",
      "overdueBy": 48,
      "unit": "hours",
      "assignedTo": { "role": "P&C" },
      "escalatedTo": { "id": "uuid", "firstName": "HR", "lastName": "Director", "email": "hr.director@company.com" },
      "escalatedAt": "2026-07-08T08:00:00Z"
    }
  ]
}
```

---

## 20. Workflow Definitions API

For Super Admin configuration of the workflow engine.

### 20.1 List Workflow Definitions

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/workflow-definitions` |
| **Purpose** | List all workflow definitions |
| **Auth** | Bearer token |
| **Permissions** | `workflow:configure` — SA |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Asset Allocation",
      "code": "allocation",
      "description": "Multi-stage workflow for allocating assets to employees",
      "version": 1,
      "isActive": true,
      "stageCount": 7,
      "activeInstances": 12,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### 20.2 Get Workflow Definition with Stages

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/workflow-definitions/:id` |
| **Purpose** | Get full workflow definition with all stages, roles, and rules |
| **Auth** | Bearer token |
| **Permissions** | `workflow:configure` — SA; read-only access for ST, IT, PC (to see where they fit in the workflow) |

**Response `200 OK`:**

```json
{
  "data": {
    "id": "uuid",
    "name": "Asset Allocation",
    "code": "allocation",
    "description": "Multi-stage workflow for allocating assets to employees",
    "version": 1,
    "isActive": true,
    "stages": [
      {
        "id": "uuid",
        "name": "P&C Review",
        "code": "pc_review",
        "stageOrder": 1,
        "stageType": "sequential",
        "requiredRole": { "id": "uuid", "name": "P&C" },
        "requiresSignature": false,
        "slaHours": 24,
        "validationRules": [],
        "onCompleteActions": [
          { "type": "notify", "target": "role", "role": "Stores Officer" }
        ]
      },
      {
        "id": "uuid",
        "name": "Stores Select Asset",
        "code": "stores_select",
        "stageOrder": 2,
        "stageType": "sequential",
        "requiredRole": { "id": "uuid", "name": "Stores Officer" },
        "requiresSignature": false,
        "slaHours": 48,
        "validationRules": [
          { "type": "field_required", "field": "selectedAssetId" },
          { "type": "asset_status_equals", "value": "available" }
        ],
        "onCompleteActions": [
          { "type": "reserve_asset" },
          { "type": "notify", "target": "role", "role": "IT Representative" }
        ]
      }
    ],
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-01T00:00:00Z"
  }
}
```

---

### 20.3 Update Workflow Definition

| | |
|---|---|
| **Method** | `PATCH` |
| **URL** | `/workflow-definitions/:id` |
| **Purpose** | Update workflow metadata or stage configuration |
| **Auth** | Bearer token |
| **Permissions** | `workflow:configure` — SA |

**Request body (all optional):**

```json
{
  "description": "Updated description",
  "isActive": false,
  "stages": [
    {
      "id": "uuid",
      "slaHours": 48,
      "requiresSignature": true
    }
  ]
}
```

| Field | Type | Validation |
|---|---|---|
| `description` | string | optional |
| `isActive` | boolean | optional |
| `stages` | array | optional, partial updates to existing stages |
| `stages[].id` | string | required within each stage object, must be an existing stage ID |
| `stages[].slaHours` | integer | optional, positive |
| `stages[].requiresSignature` | boolean | optional |
| `stages[].requiredRoleId` | string | optional, uuid, must exist |

Cannot add/remove/reorder stages — that requires creating a new version
of the definition (future endpoint). This endpoint only updates
configurable properties of existing stages.

**Response `200 OK`:** Updated definition with stages.

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `404` | `DEFINITION_NOT_FOUND` | Definition not found |
| `422` | `HAS_ACTIVE_INSTANCES` | Cannot deactivate a definition with active workflow instances |
| `422` | `STAGE_NOT_FOUND` | Stage ID in the request does not belong to this definition |

---

## File Download Endpoint

### GET `/files/:id`

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/files/:id` |
| **Purpose** | Download an uploaded file by its file reference ID |
| **Auth** | Bearer token |
| **Permissions** | Read access to the parent resource (e.g., `return:read` for return photos) |

**Response `200 OK`:**

Headers:
```
Content-Type: <file's mime type>
Content-Disposition: inline; filename="<original filename>"
```

Body: Binary file content (proxied from S3).

**Error responses:**

| Code | Error Code | When |
|---|---|---|
| `404` | `FILE_NOT_FOUND` | File reference not found |
| `403` | `FORBIDDEN` | User lacks read permission on the parent resource |

---

## Rate Limiting

All endpoints are rate-limited per authenticated user:

| Tier | Endpoints | Limit |
|---|---|---|
| Auth | `/auth/login`, `/auth/refresh` | 10 requests/minute per IP |
| Write | All POST, PATCH, PUT, DELETE | 60 requests/minute per user |
| Read | All GET | 300 requests/minute per user |
| Export | `/reports/*/export` | 5 requests/minute per user |

Rate limit headers included in every response:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 298
X-RateLimit-Reset: 1720612800
```

When exceeded: `429 Too Many Requests` with `Retry-After` header.

---

## API Versioning Strategy

The API is versioned via URL path (`/api/v1/`). When breaking changes are
necessary:

1. A new version (`/api/v2/`) is deployed alongside v1.
2. v1 continues to work for a deprecation period (minimum 6 months).
3. v1 responses include a `Deprecation` header with the sunset date.
4. Clients are notified via the notification system.

Non-breaking changes (new optional fields, new endpoints) are added to the
current version without incrementing.
